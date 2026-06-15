import { describe, it, expect } from 'vitest';
import { dpoLoss, dpoGradient, policySoftmax } from './rlhf';

describe('policySoftmax', () => {
  it('returns a probability distribution', () => {
    const p = policySoftmax([1, 2, 3, 4]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    for (const v of p) expect(v).toBeGreaterThan(0);
  });

  it('is shift-invariant (numerically stable)', () => {
    const p1 = policySoftmax([1000, 1001, 1002]);
    const p2 = policySoftmax([0, 1, 2]);
    for (let i = 0; i < 3; i += 1) {
      expect(p1[i]).toBeCloseTo(p2[i]!, 10);
    }
  });
});

describe('dpoLoss', () => {
  it('is lower when the policy already prefers the preferred response', () => {
    const ref = [0, 0, 0, 0];
    const lossAlready = dpoLoss([2, 0, 0, 0], ref, 0, 1, 1.0);
    const lossWrong = dpoLoss([0, 2, 0, 0], ref, 0, 1, 1.0);
    expect(lossAlready).toBeLessThan(lossWrong);
  });

  it('equals log(2) when logits = ref (z = 0, σ(0) = 0.5)', () => {
    const logits = [0, 0, 0, 0];
    const ref = [0, 0, 0, 0];
    expect(dpoLoss(logits, ref, 0, 1, 1.0)).toBeCloseTo(Math.log(2), 6);

    // Same property at arbitrary β when logits = ref.
    expect(dpoLoss(logits, ref, 0, 1, 2.5)).toBeCloseTo(Math.log(2), 6);
  });

  it('is numerically stable for large logit differences', () => {
    const ref = [0, 0, 0, 0];
    // Big positive z: loss should be near zero.
    expect(dpoLoss([10, -10, 0, 0], ref, 0, 1, 1.0)).toBeGreaterThan(0);
    expect(dpoLoss([10, -10, 0, 0], ref, 0, 1, 1.0)).toBeLessThan(1e-3);
    // Big negative z: loss should be large and finite.
    const big = dpoLoss([-10, 10, 0, 0], ref, 0, 1, 1.0);
    expect(big).toBeGreaterThan(15);
    expect(Number.isFinite(big)).toBe(true);
  });
});

describe('dpoGradient', () => {
  it('preferred index has negative gradient, dispreferred has positive', () => {
    const logits = [0, 0, 0, 0];
    const ref = [0, 0, 0, 0];
    const g = dpoGradient(logits, ref, 0, 1, 1.0);
    expect(g[0]).toBeLessThan(0);
    expect(g[1]).toBeGreaterThan(0);
    // Untouched indices have zero gradient.
    expect(g[2]).toBe(0);
    expect(g[3]).toBe(0);
  });

  it('analytic gradient matches numerical at a non-trivial point', () => {
    const logits = [0.3, -0.1, 0.5, 0.0];
    const ref = [0.0, 0.0, 0.0, 0.0];
    const analytical = dpoGradient(logits, ref, 0, 2, 1.0);
    const eps = 1e-5;
    for (let i = 0; i < logits.length; i += 1) {
      const lo = [...logits]; lo[i] = lo[i]! - eps;
      const hi = [...logits]; hi[i] = hi[i]! + eps;
      const numerical = (dpoLoss(hi, ref, 0, 2, 1.0) - dpoLoss(lo, ref, 0, 2, 1.0)) / (2 * eps);
      expect(analytical[i]).toBeCloseTo(numerical, 4);
    }
  });

  it('β scales the gradient linearly', () => {
    const logits = [0.3, -0.1, 0.5, 0.0];
    const ref = [0.0, 0.0, 0.0, 0.0];
    const g1 = dpoGradient(logits, ref, 0, 2, 1.0);
    const g2 = dpoGradient(logits, ref, 0, 2, 2.0);
    expect(g2[0]).toBeCloseTo(2 * g1[0]!, 6);
    expect(g2[2]).toBeCloseTo(2 * g1[2]!, 6);
  });

  it('returns a vector of length K', () => {
    expect(dpoGradient([0, 0, 0, 0], [0, 0, 0, 0], 0, 1, 1.0)).toHaveLength(4);
  });
});
