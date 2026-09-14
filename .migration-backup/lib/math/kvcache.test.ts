import { describe, expect, it } from 'vitest';
import { cacheBytes, generateNaive, generateWithCache } from './kvcache';

describe('generateNaive', () => {
  it('rejects seqLen < 1', () => {
    expect(() => generateNaive(0, 64)).toThrow();
    expect(() => generateNaive(-1, 64)).toThrow();
  });

  it('rejects dModel < 1', () => {
    expect(() => generateNaive(4, 0)).toThrow();
  });

  it('produces seqLen entries with strictly increasing cost', () => {
    const r = generateNaive(5, 16);
    expect(r.perStepFLOPs).toHaveLength(5);
    for (let i = 1; i < r.perStepFLOPs.length; i++) {
      expect(r.perStepFLOPs[i]!).toBeGreaterThan(r.perStepFLOPs[i - 1]!);
    }
  });

  it('per-step costs sum to total', () => {
    const r = generateNaive(7, 32);
    const sum = r.perStepFLOPs.reduce((a, b) => a + b, 0);
    expect(r.total).toBe(sum);
  });

  it('step 1 cost matches formula 3d² + 2d', () => {
    const d = 8;
    const r = generateNaive(1, d);
    expect(r.perStepFLOPs[0]!).toBe(3 * d * d + 2 * d);
  });
});

describe('generateWithCache', () => {
  it('rejects seqLen < 1', () => {
    expect(() => generateWithCache(0, 64)).toThrow();
  });

  it('step 1 cost equals naive step 1 cost', () => {
    // At t=1 there is no prior cache to exploit; both regimes do
    // the same work.
    const d = 16;
    const cached = generateWithCache(1, d);
    const naive = generateNaive(1, d);
    expect(cached.perStepFLOPs[0]!).toBe(naive.perStepFLOPs[0]!);
  });

  it('per-step cost grows linearly in t (constant first difference)', () => {
    const d = 32;
    const r = generateWithCache(6, d);
    const diffs: number[] = [];
    for (let i = 1; i < r.perStepFLOPs.length; i++) {
      diffs.push(r.perStepFLOPs[i]! - r.perStepFLOPs[i - 1]!);
    }
    // Each subsequent step adds exactly 2·d FLOPs (one extra
    // cache row to attend to, in both score and output projections).
    for (const diff of diffs) {
      expect(diff).toBe(2 * d);
    }
  });

  it('per-step costs sum to total', () => {
    const r = generateWithCache(9, 24);
    const sum = r.perStepFLOPs.reduce((a, b) => a + b, 0);
    expect(r.total).toBe(sum);
  });
});

describe('cache vs naive scaling', () => {
  it('cached total is strictly less than naive for seqLen > 1', () => {
    const d = 64;
    for (const n of [2, 4, 16, 64]) {
      const cached = generateWithCache(n, d);
      const naive = generateNaive(n, d);
      expect(cached.total).toBeLessThan(naive.total);
    }
  });

  it('speedup ratio grows with sequence length', () => {
    const d = 64;
    const ratios = [4, 16, 64, 256].map((n) => {
      const cached = generateWithCache(n, d);
      const naive = generateNaive(n, d);
      return naive.total / cached.total;
    });
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]!).toBeGreaterThan(ratios[i - 1]!);
    }
  });

  it('asymptotic ratio approaches ~n (naive is one polynomial degree higher)', () => {
    // Naive is O(n³·d), cached is O(n²·d) for the dominant term
    // when n ≫ d. Pick n ≫ d so the d² overhead in cached is
    // dwarfed by the n·d term.
    const d = 8;
    const n = 1024;
    const cached = generateWithCache(n, d);
    const naive = generateNaive(n, d);
    const ratio = naive.total / cached.total;
    // For these parameters the ratio should be > 30 — far from
    // the t=1 ratio of ~1.
    expect(ratio).toBeGreaterThan(30);
  });
});

describe('cacheBytes', () => {
  it('rejects bad inputs', () => {
    expect(() => cacheBytes(-1, 64, 32, 2)).toThrow();
    expect(() => cacheBytes(8, 0, 32, 2)).toThrow();
    expect(() => cacheBytes(8, 64, 0, 2)).toThrow();
    expect(() => cacheBytes(8, 64, 32, 0)).toThrow();
  });

  it('returns 0 for seqLen=0', () => {
    expect(cacheBytes(0, 64, 32, 2)).toBe(0);
  });

  it('matches the 2 · n · d · L · b formula', () => {
    // GPT-3 175B-ish: d=12288, L=96, bf16 (b=2), context 2048.
    // Cache should be ≈ 9.7 GB.
    const bytes = cacheBytes(2048, 12288, 96, 2);
    expect(bytes).toBe(2 * 2048 * 12288 * 96 * 2);
    const gb = bytes / 1024 ** 3;
    expect(gb).toBeGreaterThan(8);
    expect(gb).toBeLessThan(12);
  });

  it('scales linearly in seqLen', () => {
    const a = cacheBytes(1024, 4096, 32, 2);
    const b = cacheBytes(2048, 4096, 32, 2);
    expect(b).toBe(2 * a);
  });
});
