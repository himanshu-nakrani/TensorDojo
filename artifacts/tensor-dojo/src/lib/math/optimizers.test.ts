import { describe, expect, it } from 'vitest';
import {
  ADAM_BETA1_DEFAULT,
  ADAM_BETA2_DEFAULT,
  ADAM_EPSILON,
  adamStep,
  sgdMomentumStep,
  sgdStep,
} from './optimizers';

describe('sgdStep (plain SGD)', () => {
  it('moves params in the negative gradient direction', () => {
    const r = sgdStep([1, 2, 3], [0.5, -1.0, 0.25], 0.1);
    expect(r.params[0]).toBeCloseTo(1 - 0.1 * 0.5, 10);
    expect(r.params[1]).toBeCloseTo(2 + 0.1, 10);
    expect(r.params[2]).toBeCloseTo(3 - 0.1 * 0.25, 10);
    expect(r.state.kind).toBe('sgd');
  });
  it('returns the original params when eta = 0', () => {
    const r = sgdStep([1, 2, 3], [0.5, -1.0, 0.25], 0);
    expect(r.params).toEqual([1, 2, 3]);
  });
  it('handles a zero-gradient parameter (no NaN, no step)', () => {
    const r = sgdStep([5, 5], [0, 0], 0.1);
    expect(r.params).toEqual([5, 5]);
  });
  it('throws on negative eta', () => {
    expect(() => sgdStep([1], [1], -0.1)).toThrow();
  });
  it('throws when params and grads lengths disagree', () => {
    expect(() => sgdStep([1, 2], [1], 0.1)).toThrow();
  });
});

describe('sgdMomentumStep (Polyak / "heavy ball")', () => {
  it('β=0 reduces to plain SGD (velocity = grad)', () => {
    const r = sgdMomentumStep(
      [1, 2],
      [0.5, -1.0],
      0.1,
      0,
      { kind: 'momentum', velocity: [0, 0] },
    );
    // velocity = 0·[0,0] + [0.5, -1.0] = [0.5, -1.0]
    // new params = [1, 2] - 0.1·[0.5, -1.0] = [0.95, 2.1]
    expect(r.params[0]).toBeCloseTo(0.95, 10);
    expect(r.params[1]).toBeCloseTo(2.1, 10);
    expect(r.state.velocity[0]).toBeCloseTo(0.5, 10);
    expect(r.state.velocity[1]).toBeCloseTo(-1.0, 10);
  });
  it('β>0 carries velocity across calls (the actual point of momentum)', () => {
    const s0 = { kind: 'momentum' as const, velocity: [0, 0] };
    const r1 = sgdMomentumStep([1, 1], [1, 0], 0.1, 0.9, s0);
    // v1 = 0.9·0 + 1 = 1, v2 = 0.9·0 + 0 = 0
    // new params = [1, 1] - 0.1·[1, 0] = [0.9, 1]
    expect(r1.params[0]).toBeCloseTo(0.9, 10);
    expect(r1.params[1]).toBeCloseTo(1.0, 10);
    // Second step: velocity carries forward.
    const r2 = sgdMomentumStep(r1.params, [1, 0], 0.1, 0.9, r1.state);
    // v1 = 0.9·1 + 1 = 1.9, v2 = 0.9·0 + 0 = 0
    // new params = [0.9, 1] - 0.1·[1.9, 0] = [0.71, 1]
    expect(r2.params[0]).toBeCloseTo(0.71, 10);
    expect(r2.params[1]).toBeCloseTo(1.0, 10);
  });
  it('throws on β outside [0, 1)', () => {
    expect(() =>
      sgdMomentumStep([1], [1], 0.1, 1.0, { kind: 'momentum', velocity: [0] }),
    ).toThrow();
    expect(() =>
      sgdMomentumStep([1], [1], 0.1, -0.1, { kind: 'momentum', velocity: [0] }),
    ).toThrow();
  });
});

describe('adamStep', () => {
  it('handles a zero-gradient parameter without dividing by zero', () => {
    // v=0 ⇒ vHat=0 ⇒ denom = sqrt(0) + ε = ε, well-defined.
    // m=0 ⇒ mHat=0 ⇒ update = 0.
    const r = adamStep([5], [0], 0.001);
    expect(Number.isFinite(r.params[0]!)).toBe(true);
    expect(r.params[0]).toBeCloseTo(5, 10);
  });
  it('bias correction matters at t=1', () => {
    // m = (1-β1)·g,  v = (1-β2)·g²
    // mHat = m / (1-β1) = g   ← bias-corrected
    // vHat = v / (1-β2) = g²  ← bias-corrected
    // update = η · g / (|g| + ε)  (≈ sign of g)
    // With η=0.1, g=2.0, ε=1e-8: update ≈ 0.1 · 1.0 = 0.1
    const r = adamStep([1.0], [2.0], 0.1);
    // 1.0 − 0.1 = 0.9 (to within ε)
    expect(r.params[0]).toBeCloseTo(0.9, 6);
  });
  it('after many steps the bias correction is negligible', () => {
    // Hand-roll t=1000. (1 − β1^1000) ≈ 1, (1 − β2^1000) ≈ 0.632.
    const initState = {
      kind: 'adam' as const,
      m: new Array(1).fill(0),
      v: new Array(1).fill(0),
      t: 999,
    };
    const r = adamStep([1.0], [2.0], 0.001, ADAM_BETA1_DEFAULT, ADAM_BETA2_DEFAULT, ADAM_EPSILON, initState);
    // m = 0.9·m + 0.1·2 = 0.2 (from m=0 start)
    // v = 0.999·v + 0.001·4 = 0.004 (from v=0 start)
    // biasCorr1 = 1 − 0.9^1000 ≈ 1
    // biasCorr2 = 1 − 0.999^1000 ≈ 1 − 0.3676 = 0.6324
    // mHat = 0.2 / 1 = 0.2
    // vHat = 0.004 / 0.6324 = 0.00632
    // √vHat ≈ 0.0795
    // update = 0.001 · 0.2 / (0.0795 + 1e-8) ≈ 0.002516
    expect(r.params[0]).toBeCloseTo(1.0 - 0.002516, 4);
  });
  it('throws on β1 outside [0, 1)', () => {
    expect(() => adamStep([1], [1], 0.1, 1.0, 0.999, 1e-8)).toThrow();
    expect(() => adamStep([1], [1], 0.1, -0.1, 0.999, 1e-8)).toThrow();
  });
  it('throws on non-positive epsilon', () => {
    expect(() => adamStep([1], [1], 0.1, 0.9, 0.999, 0)).toThrow();
    expect(() => adamStep([1], [1], 0.1, 0.9, 0.999, -1e-8)).toThrow();
  });
});
