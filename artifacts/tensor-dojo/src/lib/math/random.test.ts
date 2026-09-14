import { describe, expect, it } from 'vitest';
import { sampleDotProducts } from './random';

describe('sampleDotProducts', () => {
  it('returns an array of the requested length', () => {
    const out = sampleDotProducts(100, 4);
    expect(out.length).toBe(100);
  });

  it('produces variance ≈ d for large n', () => {
    // Var(Q·K) = d when Q, K are independent N(0,1) vectors.
    const d = 16;
    const n = 8000;
    const out = sampleDotProducts(n, d, 1);
    const mean = out.reduce((s, x) => s + x, 0) / n;
    const variance =
      out.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
    // Standard error of the mean is sqrt(d/n) ≈ 0.045; give it 3x.
    expect(Math.abs(mean)).toBeLessThan(0.15);
    expect(variance).toBeGreaterThan(d * 0.75);
    expect(variance).toBeLessThan(d * 1.25);
  });

  it('is deterministic for the same seed', () => {
    const a = sampleDotProducts(50, 8, 0);
    const b = sampleDotProducts(50, 8, 0);
    expect(a).toEqual(b);
  });

  it('changes when d changes', () => {
    const small = sampleDotProducts(50, 4, 0);
    const big = sampleDotProducts(50, 64, 0);
    // Standard deviation should be much larger for big d.
    const sds = (arr: number[]) => {
      const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
      const v = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (arr.length - 1);
      return Math.sqrt(v);
    };
    expect(sds(big)).toBeGreaterThan(sds(small) * 2);
  });
});
