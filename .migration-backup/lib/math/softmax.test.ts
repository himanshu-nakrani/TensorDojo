import { describe, expect, it } from 'vitest';
import { argmax, softmax, softmaxRows } from './softmax';

const isClose = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) < tol;

describe('softmax', () => {
  it('matches the closed-form values for a simple input', () => {
    // e^1 = 2.71828, e^2 = 7.38906, e^3 = 20.0855; sum ≈ 30.1929
    const result = softmax([1, 2, 3]);
    expect(result.length).toBe(3);
    expect(isClose(result[0] as number, 2.71828 / 30.1929, 1e-5)).toBe(true);
    expect(isClose(result[1] as number, 7.38906 / 30.1929, 1e-5)).toBe(true);
    expect(isClose(result[2] as number, 20.0855 / 30.1929, 1e-5)).toBe(true);
  });

  it('produces a distribution that sums to 1', () => {
    const cases: number[][] = [
      [0, 0, 0],
      [-5, 0, 5],
      [2.0, 1.0, 0.1, -0.5, 1.5],
      [-1000, -1001, -1002],
    ];
    for (const c of cases) {
      const sum = softmax(c).reduce((a, b) => a + b, 0);
      expect(isClose(sum, 1, 1e-9)).toBe(true);
    }
  });

  it('is numerically stable at extreme magnitudes', () => {
    // Naive exp(1000) overflows. The subtract-max trick must survive this.
    const result = softmax([1000, 1000, 1000]);
    for (const v of result) {
      expect(Number.isFinite(v)).toBe(true);
      expect(isClose(v, 1 / 3, 1e-9)).toBe(true);
    }

    const mixed = softmax([1000, 999, 998]);
    expect(argmax(mixed)).toBe(0);
    for (const v of mixed) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('respects temperature: high T flattens, low T sharpens', () => {
    const scores = [2.0, 1.0, 0.1];
    const flat = softmax(scores, 1000);  // very high temperature → near uniform
    const sharp = softmax(scores, 0.05); // very low temperature  → near one-hot

    // Flat: entries close to 1/3.
    for (const v of flat) {
      expect(isClose(v, 1 / 3, 1e-3)).toBe(true);
    }

    // Sharp: argmax position gets > 0.99, others < 0.01.
    expect(sharp[0] as number).toBeGreaterThan(0.99);
    expect(sharp[1] as number).toBeLessThan(0.01);
    expect(sharp[2] as number).toBeLessThan(0.01);

    // The argmax of the distribution is the argmax of the input scores,
    // regardless of temperature.
    expect(argmax(flat)).toBe(0);
    expect(argmax(sharp)).toBe(0);
  });

  it('rejects non-positive temperature', () => {
    expect(() => softmax([1, 2, 3], 0)).toThrow();
    expect(() => softmax([1, 2, 3], -1)).toThrow();
  });

  it('handles empty input', () => {
    expect(softmax([])).toEqual([]);
  });
});

describe('softmaxRows', () => {
  it('applies softmax to each row independently', () => {
    const rows = [
      [1, 2, 3],
      [-1, 0, 1],
      [10, 10, 10],
    ];
    const out = softmaxRows(rows);
    expect(out.length).toBe(3);
    // Row 0: matches single softmax result.
    expect(isClose(out[0]![0] as number, 2.71828 / 30.1929, 1e-5)).toBe(true);
    // Row 2: uniform.
    for (const v of out[2]!) {
      expect(isClose(v, 1 / 3, 1e-9)).toBe(true);
    }
    // Every row sums to 1.
    for (const row of out) {
      expect(isClose(row.reduce((a, b) => a + b, 0), 1, 1e-9)).toBe(true);
    }
  });

  it('respects a shared temperature', () => {
    // scores = [1, 2, 3] has argmax at index 2. With low T, that entry
    // dominates the distribution.
    const rows = [[1, 2, 3], [1, 2, 3]];
    const out = softmaxRows(rows, 0.1);
    for (const row of out) {
      // Sharp — the largest entry (index 2) gets nearly all the mass.
      expect(row[2] as number).toBeGreaterThan(0.99);
      expect(row[0] as number).toBeLessThan(0.01);
    }
  });
});
