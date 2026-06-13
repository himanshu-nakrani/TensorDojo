import { describe, expect, it } from 'vitest';
import { sinusoidalPE, sinusoidalPE1D } from './positional';

describe('sinusoidalPE', () => {
  it('throws on odd d', () => {
    expect(() => sinusoidalPE(8, 3)).toThrow();
  });

  it('returns empty for non-positive maxPos', () => {
    expect(sinusoidalPE(0, 4)).toEqual([]);
  });

  it('pos 0 is the all-zero vector', () => {
    const pe = sinusoidalPE(4, 4);
    expect(pe[0]).toEqual([0, 1, 0, 1]);
  });

  it('pos 1 row 0 is sin(1 / 2π) (the i=0 dimension has wavelength 2π)', () => {
    const pe = sinusoidalPE(4, 2);
    // For halfD=1, wavelength for i=0 is 2π · 10000^0 = 2π
    // So angle = pos / (2π) = 1 / (2π) for pos=1
    const expected = Math.sin(1 / (2 * Math.PI));
    expect(pe[1]![0]).toBeCloseTo(expected, 10);
    expect(pe[1]![1]).toBeCloseTo(Math.cos(1 / (2 * Math.PI)), 10);
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
