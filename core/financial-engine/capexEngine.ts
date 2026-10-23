// Enterprise Fintech Engine: CapEx Capitalization & Depreciation Registry
// Supports Straight-Line (SLN) and Written Down Value (WDV) non-cash depreciation schedules.

export type DepreciationMethod = 'STRAIGHT_LINE' | 'WRITTEN_DOWN_VALUE';

export interface FixedAsset {
  id: string;
  name: string;
  account_id: string; // Balance sheet asset account (e.g., acc_fixed_asset_laptop)
  purchase_transaction_id: string;
  purchase_date: string;
  initial_cost_micro: bigint;
  salvage_value_micro: bigint;
  useful_life_months: number;
  depreciation_method: DepreciationMethod;
  depreciation_rate_percent?: number; // Annual rate for WDV (e.g. 20.00%)
  accumulated_depreciation_micro: bigint;
  current_book_value_micro: bigint;
  warranty_expiry_date?: string | null;
  is_disposed: boolean;
  months_depreciated: number;
}

export interface DepreciationScheduleEntry {
  monthIndex: number; // 1 to useful_life_months
  scheduleDate: string; // ISO date
  depreciation_amount_micro: bigint;
  remaining_book_value_micro: bigint;
}

export class CapExEngine {
  public static readonly CAPEX_THRESHOLD_MICRO = 200000000n; // ₹20,000.0000 (scaled by 10,000)
  public static readonly DEPRECIATION_EXPENSE_ACCOUNT_ID = 'acc_expense_depreciation';
  public static readonly ACCUMULATED_DEP_ACCOUNT_ID = 'acc_asset_accumulated_depreciation';

  private assets = new Map<string, FixedAsset>();

  public isCapExEligible(amountMicro: bigint, thresholdMicro = CapExEngine.CAPEX_THRESHOLD_MICRO): boolean {
    return amountMicro >= thresholdMicro;
  }

  public registerAsset(params: {
    id?: string;
    name: string;
    account_id: string;
    purchase_transaction_id: string;
    purchase_date: string;
    initial_cost_micro: bigint;
    salvage_value_micro?: bigint;
    useful_life_months: number;
    depreciation_method?: DepreciationMethod;
    depreciation_rate_percent?: number;
    warranty_expiry_date?: string | null;
  }): FixedAsset {
    const assetId = params.id || `fa_${crypto.randomUUID()}`;
    const salvage = params.salvage_value_micro ?? 0n;
    const method = params.depreciation_method || 'STRAIGHT_LINE';

    const asset: FixedAsset = {
      id: assetId,
      name: params.name,
      account_id: params.account_id,
      purchase_transaction_id: params.purchase_transaction_id,
      purchase_date: params.purchase_date,
      initial_cost_micro: params.initial_cost_micro,
      salvage_value_micro: salvage,
      useful_life_months: params.useful_life_months,
      depreciation_method: method,
      depreciation_rate_percent: params.depreciation_rate_percent,
      accumulated_depreciation_micro: 0n,
      current_book_value_micro: params.initial_cost_micro,
      warranty_expiry_date: params.warranty_expiry_date || null,
      is_disposed: false,
      months_depreciated: 0,
    };

    this.assets.set(assetId, asset);
    return asset;
  }

  public getAsset(id: string): FixedAsset | undefined {
    const a = this.assets.get(id);
    return a ? { ...a } : undefined;
  }

  public getAllAssets(): FixedAsset[] {
    return Array.from(this.assets.values()).map((a) => ({ ...a }));
  }

  /**
   * Generates the complete monthly depreciation schedule for a fixed asset.
   */
  public generateFullSchedule(assetId: string): DepreciationScheduleEntry[] {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset ID '${assetId}' not found.`);

    const schedule: DepreciationScheduleEntry[] = [];
    const depreciableBase = asset.initial_cost_micro - asset.salvage_value_micro;
    if (depreciableBase <= 0n) return schedule;

    const baseDate = new Date(asset.purchase_date);
    let bookValue = asset.initial_cost_micro;

    if (asset.depreciation_method === 'STRAIGHT_LINE') {
      const monthlyMicro = depreciableBase / BigInt(asset.useful_life_months);
      let remainder = depreciableBase % BigInt(asset.useful_life_months);

      for (let m = 1; m <= asset.useful_life_months; m++) {
        // Distribute remainder on final month to maintain exact zero drift
        const depThisMonth = m === asset.useful_life_months ? monthlyMicro + remainder : monthlyMicro;
        bookValue -= depThisMonth;

        const schedDate = new Date(baseDate);
        schedDate.setMonth(schedDate.getMonth() + m);

        schedule.push({
          monthIndex: m,
          scheduleDate: schedDate.toISOString().split('T')[0],
          depreciation_amount_micro: depThisMonth,
          remaining_book_value_micro: bookValue,
        });
      }
    } else {
      // Written Down Value (WDV)
      // Monthly rate approximated from annual rate: 1 - (1 - R)^(1/12)
      const annualRate = (asset.depreciation_rate_percent || 20.0) / 100;
      const monthlyRateBasisPoints = BigInt(Math.round((1 - Math.pow(1 - annualRate, 1 / 12)) * 10000));

      for (let m = 1; m <= asset.useful_life_months; m++) {
        if (bookValue <= asset.salvage_value_micro) break;
        let depThisMonth = (bookValue * monthlyRateBasisPoints) / 10000n;
        if (bookValue - depThisMonth < asset.salvage_value_micro) {
          depThisMonth = bookValue - asset.salvage_value_micro;
        }
        bookValue -= depThisMonth;

        const schedDate = new Date(baseDate);
        schedDate.setMonth(schedDate.getMonth() + m);

        schedule.push({
          monthIndex: m,
          scheduleDate: schedDate.toISOString().split('T')[0],
          depreciation_amount_micro: depThisMonth,
          remaining_book_value_micro: bookValue,
        });
      }
    }

    return schedule;
  }

  /**
   * Applies one month of depreciation to the asset and returns the balanced posting payload.
   */
  public stepMonthlyDepreciation(assetId: string): {
    asset: FixedAsset;
    depreciationAmountMicro: bigint;
    postings: {
      debitAccountId: string;
      creditAccountId: string;
      amountMicro: bigint;
    };
  } {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset ID '${assetId}' not found.`);
    if (asset.is_disposed) throw new Error(`Asset '${asset.name}' is disposed.`);
    if (asset.months_depreciated >= asset.useful_life_months) {
      throw new Error(`Asset '${asset.name}' is already fully depreciated.`);
    }

    const schedule = this.generateFullSchedule(assetId);
    const nextMonthEntry = schedule[asset.months_depreciated];
    if (!nextMonthEntry) {
      throw new Error(`No further schedule entries available for asset '${asset.name}'.`);
    }

    const depAmount = nextMonthEntry.depreciation_amount_micro;
    asset.accumulated_depreciation_micro += depAmount;
    asset.current_book_value_micro -= depAmount;
    asset.months_depreciated += 1;

    return {
      asset: { ...asset },
      depreciationAmountMicro: depAmount,
      postings: {
        debitAccountId: CapExEngine.DEPRECIATION_EXPENSE_ACCOUNT_ID,
        creditAccountId: CapExEngine.ACCUMULATED_DEP_ACCOUNT_ID,
        amountMicro: depAmount,
      },
    };
  }
}
