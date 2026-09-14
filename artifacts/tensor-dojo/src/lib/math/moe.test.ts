import { describe, expect, it } from 'vitest';
import {
  activeFlopsRatio,
  loadBalance,
  routeTokens,
  totalParamsRatio,
} from './moe';

describe('routeTokens', () => {
  it('returns empty result for empty input', () => {
    const r = routeTokens([], 2);
    expect(r.expertAssignments).toEqual([]);
    expect(r.weights).toEqual([]);
  });

  it('rejects topK out of range', () => {
    expect(() => routeTokens([[1, 2, 3]], 0)).toThrow();
    expect(() => routeTokens([[1, 2, 3]], 4)).toThrow();
  });

  it('rejects ragged input rows', () => {
    expect(() =>
      routeTokens(
        [
          [1, 2, 3],
          [1, 2],
        ],
        1,
      ),
    ).toThrow();
  });

  it('top-1 routing picks the argmax expert', () => {
    const logits = [
      [3, 1, 2],
      [0.1, 5, 0.2],
      [2, 2, 9],
    ];
    const r = routeTokens(logits, 1);
    expect(r.expertAssignments).toEqual([[0], [1], [2]]);
    for (const w of r.weights) {
      expect(w[0]!).toBeCloseTo(1, 9);
    }
  });

  it('top-k weights sum to 1 per token', () => {
    const logits = [
      [1, 2, 3, 4],
      [4, 3, 2, 1],
      [0, 0, 0, 0],
    ];
    for (const k of [1, 2, 3]) {
      const r = routeTokens(logits, k);
      for (const w of r.weights) {
        expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
        expect(w).toHaveLength(k);
      }
    }
  });

  it('Mixtral config (8 experts, top-2) picks the right two', () => {
    const logits = [Array.from({ length: 8 }, (_, i) => (i === 3 ? 5 : i === 6 ? 4 : 0))];
    const r = routeTokens(logits, 2);
    expect(r.expertAssignments[0]).toEqual([3, 6]);
    // Weights are softmax(5, 4) renormalized: [e^5/(e^5+e^4), e^4/(e^5+e^4)]
    // ≈ [0.731, 0.269]
    expect(r.weights[0]![0]!).toBeGreaterThan(0.7);
    expect(r.weights[0]![1]!).toBeLessThan(0.3);
  });
});

describe('loadBalance', () => {
  it('perfectly balanced assignments have imbalance 1', () => {
    // 4 experts, 4 tokens, top-1, one token per expert.
    const assignments = [[0], [1], [2], [3]];
    const r = loadBalance(assignments, 4);
    expect(r.imbalance).toBeCloseTo(1, 9);
    expect(r.perExpertLoad).toEqual([1, 1, 1, 1]);
  });

  it('expert collapse → high imbalance', () => {
    // All 8 tokens routed to expert 0.
    const assignments = Array.from({ length: 8 }, () => [0]);
    const r = loadBalance(assignments, 4);
    // mean = 8/4 = 2; max = 8; imbalance = 4.
    expect(r.imbalance).toBe(4);
  });

  it('rejects out-of-range expert indices', () => {
    expect(() => loadBalance([[5]], 4)).toThrow();
  });

  it('handles empty assignments', () => {
    const r = loadBalance([], 4);
    expect(r.imbalance).toBe(1);
    expect(r.perExpertLoad).toEqual([0, 0, 0, 0]);
  });
});

describe('activeFlopsRatio', () => {
  it('Mixtral (8 experts, top-2) is 0.25', () => {
    expect(activeFlopsRatio(8, 2)).toBe(0.25);
  });

  it('top-k = nExperts (dense) is 1.0', () => {
    expect(activeFlopsRatio(8, 8)).toBe(1);
  });

  it('rejects invalid configs', () => {
    expect(() => activeFlopsRatio(8, 9)).toThrow();
    expect(() => activeFlopsRatio(0, 1)).toThrow();
  });
});

describe('totalParamsRatio', () => {
  it('scales linearly with nExperts', () => {
    expect(totalParamsRatio(8)).toBe(8);
    expect(totalParamsRatio(64)).toBe(64);
  });

  it('Mixtral has 8× the FFN params of a single-expert baseline', () => {
    expect(totalParamsRatio(8)).toBe(8);
  });

  it('rejects nExperts < 1', () => {
    expect(() => totalParamsRatio(0)).toThrow();
  });
});
