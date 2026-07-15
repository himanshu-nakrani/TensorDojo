import { describe, expect, it } from 'vitest';
import { layerNorm, layerNormBatch } from './layernorm';

describe('layerNorm', () => {
  it('returns zeros for an empty vector', () => {
    expect(layerNorm([])).toEqual([]);
  });

  it('returns zeros for a constant vector (zero variance)', () => {
    expect(layerNorm([3, 3, 3])).toEqual([0, 0, 0]);
  });

  it('produces zero mean and variance < 1 + ε on a simple input', () => {
    // Layer norm divides by sqrt(var + ε) so the output variance is
    // var / (var + ε) < 1. The test asserts that we're close to 1.
    const y = layerNorm([1, 2, 3, 4]);
    const mean = y.reduce((s, x) => s + x, 0) / y.length;
    const variance = y.reduce((s, x) => s + (x - mean) ** 2, 0) / y.length;
    expect(Math.abs(mean)).toBeLessThan(1e-7);
    expect(variance).toBeGreaterThan(0.999);
    expect(variance).toBeLessThan(1.0);
  });

  it('does not change the direction with default gamma=1, beta=0', () => {
    const x = [1, 2, 3];
    const y = layerNorm(x);
    expect(y[0]! * x[0]! + y[1]! * x[1]! + y[2]! * x[2]!).toBeGreaterThan(0);
  });

  it('respects a custom gamma (scale) and beta (shift)', () => {
    const y = layerNorm([1, 2, 3], [2, 2, 2], [10, 10, 10]);
    // mean=2, var=2/3, std≈0.8165, y = ((x-2)/std)*2 + 10
    // For x=1: y = (-1/0.8165)*2 + 10 ≈ 7.55
    // For x=2: y = 10
    // For x=3: y = (1/0.8165)*2 + 10 ≈ 12.45
    expect(y[0]).toBeCloseTo(7.55, 1);
    expect(y[1]).toBeCloseTo(10, 6);
    expect(y[2]).toBeCloseTo(12.45, 1);
  });

  it('throws on gamma/beta length mismatch', () => {
    expect(() => layerNorm([1, 2, 3], [1, 1])).toThrow();
  });
});

describe('layerNormBatch', () => {
  it('normalizes each token independently', () => {
    const out = layerNormBatch([[1, 2, 3], [10, 20, 30]]);
    for (const y of out) {
      const mean = y.reduce((s, x) => s + x, 0) / y.length;
      expect(Math.abs(mean)).toBeLessThan(1e-7);
    }
  });
});
