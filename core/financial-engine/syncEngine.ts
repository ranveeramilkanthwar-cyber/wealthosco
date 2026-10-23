// Enterprise Fintech Engine: Local-First Offline CRDT Sync Engine
// Zero-latency reactive local store with Last-Write-Wins (LWW) conflict resolution and offline queue.

import { Transaction, LedgerPosting, Account } from './types';

export interface SyncMessage<T = any> {
  id: string;
  entityType: 'TRANSACTION' | 'ACCOUNT' | 'POSTING';
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'VOID';
  payload: T;
  clientTimestamp: number; // Lamport / monotonic timestamp
  clientId: string;
  version: number;
}

export class OfflineSyncEngine {
  private offlineQueue: SyncMessage[] = [];
  private isOnline = true;
  private clientId: string;
  private remoteStore = new Map<string, { payload: any; timestamp: number; version: number }>();
  private listeners: Array<(event: { type: string; payload: any }) => void> = [];

  constructor(clientId = 'client_local_device') {
    this.clientId = clientId;
  }

  private lastFlushResult = { appliedCount: 0, conflictCount: 0 };

  public setOnlineStatus(online: boolean): { appliedCount: number; conflictCount: number } {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    if (wasOffline && online) {
      this.lastFlushResult = this.flushOfflineQueue();
    }
    return this.lastFlushResult;
  }

  public getLastFlushResult(): { appliedCount: number; conflictCount: number } {
    return this.lastFlushResult;
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public getQueueLength(): number {
    return this.offlineQueue.length;
  }

  public subscribe(listener: (event: { type: string; payload: any }) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(type: string, payload: any): void {
    for (const l of this.listeners) {
      l({ type, payload });
    }
  }

  /**
   * Enqueue a local change. If online, syncs immediately; if offline, buffers in CRDT queue.
   */
  public stageChange<T>(
    entityType: 'TRANSACTION' | 'ACCOUNT' | 'POSTING',
    entityId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'VOID',
    payload: T,
    timestamp = Date.now()
  ): SyncMessage<T> {
    const message: SyncMessage<T> = {
      id: `sync_${crypto.randomUUID()}`,
      entityType,
      entityId,
      operation,
      payload,
      clientTimestamp: timestamp,
      clientId: this.clientId,
      version: 1,
    };

    if (!this.isOnline) {
      this.offlineQueue.push(message);
    } else {
      this.applyToRemote(message);
    }

    this.notify('LOCAL_CHANGE', message);
    return message;
  }

  /**
   * Applies CRDT Last-Write-Wins (LWW) deterministic resolution against remote store
   */
  private applyToRemote(msg: SyncMessage): boolean {
    const existing = this.remoteStore.get(msg.entityId);
    if (!existing || msg.clientTimestamp >= existing.timestamp) {
      this.remoteStore.set(msg.entityId, {
        payload: msg.payload,
        timestamp: msg.clientTimestamp,
        version: existing ? existing.version + 1 : 1,
      });
      return true;
    }
    // Existing is newer: dropped to preserve causal order
    return false;
  }

  /**
   * Flush and reconcile offline messages when network reconnects
   */
  public flushOfflineQueue(): { appliedCount: number; conflictCount: number } {
    let appliedCount = 0;
    let conflictCount = 0;

    // Process in causal chronological order
    this.offlineQueue.sort((a, b) => a.clientTimestamp - b.clientTimestamp);

    while (this.offlineQueue.length > 0) {
      const msg = this.offlineQueue.shift()!;
      const applied = this.applyToRemote(msg);
      if (applied) {
        appliedCount++;
      } else {
        conflictCount++;
      }
    }

    this.notify('SYNC_COMPLETE', { appliedCount, conflictCount });
    return { appliedCount, conflictCount };
  }

  public getRemoteEntity(entityId: string): any {
    return this.remoteStore.get(entityId)?.payload;
  }

  public getAllRemoteEntities(): Map<string, any> {
    const res = new Map<string, any>();
    for (const [k, v] of this.remoteStore.entries()) {
      res.set(k, v.payload);
    }
    return res;
  }
}
