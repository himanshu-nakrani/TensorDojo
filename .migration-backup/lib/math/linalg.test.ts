import { describe, expect, it } from 'vitest';
import {
  angleBetween,
  cosTheta,
  dot,
  magnitude,
  matMul,
  nearestNeighbors,
  normalize,
  projection,
  residual,
  scaledDot,
  transpose,
} from './linalg';

describe('dot', () => {
  it('returns 0 for orthogonal vectors', () => {
    expect(dot([1, 0], [0, 1])).toBe(0);
    expect(dot([0, 0, 1], [1, 0, 0])).toBe(0);
  });

  it('returns magnitude squared for self-dot', () => {
    expect(dot([3, 4], [3, 4])).toBe(25);
    expect(dot([1, 2, 3], [1, 2, 3])).toBe(14);
  });

  it('returns the product of aligned components', () => {
    expect(dot([2, 3], [4, 5])).toBe(2 * 4 + 3 * 5);
  });

  it('handles negatives correctly (anti-aligned = negative)', () => {
    expect(dot([1, 0], [-1, 0])).toBe(-1);
    expect(dot([1, 2, 3], [-1, -2, -3])).toBe(-14);
  });

  it('throws on length mismatch', () => {
    expect(() => dot([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
  });

  it('returns 0 for empty input', () => {
    expect(dot([], [])).toBe(0);
  });
});

describe('magnitude', () => {
  it('computes Euclidean length', () => {
    expect(magnitude([3, 4])).toBe(5);
    expect(magnitude([0, 0])).toBe(0);
    expect(magnitude([1, 1, 1])).toBeCloseTo(Math.sqrt(3), 10);
  });
});

describe('cosTheta', () => {
  it('projection projects a onto b along the b-axis', () => {
    // a along b: projection is a
    expect(projection([3, 0], [1, 0])).toEqual([3, 0]);
    // a perpendicular: projection is zero
    expect(projection([0, 3], [1, 0])).toEqual([0, 0]);
    // a at 45°: projection has magnitude |a|cos(45)
    const p = projection([1, 1], [1, 0]);
    expect(p[0]).toBeCloseTo(1, 10);
    expect(p[1]).toBeCloseTo(0, 10);
  });

  it('residual a − proj_b a is perpendicular to b', () => {
    const a = [1.0, 2.0, 3.0];
    const b = [1.0, 0.5, -0.2];
    const r = residual(a, b);
    expect(dot(r, b)).toBeCloseTo(0, 10);
    // and a = proj + residual
    const proj = projection(a, b);
    expect(a[0]).toBeCloseTo(proj[0]! + r[0]!, 10);
    expect(a[1]).toBeCloseTo(proj[1]! + r[1]!, 10);
    expect(a[2]).toBeCloseTo(proj[2]! + r[2]!, 10);
  });

  it('normalize returns a unit vector', () => {
    const n = normalize([3, 4]);
    expect(magnitude(n)).toBeCloseTo(1, 10);
    expect(n[0]).toBeCloseTo(0.6, 10);
    expect(n[1]).toBeCloseTo(0.8, 10);
  });

  it('scaledDot divides the dot product by √d_k', () => {
    expect(scaledDot([1, 0], [1, 0], 4)).toBeCloseTo(0.5, 10);
    expect(scaledDot([1, 1], [1, 1], 2)).toBeCloseTo(Math.sqrt(2), 10);
  });

  it('scaledDot throws on non-positive d_k', () => {
    expect(() => scaledDot([1], [1], 0)).toThrow();
    expect(() => scaledDot([1], [1], -1)).toThrow();
  });

  it('nearestNeighbors returns top-k indices by cosine similarity', () => {
    // 5 vectors of varying alignment with the query [1, 0]:
    //   0: same direction, sim = 1
    //   1: nearly same, sim ≈ 0.99
    //   2: nearly same (less so), sim ≈ 0.95
    //   3: orthogonal, sim = 0
    //   4: opposite, sim = -1
    const vectors: ReadonlyArray<readonly number[]> = [
      [1, 0],
      [0.9, 0.1],
      [0.7, 0.2],
      [0, 1],
      [-1, 0],
    ];
    const top3 = nearestNeighbors([1, 0], vectors, 3);
    // The first three vectors are all in the "same direction" half;
    // the exact order between 0, 1, 2 is determined by the stable
    // sort. We assert membership rather than order.
    expect(top3.length).toBe(3);
    expect(top3).toContain(0);
    expect(top3).toContain(1);
    expect(top3).toContain(2);
    expect(top3).not.toContain(3); // orthogonal
    expect(top3).not.toContain(4); // opposite
  });

  it('nearestNeighbors returns empty array for empty input', () => {
    expect(nearestNeighbors([1, 0], [], 3)).toEqual([]);
    expect(nearestNeighbors([1, 0], [[1, 0]], 0)).toEqual([]);
  });

  it('returns 1 for identical direction', () => {
    expect(cosTheta([1, 0], [5, 0])).toBeCloseTo(1, 10);
    expect(cosTheta([2, 3, 4], [4, 6, 8])).toBeCloseTo(1, 10);
  });

  it('returns -1 for opposite direction', () => {
    expect(cosTheta([1, 0], [-1, 0])).toBe(-1);
  });

  it('returns 0 for orthogonal', () => {
    expect(cosTheta([1, 0], [0, 1])).toBe(0);
  });

  it('returns 0 for zero vectors (safe default)', () => {
    expect(cosTheta([0, 0], [1, 1])).toBe(0);
    expect(cosTheta([1, 1], [0, 0])).toBe(0);
  });
});

describe('angleBetween', () => {
  it('returns 0 for identical direction', () => {
    expect(angleBetween([1, 0], [2, 0])).toBeCloseTo(0, 10);
  });

  it('returns π/2 for orthogonal', () => {
    expect(angleBetween([1, 0], [0, 1])).toBeCloseTo(Math.PI / 2, 10);
  });

  it('returns π for opposite direction', () => {
    expect(angleBetween([1, 0], [-1, 0])).toBeCloseTo(Math.PI, 10);
  });
});

describe('matMul', () => {
  it('multiplies 2×2 by 2×2', () => {
    expect(matMul([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });

  it('multiplies 4×2 by 2×4 to a 4×4 attention score matrix', () => {
    // Q is 4×2, K is 4×2 → Kᵀ is 2×4, so QKᵀ is 4×4.
    const Q = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    const K = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    const KT = transpose(K);
    const scores = matMul(Q, KT);
    expect(scores.length).toBe(4);
    expect(scores[0]!.length).toBe(4);
    // (1, 0) · (1, 0) = 1
    expect(scores[0]![0]).toBe(1);
    // (1, 0) · (0, 1) = 0
    expect(scores[0]![1]).toBe(0);
    // (1, 0) · (1, 1) = 1
    expect(scores[0]![2]).toBe(1);
    // (1, 0) · (1, -1) = 1
    expect(scores[0]![3]).toBe(1);
  });

  it('throws on inner-dim mismatch', () => {
    expect(() => matMul([[1, 2, 3]], [[1], [2]])).toThrow(/inner dim/);
  });
});

describe('transpose', () => {
  it('flips rows and columns', () => {
    expect(transpose([[1, 2, 3], [4, 5, 6]])).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it('handles empty and rectangular matrices', () => {
    expect(transpose([])).toEqual([]);
    expect(transpose([[1, 2, 3, 4]])).toEqual([[1], [2], [3], [4]]);
  });
});
