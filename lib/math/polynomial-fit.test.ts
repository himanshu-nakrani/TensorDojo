import { describe, it, expect } from 'vitest';
import {
  designMatrix,
  evalPoly,
  evalPolyVector,
  mse,
  numCoefs,
  polyFit,
  syntheticRegression,
} from './polynomial-fit';

describe('polynomial-fit basics', () => {
  it('numCoefs returns degree+1', () => {
    expect(numCoefs(0)).toBe(1);
    expect(numCoefs(1)).toBe(2);
    expect(numCoefs(5)).toBe(6);
    expect(numCoefs(15)).toBe(16);
  });

  it('designMatrix builds the monomial matrix correctly', () => {
    const X = designMatrix([0, 1, 2], 2);
    expect(X).toEqual([
      [1, 0, 0],
      [1, 1, 1],
      [1, 2, 4],
    ]);
  });

  it('evalPoly evaluates by Horner (matches naive expansion)', () => {
    // 1 + 2x + 3x² at x = 2 → 1 + 4 + 12 = 17
    expect(evalPoly([1, 2, 3], 2)).toBeCloseTo(17, 10);
    expect(evalPoly([1, 2, 3], -1)).toBeCloseTo(1 - 2 + 3, 10);
    expect(evalPoly([0.5], 0.7)).toBeCloseTo(0.5, 10);
  });

  it('evalPolyVector applies evalPoly elementwise', () => {
    const w = [1, 0, 1]; // 1 + x²
    expect(evalPolyVector(w, [-2, -1, 0, 1, 2])).toEqual([5, 2, 1, 2, 5]);
  });
});

describe('polyFit (closed-form least-squares)', () => {
  it('degree 1 fits a line exactly when n = 2', () => {
    const w = polyFit([0, 1, 2], [1, 3, 5], 1);
    expect(w).not.toBeNull();
    expect(w![0]!).toBeCloseTo(1, 8);
    expect(w![1]!).toBeCloseTo(2, 8);
  });

  it('degree 1 fits a line in the over-determined case (least-squares)', () => {
    // Points along y = 0.5x + 1 with a small noise.
    const xs = [0, 1, 2, 3, 4];
    const ys = [1.0, 1.5, 2.0, 2.5, 3.0];
    const w = polyFit(xs, ys, 1);
    expect(w).not.toBeNull();
    expect(w![0]!).toBeCloseTo(1.0, 8);
    expect(w![1]!).toBeCloseTo(0.5, 8);
  });

  it('degree = n-1 interpolates the points exactly', () => {
    // 4 points, degree 3 → exact fit (no training loss).
    const xs = [-1, 0, 1, 2];
    const ys = [1, 0, 1, 4];
    const w = polyFit(xs, ys, 3);
    expect(w).not.toBeNull();
    for (let i = 0; i < xs.length; i += 1) {
      expect(evalPoly(w!, xs[i]!)).toBeCloseTo(ys[i]!, 8);
    }
    expect(mse(ys, evalPolyVector(w!, xs))).toBeLessThan(1e-9);
  });

  it('higher degree on the same data reduces training MSE monotonically', () => {
    // Use a noisier dataset so the higher-degree fit interpolates
    // but lower-degree fits are limited.
    const { xs, ys } = syntheticRegression(15, 0);
    const losses: number[] = [];
    for (let deg = 1; deg <= 14; deg += 1) {
      const w = polyFit(xs, ys, deg);
      expect(w).not.toBeNull();
      const pred = evalPolyVector(w!, xs);
      losses.push(mse(ys, pred));
    }
    for (let i = 1; i < losses.length; i += 1) {
      // The optimal least-squares MSE is monotone non-increasing in
      // model capacity (a higher-degree polynomial spans the space
      // of the lower-degree one).
      expect(losses[i]!).toBeLessThanOrEqual(losses[i - 1]! + 1e-9);
    }
  });

  it('recovers the true underlying polynomial on noise-free data', () => {
    // f(x) = 0.5 + 1.2x - 0.4x² + 0.1x³, 5 points, no noise.
    const wTrue = [0.5, 1.2, -0.4, 0.1];
    const xs = [-1, -0.5, 0, 0.5, 1];
    const ys = xs.map((x) => evalPoly(wTrue, x));
    const w = polyFit(xs, ys, 3);
    expect(w).not.toBeNull();
    for (let i = 0; i < wTrue.length; i += 1) {
      expect(w![i]!).toBeCloseTo(wTrue[i]!, 8);
    }
  });
});

describe('syntheticRegression', () => {
  it('returns the requested number of points', () => {
    const d = syntheticRegression(20, 0);
    expect(d.xs.length).toBe(20);
    expect(d.ys.length).toBe(20);
    expect(d.clean.length).toBe(20);
  });

  it('xs span [-1, 1]', () => {
    const d = syntheticRegression(20, 0);
    expect(d.xs[0]).toBeCloseTo(-1, 9);
    expect(d.xs[d.xs.length - 1]).toBeCloseTo(1, 9);
  });

  it('noise is bounded and finite', () => {
    const d = syntheticRegression(20, 0);
    for (let i = 0; i < d.xs.length; i += 1) {
      const noise = (d.ys[i] ?? 0) - (d.clean[i] ?? 0);
      expect(Math.abs(noise)).toBeLessThan(0.3);
      expect(Number.isFinite(noise)).toBe(true);
    }
  });

  it('is deterministic given the seed', () => {
    const a = syntheticRegression(20, 0);
    const b = syntheticRegression(20, 0);
    expect(a.ys).toEqual(b.ys);
  });
});
