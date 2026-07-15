import { describe, expect, it } from 'vitest';
import {
  CHINCHILLA_E,
  chinchillaLoss,
  chinchillaOptimalSplit,
  chinchillaTokensPerParam,
  computeFlops,
} from './scalinglaws';

describe('chinchillaLoss', () => {
  it('rejects non-positive N or D', () => {
    expect(() => chinchillaLoss(0, 100)).toThrow();
    expect(() => chinchillaLoss(100, 0)).toThrow();
    expect(() => chinchillaLoss(-1, 100)).toThrow();
  });

  it('approaches the irreducible loss E as N and D → infinity', () => {
    const lossAtInf = chinchillaLoss(1e15, 1e15);
    expect(lossAtInf).toBeCloseTo(CHINCHILLA_E, 1);
    expect(lossAtInf).toBeGreaterThan(CHINCHILLA_E);
  });

  it('decreases monotonically as N grows (with D fixed)', () => {
    const D = 1e12;
    let prev = Infinity;
    for (const N of [1e7, 1e8, 1e9, 1e10, 1e11]) {
      const cur = chinchillaLoss(N, D);
      expect(cur).toBeLessThan(prev);
      prev = cur;
    }
  });

  it('decreases monotonically as D grows (with N fixed)', () => {
    const N = 70e9;
    let prev = Infinity;
    for (const D of [1e11, 1e12, 1e13, 1e14]) {
      const cur = chinchillaLoss(N, D);
      expect(cur).toBeLessThan(prev);
      prev = cur;
    }
  });

  it('GPT-3 (175B params, 300B tokens) sits around the paper-reported loss range', () => {
    // ~2.0 nats is the right ballpark for Chinchilla's reported GPT-3 score.
    const L = chinchillaLoss(175e9, 300e9);
    expect(L).toBeGreaterThan(1.8);
    expect(L).toBeLessThan(2.2);
  });

  it('matches the closed-form for hand-checked (N, D)', () => {
    // L(1e10, 1e12) = 1.69 + 406.4 * (1e10)^(-0.34) + 410.7 * (1e12)^(-0.28)
    const N = 1e10;
    const D = 1e12;
    const expected =
      1.69 + 406.4 * Math.pow(N, -0.34) + 410.7 * Math.pow(D, -0.28);
    expect(chinchillaLoss(N, D)).toBeCloseTo(expected, 9);
  });
});

describe('computeFlops', () => {
  it('returns 6·N·D', () => {
    expect(computeFlops(1e9, 1e12)).toBe(6 * 1e9 * 1e12);
    expect(computeFlops(70e9, 1.4e12)).toBeCloseTo(5.88e23, -10);
  });

  it('rejects non-positive inputs', () => {
    expect(() => computeFlops(0, 1)).toThrow();
    expect(() => computeFlops(1, 0)).toThrow();
  });
});

describe('chinchillaOptimalSplit', () => {
  it('rejects non-positive budget', () => {
    expect(() => chinchillaOptimalSplit(0)).toThrow();
  });

  it('returns N, D, and loss; satisfies N · D · 6 ≈ C', () => {
    const C = 1e22;
    const { N, D, loss } = chinchillaOptimalSplit(C);
    expect(N).toBeGreaterThan(0);
    expect(D).toBeGreaterThan(0);
    expect(loss).toBeGreaterThan(CHINCHILLA_E);
    // Budget constraint: should be within ~1% (grid discretization)
    expect(6 * N * D).toBeCloseTo(C, -20);
  });

  it('larger budget → lower achievable loss', () => {
    const losses = [1e20, 1e22, 1e24].map(
      (C) => chinchillaOptimalSplit(C).loss,
    );
    expect(losses[1]!).toBeLessThan(losses[0]!);
    expect(losses[2]!).toBeLessThan(losses[1]!);
  });

  it('optimal N grows with budget', () => {
    const N1 = chinchillaOptimalSplit(1e21).N;
    const N2 = chinchillaOptimalSplit(1e23).N;
    const N3 = chinchillaOptimalSplit(1e25).N;
    expect(N2).toBeGreaterThan(N1);
    expect(N3).toBeGreaterThan(N2);
  });
});

describe('chinchillaTokensPerParam', () => {
  it('produces the expected ratio range at typical training budgets', () => {
    // With Hoffmann's Approach 3 constants, the actual ratio is
    // closer to 80-120 tokens/param at production budgets, not
    // the paper's headline 20. The lesson surfaces this fact
    // honestly. Test bounds: somewhere in the documented
    // "tens to hundreds" range.
    const ratio = chinchillaTokensPerParam(1e24);
    expect(ratio).toBeGreaterThan(10);
    expect(ratio).toBeLessThan(300);
  });

  it('grows with compute budget', () => {
    const r1 = chinchillaTokensPerParam(1e21);
    const r2 = chinchillaTokensPerParam(1e24);
    expect(r2).toBeGreaterThan(r1);
  });
});
