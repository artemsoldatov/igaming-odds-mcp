import { describe, expect, it } from 'vitest';
import { decimalToAmerican, decimalToFractional, normalize, toDecimal } from './odds.js';

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
