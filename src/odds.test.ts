import { describe, expect, it } from 'vitest';
import {
  bookmakerMargin,
  decimalToAmerican,
  decimalToFractional,
  normalize,
  parlayDecimal,
  settleAccumulator,
  settleEachWay,
  settleSingle,
  toDecimal,
} from './odds.js';

describe('conversions', () => {
  it('converts between formats around a known point', () => {
    expect(toDecimal('3/2', 'fractional')).toBeCloseTo(2.5);
    expect(toDecimal(150, 'american')).toBeCloseTo(2.5);
    expect(toDecimal(-200, 'american')).toBeCloseTo(1.5);
    expect(toDecimal(0.4, 'probability')).toBeCloseTo(2.5);
    expect(decimalToAmerican(2.5)).toBe(150);
    expect(decimalToAmerican(1.5)).toBe(-200);
    expect(decimalToFractional(2.5)).toBe('3/2');
    expect(decimalToFractional(4 / 3)).toBe('1/3');
    expect(decimalToFractional(6)).toBe('5/1');
  });

  it('normalizes to all formats at once', () => {
    const all = normalize(2.5, 'decimal');
    expect(all).toMatchObject({ decimal: 2.5, fractional: '3/2', american: 150, probability: 0.4 });
  });

  it('rejects impossible odds', () => {
    expect(() => toDecimal(0.9, 'decimal')).toThrow();
    expect(() => toDecimal(1.5, 'probability')).toThrow();
    expect(() => toDecimal(0, 'american')).toThrow();
  });
});

describe('bookmaker margin', () => {
  it('computes overround and fair odds that sum to 1', () => {
    // a two-way market priced at 1.9 / 1.9 carries a margin
    const r = bookmakerMargin([1.9, 1.9]);
    expect(r.marginPct).toBeCloseTo(5.26, 1);
    const sum = r.fairProbabilities.reduce((a, p) => a + p, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(r.fairDecimalOdds[0]).toBeCloseTo(2.0, 2);
  });

  it('reports ~0 margin for a fair market', () => {
    expect(bookmakerMargin([2, 2]).marginPct).toBeCloseTo(0, 5);
  });
});

describe('parlay', () => {
  it('multiplies legs', () => {
    const p = parlayDecimal([2, 1.5, 3]);
    expect(p.decimal).toBe(9);
    expect(p.probability).toBeCloseTo(0.1111, 3);
  });
});

describe('single settlement (integer cents, floor)', () => {
  it('pays a win as stake x odds', () => {
    expect(settleSingle(1000, 2.5, 'win')).toEqual({
      outcome: 'win',
      returnCents: 2500,
      profitCents: 1500,
    });
  });
  it('floors fractional returns in the house favour', () => {
    // 101 * 1.667 = 168.4 -> floor 168
    expect(settleSingle(101, 1.667, 'win').returnCents).toBe(168);
  });
  it('loses, pushes and voids correctly', () => {
    expect(settleSingle(1000, 2, 'lose')).toMatchObject({ returnCents: 0, profitCents: -1000 });
    expect(settleSingle(1000, 2, 'push')).toMatchObject({ returnCents: 1000, profitCents: 0 });
    expect(settleSingle(1000, 2, 'void')).toMatchObject({ returnCents: 1000, profitCents: 0 });
  });
});

describe('accumulator settlement', () => {
  it('multiplies winning legs', () => {
    const r = settleAccumulator(1000, [
      { decimal: 2, result: 'win' },
      { decimal: 1.5, result: 'win' },
    ]);
    expect(r).toMatchObject({ outcome: 'win', returnCents: 3000, profitCents: 2000 });
  });
  it('loses if any leg loses', () => {
    const r = settleAccumulator(1000, [
      { decimal: 2, result: 'win' },
      { decimal: 1.5, result: 'lose' },
    ]);
    expect(r).toMatchObject({ outcome: 'lose', returnCents: 0 });
  });
  it('drops a void leg to odds 1', () => {
    const r = settleAccumulator(1000, [
      { decimal: 2, result: 'win' },
      { decimal: 1.5, result: 'void' },
    ]);
    expect(r).toMatchObject({ outcome: 'win', returnCents: 2000 });
  });
});

describe('each-way settlement', () => {
  it('pays win and place parts on a win', () => {
    // stake 1000 each way (2000 total), odds 5.0, place 1/4 -> place decimal 2.0
    const r = settleEachWay(1000, 5, 0.25, 'win');
    // win part 5000 + place part 2000 = 7000, profit 5000
    expect(r).toMatchObject({ outcome: 'win', returnCents: 7000, profitCents: 5000 });
  });
  it('pays only the place part on a place', () => {
    const r = settleEachWay(1000, 5, 0.25, 'place');
    expect(r).toMatchObject({ outcome: 'place', returnCents: 2000, profitCents: 0 });
  });
  it('loses both parts on a loss', () => {
    expect(settleEachWay(1000, 5, 0.25, 'lose')).toMatchObject({
      outcome: 'lose',
      profitCents: -2000,
    });
  });
});
