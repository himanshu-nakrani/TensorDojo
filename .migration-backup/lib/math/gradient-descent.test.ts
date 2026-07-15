import { describe, expect, it } from 'vitest';
import { gradient, loss, run, step } from './gradient-descent';

describe('toy loss landscape', () => {
  it('loss is non-negative (or close to) at minima', () => {
    // (1, 0) is a global minimum: L = (1-1)² + 0 + 0.3·sin(3) ≈ 0.04
    // Not exactly zero because of the sin(3x) term, but small.
    expect(loss([1, 0])).toBeLessThan(0.1);
    // (-1, 0): same by symmetry.
    expect(loss([-1, 0])).toBeLessThan(0.1);
  });

  it('loss is high far from the minima', () => {
    // (0, 0) is the top of the central bump: L = 1 + 0 + 0.3·sin(0) = 1
    expect(loss([0, 0])).toBeCloseTo(1, 6);
    // (3, 3) is well outside: L = (9-1)² + 4.5 + 0.3·sin(9) ≈ 68
    expect(loss([3, 3])).toBeGreaterThan(50);
  });
});

describe('gradient', () => {
  it('gradient at a minimum is the zero vector', () => {
    // Both minima are at (1, 0) and (-1, 0). The gradient of the
    // toy loss isn't exactly zero at these points because of the
    // sin term, but the y-component (y) is exactly 0.
    const g1 = gradient([1, 0]);
    expect(g1[1]).toBe(0); // dL/dy = y = 0
    // dL/dx at (1, 0): 4·1·(1-1) + 0.9·cos(3) = 0.9·cos(3) ≈ -0.891
    expect(g1[0]).toBeCloseTo(0.9 * Math.cos(3), 10);

    const g2 = gradient([-1, 0]);
    expect(g2[1]).toBe(0);
    // dL/dx at (-1, 0): 4·(-1)·(1-1) + 0.9·cos(-3) = 0.9·cos(-3) ≈ -0.891
    expect(g2[0]).toBeCloseTo(0.9 * Math.cos(-3), 10);
  });

  it('gradient at (0, 0) points away from the saddle (into x=±1)', () => {
    // dL/dx at (0, 0): 4·0·(-1) + 0.9·cos(0) = 0.9 (positive).
    // The negative gradient (descent direction) is -0.9, i.e.
    // toward x < 0, i.e. toward (-1, 0). The descent has to
    // commit to one of the two minima; the initial direction
    // picks one based on the local slope.
    const g = gradient([0, 0]);
    expect(g[0]).toBeCloseTo(0.9, 10);
    expect(g[1]).toBe(0);
  });

  it('gradient is exact: finite-difference check', () => {
    // Numerical gradient by central difference should match
    // the analytical gradient to machine precision.
    const p: [number, number] = [0.7, -0.3];
    const h = 1e-6;
    const numerical: [number, number] = [
      (loss([p[0] + h, p[1]]) - loss([p[0] - h, p[1]])) / (2 * h),
      (loss([p[0], p[1] + h]) - loss([p[0], p[1] - h])) / (2 * h),
    ];
    const analytical = gradient(p);
    expect(analytical[0]).toBeCloseTo(numerical[0], 4);
    expect(analytical[1]).toBeCloseTo(numerical[1], 4);
  });
});

describe('step', () => {
  it('moves in the negative gradient direction', () => {
    // From (0.5, 0.5), the gradient is some vector (gx, gy).
    // The next point should be (0.5 - η·gx, 0.5 - η·gy).
    const from: [number, number] = [0.5, 0.5];
    const eta = 0.1;
    const g = gradient(from);
    const { next } = step(from, eta);
    expect(next[0]).toBeCloseTo(from[0] - eta * g[0], 10);
    expect(next[1]).toBeCloseTo(from[1] - eta * g[1], 10);
  });

  it('reduces the loss for a small step from (0, 0)', () => {
    // From the saddle (0, 0), a small step should reduce the
    // loss — the negative gradient is the descent direction by
    // definition.
    const from: [number, number] = [0, 0];
    const before = loss(from);
    const { loss: after } = step(from, 0.01, before);
    expect(after).toBeLessThan(before);
  });

  it('reduces the loss for small η from a non-stationary point', () => {
    const from: [number, number] = [0.5, 0.3];
    const before = loss(from);
    const { loss: after } = step(from, 0.01, before);
    expect(after).toBeLessThan(before);
  });

  it('throws on negative eta', () => {
    expect(() => step([0, 0], -0.1)).toThrow();
  });
});

describe('run (multi-step gradient descent)', () => {
  it('converges to a minimum from a typical starting point with small eta', () => {
    // Start at (0.5, 0.5) with η=0.05, run 200 steps. Should
    // land near (±1, 0).
    const result = run([0.5, 0.5], 0.05, 200);
    const end = result.trajectory[result.trajectory.length - 1]!;
    expect(Math.abs(Math.abs(end[0]) - 1)).toBeLessThan(0.2);
    expect(Math.abs(end[1])).toBeLessThan(0.1);
    expect(result.losses[result.losses.length - 1]!).toBeLessThan(0.1);
    expect(result.divergedAt).toBeNull();
  });

  it('diverges (or oscillates) for too-large eta', () => {
    // η = 2 is too large for this landscape; the trajectory
    // either diverges or the divergence detector fires within
    // a small number of steps.
    const result = run([0, 0.5], 2, 50);
    expect(result.divergedAt).not.toBeNull();
    expect(result.divergedAt!).toBeLessThan(20);
  });

  it('starting at the minimum is a fixed point', () => {
    // Start exactly at the (1, 0) minimum with the sin-term
    // residue. Tiny eta: shouldn't move much.
    const start: [number, number] = [1, 0];
    const result = run(start, 0.001, 10);
    const end = result.trajectory[result.trajectory.length - 1]!;
    expect(Math.abs(end[0] - 1)).toBeLessThan(0.05);
    expect(Math.abs(end[1])).toBeLessThan(0.01);
  });

  it('returns the starting point with empty trajectory for numSteps=0', () => {
    const result = run([0.5, 0.5], 0.1, 0);
    expect(result.trajectory.length).toBe(1);
    expect(result.losses.length).toBe(1);
    expect(result.trajectory[0]).toEqual([0.5, 0.5]);
  });

  it('throws on negative numSteps', () => {
    expect(() => run([0, 0], 0.1, -1)).toThrow();
  });
});
