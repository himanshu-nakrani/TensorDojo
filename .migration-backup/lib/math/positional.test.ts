import { describe, expect, it } from 'vitest';
import { sinusoidalPE, sinusoidalPE1D } from './positional';

describe('sinusoidalPE', () => {
  it('throws on odd d', () => {
    expect(() => sinusoidalPE(8, 3)).toThrow();
  });

  it('returns empty for non-positive maxPos', () => {
    expect(sinusoidalPE(0, 4)).toEqual([]);
  });

  it('pos 0 row is [sin(0), cos(0), sin(0), cos(0), ...] = [0, 1, 0, 1]', () => {
    const pe = sinusoidalPE(4, 4);
    expect(pe[0]).toEqual([0, 1, 0, 1]);
  });

  it('pos 1, halfD=1: angle = 1 / 10000^0 = 1 (the i=0 pair uses base wavelength 2π)', () => {
    const pe = sinusoidalPE(4, 2);
    // halfD=1, denom for pair i=0 is PE_BASE^0 = 1, so angle = pos / 1 = 1.
    expect(pe[1]![0]).toBeCloseTo(Math.sin(1), 10);
    expect(pe[1]![1]).toBeCloseTo(Math.cos(1), 10);
  });

  it('all rows have unit norm (sin² + cos² = 1 per pair)', () => {
    const pe = sinusoidalPE(16, 8);
    for (const row of pe) {
      let sumSq = 0;
      for (let i = 0; i < row.length; i += 2) {
        sumSq += row[i]! ** 2 + row[i + 1]! ** 2;
      }
      expect(sumSq).toBeCloseTo(row.length / 2, 6);
    }
  });

  it('sinusoidalPE1D matches a row of sinusoidalPE', () => {
    const pe = sinusoidalPE(5, 4);
    for (let pos = 0; pos < 5; pos += 1) {
      expect(sinusoidalPE1D(pos, 4)).toEqual(pe[pos]);
    }
  });
});
