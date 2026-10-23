// Enterprise Fintech Engine: Multi-Currency & Forex Precision Engine
// Base Currency: INR (or USD). Spot FX Rates with 6 decimal places (DECIMAL(14,6)).
// Realized/unrealized forex fluctuations balanced against Equity:Currency_Translation_Reserve.

import { SCALE } from './microUnits';

export interface ForexRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number; // e.g. 1 USD = 83.50 INR -> rate is 83.500000
  effectiveDate: string;
}

export class ForexEngine {
  private rates = new Map<string, number>();
  public static readonly FOREX_RESERVE_ACCOUNT_ID = 'acc_equity_forex_reserve';

  constructor(initialRates?: ForexRate[]) {
    // Default baseline rates against INR
    this.setRate('USD', 'INR', 83.5);
    this.setRate('EUR', 'INR', 90.25);
    this.setRate('GBP', 'INR', 108.4);
    this.setRate('AED', 'INR', 22.74);
    this.setRate('JPY', 'INR', 0.55);

    if (initialRates) {
      for (const r of initialRates) {
        this.setRate(r.targetCurrency, r.baseCurrency, r.rate);
      }
    }
  }

  public setRate(fromCurrency: string, toCurrency: string, rate: number): void {
    const key = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
    this.rates.set(key, rate);

    if (rate > 0) {
      const inverseKey = `${toCurrency.toUpperCase()}_${fromCurrency.toUpperCase()}`;
      this.rates.set(inverseKey, 1 / rate);
    }
  }

  public getRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1.0;
    const key = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
    const rate = this.rates.get(key);
    if (!rate) {
      throw new Error(`Forex exchange rate not found for currency pair: ${fromCurrency}/${toCurrency}`);
    }
    return rate;
  }

  /**
   * Converts foreign currency micro-units to base currency micro-units without floating point drift.
   * FX Rate scaled by 1,000,000 (6 decimal places)
   */
  public convertToBaseMicro(
    foreignAmountMicro: bigint,
    fromCurrency: string,
    baseCurrency = 'INR',
    customRate?: number
  ): { baseAmountMicro: bigint; effectiveRate: number } {
    if (fromCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
      return { baseAmountMicro: foreignAmountMicro, effectiveRate: 1.0 };
    }

    const rate = customRate !== undefined ? customRate : this.getRate(fromCurrency, baseCurrency);
    // Scale rate to 6 decimal places integer
    const rateScaled = BigInt(Math.round(rate * 1_000_000));
    const baseAmountMicro = (foreignAmountMicro * rateScaled) / 1_000_000n;

    return { baseAmountMicro, effectiveRate: rate };
  }

  /**
   * Calculates Forex gain or loss when settling a foreign receivable or payable at a new spot rate.
   * If spot rate increases for an asset, gain is positive (Credit Forex Reserve).
   */
  public calculateForexAdjustment(
    foreignAmountMicro: bigint,
    historicalRate: number,
    settlementRate: number
  ): {
    gainOrLossMicro: bigint;
    isGain: boolean;
  } {
    const histScaled = BigInt(Math.round(historicalRate * 1_000_000));
    const settleScaled = BigInt(Math.round(settlementRate * 1_000_000));

    const histBaseMicro = (foreignAmountMicro * histScaled) / 1_000_000n;
    const settleBaseMicro = (foreignAmountMicro * settleScaled) / 1_000_000n;

    const diff = settleBaseMicro - histBaseMicro;
    return {
      gainOrLossMicro: diff < 0n ? -diff : diff,
      isGain: diff >= 0n,
    };
  }
}
