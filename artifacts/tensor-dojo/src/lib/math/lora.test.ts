import { describe, it, expect } from 'vitest';
import { compose, paramCount, svdLowRankApprox, frobeniusError, fitLowRank } from './lora';

describe('compose', () => {
  it('produces an m×n matrix from m×r and r×n', () => {
    const A = [[1, 2], [3, 4], [5, 6]]; // 3×2
    const B = [[7, 8, 9], [10, 11, 12]]; // 2×3
    const C = compose(A, B);
    expect(C.length).toBe(3);
    expect(C[0]!.length).toBe(3);
    expect(C[0]![0]).toBe(1 * 7 + 2 * 10);  // = 27
    expect(C[2]![2]).toBe(5 * 9 + 6 * 12);  // = 117
  });

  it('throws on shape mismatch', () => {
    expect(() => compose([[1, 2]], [[3], [4], [5]])).toThrow();
  });

  it('handles rank-1 factorization correctly', () => {
    const A = [[1], [2], [3]];  // 3×1
    const B = [[4, 5]];          // 1×2
    expect(compose(A, B)).toEqual([[4, 5], [8, 10], [12, 15]]);
  });
});

describe('paramCount', () => {
  it('equals (m + n) · r', () => {
    expect(paramCount(8, 8, 1)).toBe(16);
    expect(paramCount(8, 8, 4)).toBe(64);
    expect(paramCount(8, 8, 8)).toBe(128);
    expect(paramCount(4096, 4096, 8)).toBe(65536);
  });
});

describe('frobeniusError', () => {
  it('is zero for identical matrices', () => {
    expect(frobeniusError([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(0);
  });

  it('matches the manual sqrt(sum of squared diffs)', () => {
    const err = frobeniusError([[1, 2]], [[2, 4]]);
    expect(err).toBeCloseTo(Math.sqrt(1 + 4), 10);
  });
});

describe('svdLowRankApprox', () => {
  it('rank-d gives exact reconstruction (d = min(m, n))', () => {
    const W = [[1, 2], [3, 4]];
    const { A, B } = svdLowRankApprox(W, 2);
    expect(A.length).toBe(2);
    expect(A[0]!.length).toBe(2);
    expect(B.length).toBe(2);
    expect(B[0]!.length).toBe(2);
    expect(frobeniusError(W, compose(A, B))).toBeLessThan(1e-6);
  });

  it('rank-1 approximation of a rank-1 matrix is exact', () => {
    // W = [1,2,3]^T · [1,2,3]
    const W = [[1, 2, 3], [2, 4, 6], [3, 6, 9]];
    const { A, B } = svdLowRankApprox(W, 1);
    expect(frobeniusError(W, compose(A, B))).toBeLessThan(1e-3);
  });

  it('error decreases monotonically as r increases', () => {
    const W = [
      [1, 0.5, 0.2, 0.1],
      [0.5, 1, 0.5, 0.2],
      [0.2, 0.5, 1, 0.5],
      [0.1, 0.2, 0.5, 1],
    ];
    let prev = Infinity;
    for (let r = 1; r <= 4; r += 1) {
      const { A, B } = svdLowRankApprox(W, r);
      const err = frobeniusError(W, compose(A, B));
      expect(err).toBeLessThanOrEqual(prev + 1e-6);
      prev = err;
    }
  });
});

describe('fitLowRank', () => {
  it('losses are monotonically non-increasing (allowing a tiny numerical wobble)', () => {
    const target = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const { losses } = fitLowRank(target, 2, 500, 0.05);
    for (let i = 1; i < losses.length; i += 1) {
      expect(losses[i]!).toBeLessThanOrEqual(losses[i - 1]! + 1e-5);
    }
  });

  it('rank ≥ target rank converges to small loss', () => {
    const target = [[1, 2], [3, 4]];  // rank 2
    const { losses } = fitLowRank(target, 2, 2000, 0.05);
    expect(losses.at(-1)!).toBeLessThan(0.05);
  });

  it('returns factors of the right shape', () => {
    const target = [[1, 2], [3, 4], [5, 6]]; // 3×2
    const { A, B } = fitLowRank(target, 1, 100, 0.01);
    expect(A.length).toBe(3);
    expect(A[0]!.length).toBe(1);
    expect(B.length).toBe(1);
    expect(B[0]!.length).toBe(2);
  });
});
