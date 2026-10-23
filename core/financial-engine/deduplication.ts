// Enterprise Fintech Engine: Deterministic Cryptographic Deduplication Hash Generator
// SHA-256 hash(account_id + amount_micro + timestamp_minute + reference_utr)

export async function generateDeduplicationHash(params: {
  account_id: string;
  amount_micro: bigint;
  timestamp: string; // ISO string
  reference_no?: string | null;
}): Promise<string> {
  const dateObj = new Date(params.timestamp);
  // Normalize timestamp to the minute (truncate seconds & ms)
  const minuteNormalized = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}T${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}Z`;

  const normalizedRef = (params.reference_no || '').trim().toUpperCase();
  const rawPayload = `${params.account_id}|${params.amount_micro.toString()}|${minuteNormalized}|${normalizedRef}`;

  // Use Web Crypto API available in modern Node and Browsers
  const encoder = new TextEncoder();
  const data = encoder.encode(rawPayload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous fallback hash for tests or high-throughput batch imports
 */
export function generateDeduplicationHashSync(params: {
  account_id: string;
  amount_micro: bigint;
  timestamp: string;
  reference_no?: string | null;
}): string {
  const dateObj = new Date(params.timestamp);
  const minuteNormalized = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}T${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}Z`;
  const normalizedRef = (params.reference_no || '').trim().toUpperCase();
  const rawPayload = `${params.account_id}|${params.amount_micro.toString()}|${minuteNormalized}|${normalizedRef}`;

  // Simple, deterministic FNV-1a 64-bit / murmur-like hash formatted as hex
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < rawPayload.length; i++) {
    const ch = rawPayload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `hash_${hex1}${hex2}`;
}
