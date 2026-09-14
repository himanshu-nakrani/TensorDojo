import { describe, expect, it } from 'vitest';
import {
  SURFACES,
  listSurfaces,
  sgdTrajectory,
} from './loss-landscape';

describe('surfaces', () => {
  it('exposes four surfaces by id and list', () => {
    expect(Object.keys(SURFACES).sort()).toEqual([
      'bowl',
      'flat-min',
      'saddle',
      'sharp-min',
    ]);
    expect(listSurfaces()).toHaveLength(4);
  });

  it('gradient matches finite-difference for every surface', () => {
    const h = 1e-4;
    const samples: [number, number][] = [
      [0.3, -0.5],
      [-1.1, 0.7],
      [0.05, 0.05],
    ];
    for (const s of listSurfaces()) {
      for (const [x, y] of samples) {
        const [gx, gy] = s.grad(x, y);
        const fdGx = (s.f(x + h, y) - s.f(x - h, y)) / (2 * h);
        const fdGy = (s.f(x, y + h) - s.f(x, y - h)) / (2 * h);
        expect(gx).toBeCloseTo(fdGx, 3);
        expect(gy).toBeCloseTo(fdGy, 3);
      }
    }
  });
});

describe('sgdTrajectory', () => {
  it('on the bowl converges to the origin', () => {
    const path = sgdTrajectory(SURFACES.bowl, [1.5, -1.2]);
    const [lastX, lastY] = path[path.length - 1]!;
    expect(Math.hypot(lastX, lastY)).toBeLessThan(0.05);
    // Loss strictly decreases at every step on a convex bowl with
    // a small enough LR.
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1]!;
      const cur = path[i]!;
      const lossPrev = SURFACES.bowl.f(prev[0], prev[1]);
      const lossCur = SURFACES.bowl.f(cur[0], cur[1]);
      expect(lossCur).toBeLessThanOrEqual(lossPrev + 1e-9);
    }
  });

  it('on the saddle escapes to large |y| from a perturbed start', () => {
    // (0.01, 0.01) — almost at the saddle. The x component decays
    // toward 0; the y component runs away.
    const path = sgdTrajectory(SURFACES.saddle, [0.01, 0.01], 0.3);
    const [, lastY] = path[path.length - 1]!;
    expect(Math.abs(lastY)).toBeGreaterThan(1);
  });

  it('always returns at least the starting point', () => {
    // Start at the exact saddle critical point with zero gradient.
    const path = sgdTrajectory(SURFACES.bowl, [0, 0]);
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual([0, 0]);
  });

  it('clamps the trajectory to the surface extent', () => {
    const s = SURFACES.bowl;
    const path = sgdTrajectory(s, [s.extent, s.extent], 5); // huge LR overshoots
    for (const [x, y] of path) {
      expect(x).toBeGreaterThanOrEqual(-s.extent);
      expect(x).toBeLessThanOrEqual(s.extent);
      expect(y).toBeGreaterThanOrEqual(-s.extent);
      expect(y).toBeLessThanOrEqual(s.extent);
    }
  });
});
