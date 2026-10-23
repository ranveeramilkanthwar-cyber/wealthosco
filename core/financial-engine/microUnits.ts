// Enterprise Fintech Engine: Micro-Units Precision & Banker's Rounding
// Rule: Zero floating-point calculations in storage or ledger transfers.
// 1 Currency Unit = 10,000 Micro-units (4 decimal places).

export const SCALE = 10000n;
export const SCALE_DECIMALS = 4;

/**
 * Converts a standard decimal or string (e.g. 1500.50) into 64-bit BigInt micro-units (15005000n).
 */
export function toMicroUnits(amount: number | string): bigint {
  const str = typeof amount === 'number' ? amount.toFixed(4) : amount.trim();
  if (!str) return 0n;

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;

  const parts = cleanStr.split('.');
  const wholePart = BigInt(parts[0] || '0');
  let fractionPartStr = (parts[1] || '').slice(0, 4);

  // Pad fraction to 4 digits
  while (fractionPartStr.length < 4) {
    fractionPartStr += '0';
  }

  const fractionPart = BigInt(fractionPartStr);
  const total = wholePart * SCALE + fractionPart;
  return isNegative ? -total : total;
}

/**
 * Converts BigInt micro-units to standard decimal number.
 * Use strictly at UI rendering boundaries or external non-ledger systems.
 */
export function fromMicroUnits(micro: bigint): number {
  const isNegative = micro < 0n;
  const abs = isNegative ? -micro : micro;
  const whole = abs / SCALE;
  const frac = abs % SCALE;
  const num = Number(whole) + Number(frac) / Number(SCALE);
  return isNegative ? -num : num;
}

/**
 * Banker's Rounding (Round Half-to-Even)
 * Standard accounting practice to eliminate upward rounding bias.
 */
export function bankersRound(val: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const n = +(val * factor);
  const i = Math.floor(n);
  const f = n - i;
  const e = 1e-8;

  let r: number;
  if (f > 0.5 - e && f < 0.5 + e) {
    // Exactly halfway: round to nearest even integer
    r = i % 2 === 0 ? i : i + 1;
  } else {
    r = Math.round(n);
  }
  return r / factor;
}

/**
 * Format micro-units into institutional currency representation (e.g. ₹1,50,000.00 or $12,450.00).
 */
export function formatCurrency(
  micro: bigint,
  currency = 'INR',
  locale = 'en-IN',
  showSymbol = true
): string {
  const val = fromMicroUnits(micro);
  const rounded = bankersRound(val, 2);

  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(rounded);
}

/**
 * Integer-based micro-unit multiplication with pure BigInt math.
 * For example: calculating tax rate (e.g. 18% = 1800 basis points / 10000).
 */
export function multiplyMicroBasisPoints(micro: bigint, basisPoints: bigint): bigint {
  // basisPoints: 10000 = 100%, 1800 = 18%
  return (micro * basisPoints) / 10000n;
}

/**
 * Integer division maintaining micro-unit precision.
 */
export function divideMicro(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('Division by zero in micro-units calculation');
  return (numerator * SCALE) / denominator;
}
