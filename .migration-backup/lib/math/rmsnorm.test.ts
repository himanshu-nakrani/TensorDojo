import { describe, expect, it } from 'vitest';
import { rms, rmsNorm } from './rmsnorm';
import { layerNorm } from './layernorm';

describe('rmsNorm', () => {
  it('returns the rms of a vector with eps swallowed in the sqrt', () => {
    expect(rms([1, 1, 1, 1])).toBeCloseTo(1, 4);
    expect(rms([2, 2, 2, 2])).toBeCloseTo(2, 4);
    expect(rms([3, 4])).toBeCloseTo(Math.sqrt(12.5), 4);
  });

  it('normalizes to unit RMS (up to eps)', () => {
    const out = rmsNorm([1, 2, 3, 4]);
    expect(rms(out)).toBeCloseTo(1, 3);
  });

  it('applies the learned scale', () => {
    const out = rmsNorm([1, 1, 1, 1], [2, 2, 2, 2]);
    for (const v of out) {
      expect(v).toBeCloseTo(2, 4);
    }
  });

  it('matches LayerNorm exactly on zero-mean input (gamma=1, beta=0)', () => {
    const x = [1, -1, 2, -2];
    const ln = layerNorm(x);
    const rn = rmsNorm(x);
    for (let i = 0; i < x.length; i += 1) {
      expect(rn[i]).toBeCloseTo(ln[i] as number, 4);
    }
  });

  it('differs from LayerNorm on non-zero-mean input', () => {
    const x = [3, 3.5, 4, 4.5];
    const ln = layerNorm(x);
    const rn = rmsNorm(x);
    let totalDiff = 0;
    for (let i = 0; i < x.length; i += 1) {
      totalDiff += Math.abs(rn[i]! - (ln[i] as number));
    }
    expect(totalDiff).toBeGreaterThan(0.5);
  });

  it('rejects gamma length mismatch', () => {
    expect(() => rmsNorm([1, 2, 3], [1, 1])).toThrow(/length must match/);
  });
});
