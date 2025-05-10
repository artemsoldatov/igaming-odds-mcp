// Pure betting-odds math. No I/O, fully deterministic — the whole point of the
// server is that these are exact and testable. Odds are handled in four common
// formats; money uses plain numbers rounded to cents at the edges.

export type OddsFormat = 'decimal' | 'fractional' | 'american' | 'probability';

export interface AllFormats {
  decimal: number;
  fractional: string;
  american: number;
  probability: number;
}

const round = (n: number, dp = 4): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// nearest simple fraction to x via continued fractions (handles 0.3333 -> 1/3).
// Stops before the denominator exceeds the cap, so it returns the best simple
// fraction rather than overshooting to an ugly exact one.
export function toFraction(x: number, maxDenominator = 1000): [number, number] {
  if (x === 0) return [0, 1];
  let h0 = 0;
  let h1 = 1;
  let k0 = 1;
  let k1 = 0;
  let b = x;
  for (;;) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > maxDenominator) break;
    h0 = h1;
    h1 = h2;
    k0 = k1;
    k1 = k2;
    if (Math.abs(x - h1 / k1) < 1e-9) break;
    const frac = b - a;
    if (frac === 0) break;
    b = 1 / frac;
  }
  return [h1, k1 || 1];
}

export function decimalToProbability(decimal: number): number {
  return 1 / decimal;
}

export function decimalToAmerican(decimal: number): number {
  return decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
}

export function decimalToFractional(decimal: number): string {
  const [num, den] = toFraction(decimal - 1);
  const g = gcd(num, den) || 1;
  return `${num / g}/${den / g}`;
}

export function toDecimal(value: number | string, format: OddsFormat): number {
  switch (format) {
    case 'decimal': {
      const d = Number(value);
      if (!(d > 1)) throw new Error('Decimal odds must be greater than 1');
      return d;
    }
    case 'probability': {
      const p = Number(value);
      if (!(p > 0 && p < 1)) throw new Error('Probability must be between 0 and 1');
      return 1 / p;
    }
    case 'american': {
      const a = Number(value);
      if (a === 0) throw new Error('American odds cannot be 0');
      return a > 0 ? 1 + a / 100 : 1 + 100 / -a;
    }
    case 'fractional': {
      const [n, d] = String(value)
        .split('/')
        .map((s) => Number(s.trim()));
      if (!n || !d || n <= 0 || d <= 0) throw new Error('Fractional odds must look like "3/2"');
      return n / d + 1;
    }
  }
}

export function normalize(value: number | string, format: OddsFormat): AllFormats {
  const decimal = toDecimal(value, format);
  return {
    decimal: round(decimal),
    fractional: decimalToFractional(decimal),
    american: decimalToAmerican(decimal),
    probability: round(decimalToProbability(decimal)),
  };
}

export interface MarginResult {
  overround: number;
  marginPct: number;
  fairDecimalOdds: number[];
  fairProbabilities: number[];
}

// bookmaker margin (overround) and the fair odds with the margin removed
export function bookmakerMargin(decimalOdds: number[]): MarginResult {
  if (decimalOdds.length < 2) throw new Error('Need at least two outcomes');
  const implied = decimalOdds.map(decimalToProbability);
  const overround = implied.reduce((a, p) => a + p, 0);
  const fairProbabilities = implied.map((p) => p / overround);
  return {
    overround: round(overround, 6),
    marginPct: round((overround - 1) * 100, 4),
    fairDecimalOdds: fairProbabilities.map((p) => round(1 / p)),
    fairProbabilities: fairProbabilities.map((p) => round(p)),
  };
}

export function parlayDecimal(legs: number[]): { decimal: number; probability: number } {
  if (legs.length === 0) throw new Error('Need at least one leg');
  const decimal = legs.reduce((a, o) => a * o, 1);
  return { decimal: round(decimal), probability: round(1 / decimal) };
}

export type Result = 'win' | 'lose' | 'push' | 'void';

export interface Settlement {
  outcome: Result;
  returnCents: number;
  profitCents: number;
}

// integer cents in and out; rounding is floor on returns (house-favouring),
// documented and tested
function toReturn(stakeCents: number, decimal: number): number {
  return Math.floor(stakeCents * decimal);
}

export function settleSingle(stakeCents: number, decimal: number, result: Result): Settlement {
  switch (result) {
    case 'win': {
      const ret = toReturn(stakeCents, decimal);
      return { outcome: 'win', returnCents: ret, profitCents: ret - stakeCents };
    }
    case 'lose':
      return { outcome: 'lose', returnCents: 0, profitCents: -stakeCents };
    case 'push':
    case 'void':
      return { outcome: result, returnCents: stakeCents, profitCents: 0 };
  }
}
