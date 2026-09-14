import { describe, expect, it } from 'vitest';
import { gelu, relu } from './gelu';

describe('gelu', () => {
  it('is exactly 0 at x=0', () => {
    expect(gelu(0)).toBeCloseTo(0, 6);
  });

  it('is positive for positive x', () => {
    expect(gelu(1)).toBeGreaterThan(0);
    expect(gelu(2)).toBeGreaterThan(0);
    expect(gelu(0.5)).toBeGreaterThan(0);
  });

  it('does not zero negatives the way ReLU does', () => {
    // GELU is not ReLU: for x = -2, GELU is small-negative (~-0.046),
    // not zero. This is the key difference the lesson calls out.
    const v = gelu(-2);
    expect(v).toBeLessThan(0);
    expect(Math.abs(v)).toBeLessThan(0.1);
    expect(Math.abs(v)).toBeGreaterThan(0.01);
  });

  it('matches the closed-form for moderate x', () => {
    // gelu(1) = 0.5 * 1 * (1 + erf(1/sqrt(2)))
    //        ≈ 0.5 * (1 + 0.6827) ≈ 0.8413
    expect(gelu(1)).toBeCloseTo(0.8413, 3);
  });

  it('is monotonically non-decreasing for x > -0.75 (after its minimum)', () => {
    // GELU has a local minimum at x ≈ -0.75; for x > -0.75 it is
    // strictly increasing. Verify that branch — the test is the
    // branch the lesson cares about (the "exp amplifies
    // differences" story lives in the positive half).
    const xs = [-0.5, -0.25, 0, 0.25, 0.5, 1, 1.5, 2, 3];
    let prev = gelu(xs[0]!);
    for (let i = 1; i < xs.length; i += 1) {
      const v = gelu(xs[i]!);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('has a local minimum near x = -0.76, then rises back toward 0', () => {
    // GELU's curve: 0 at x=0 → descends to a minimum around
    // x ≈ -0.76 (value ≈ -0.17) → rises back toward 0 as
    // x → -∞. The right side of the minimum (x > -0.76) is
    // strictly increasing; the left side (x < -0.76) is also
    // strictly increasing. The minimum is the single bottom
    // of the curve.
    const atZero = gelu(0);
    const atMin = gelu(-0.76);
    const atFarLeft = gelu(-5);
    expect(atMin).toBeLessThan(atZero);
    expect(atMin).toBeLessThan(-0.1); // magnitude of minimum is ~0.17
    expect(atFarLeft).toBeGreaterThan(atMin); // GELU rises back toward 0
    expect(Math.abs(atFarLeft)).toBeLessThan(Math.abs(atMin));
  });
});

describe('relu', () => {
  it('zeros negatives', () => {
    expect(relu(-1)).toBe(0);
    expect(relu(-0.5)).toBe(0);
    expect(relu(-100)).toBe(0);
  });

  it('is the identity on positives', () => {
    expect(relu(0)).toBe(0);
    expect(relu(0.5)).toBe(0.5);
    expect(relu(2)).toBe(2);
  });
});

describe('gelu vs relu', () => {
  it('GELU has nonzero negative tail; ReLU does not', () => {
    expect(gelu(-2)).not.toBe(0);
    expect(relu(-2)).toBe(0);
  });

  it('both are close on large positive x', () => {
    // For x large, gelu(x) ≈ x.
    expect(Math.abs(gelu(3) - 3)).toBeLessThan(0.01);
    expect(relu(3)).toBe(3);
  });
});
