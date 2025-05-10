import { describe, expect, it } from 'vitest';
import {
  bookmakerMargin,
  decimalToAmerican,
  decimalToFractional,
  normalize,
  parlayDecimal,
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
