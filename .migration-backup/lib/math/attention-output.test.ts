import { describe, expect, it } from 'vitest';
import { attentionForward, attentionOutput } from './attention-output';
import { softmaxRows } from './softmax';
import { causalMask } from './mask';

describe('attentionOutput', () => {
  it('returns the right shape [n, d]', () => {
    // n=3, d=2: each row of W is a probability distribution over 3
    // keys; V is 3x2. Output is 3x2.
    const W = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const V = [
      [1, 1],
      [2, 2],
      [3, 3],
    ];
    const out = attentionOutput(W, V);
    expect(out.length).toBe(3);
    for (const row of out) expect(row.length).toBe(2);
  });

  it('one-hot W collapses each row to the corresponding V', () => {
    const W = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const V = [
      [10, 20],
      [30, 40],
      [50, 60],
    ];
    const out = attentionOutput(W, V);
    expect(out[0]).toEqual([10, 20]);
    expect(out[1]).toEqual([30, 40]);
    expect(out[2]).toEqual([50, 60]);
  });

  it('uniform W gives the centroid of V for every row', () => {
    // 3 values; uniform W means each row is mean(V).
    // W must be 3x3 (n=3 queries, each row a distribution over n=3 keys).
    const W = [
      [1 / 3, 1 / 3, 1 / 3],
      [1 / 3, 1 / 3, 1 / 3],
      [1 / 3, 1 / 3, 1 / 3],
    ];
    const V = [
      [3, 0],
      [0, 3],
      [0, 0],
    ];
    // Centroid = (1, 1).
    const out = attentionOutput(W, V);
    expect(out[0]).toEqual([1, 1]);
    expect(out[1]).toEqual([1, 1]);
    expect(out[2]).toEqual([1, 1]);
  });

  it('single-row correctness: row i of W is a weighted sum of V', () => {
    // row 0 of W is (0.6, 0.4, 0); output[0] = 0.6*V[0] + 0.4*V[1].
    // n=3, d=3.
    const W = [
      [0.6, 0.4, 0],
      [1, 0, 0],
      [0, 0, 1],
    ];
    const V = [
      [1, 2, 3],
      [10, 20, 30],
      [100, 200, 300],
    ];
    const out = attentionOutput(W, V);
    expect(out[0]![0]).toBeCloseTo(0.6 * 1 + 0.4 * 10, 10);
    expect(out[0]![1]).toBeCloseTo(0.6 * 2 + 0.4 * 20, 10);
    expect(out[0]![2]).toBeCloseTo(0.6 * 3 + 0.4 * 30, 10);
    expect(out[1]).toEqual([1, 2, 3]);
    expect(out[2]).toEqual([100, 200, 300]);
  });

  it('handles empty W', () => {
    const out = attentionOutput([], []);
    expect(out).toEqual([]);
  });

  it('throws on W/V length mismatch', () => {
    // W is 2x2, V is 3x2. Different number of rows.
    expect(() =>
      attentionOutput(
        [
          [1, 0],
          [0, 1],
        ],
        [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      ),
    ).toThrow(/same length/);
  });
});

describe('attentionForward', () => {
  it('integrates softmax + mask + W·V end to end', () => {
    // 2 tokens. Scores: 2x2, all positive.
    const scores = [
      [1, 2],
      [2, 1],
    ];
    const V = [
      [10, 20],
      [30, 40],
    ];
    const dK = 1; // scale = 1
    const out = attentionForward({ scores, V, dK });
    expect(out.length).toBe(2);
    for (const row of out) expect(row.length).toBe(2);
    // The dominant V gets most of the mass: row 0 prefers V[1] (score 2 > 1)
    // so out[0] should be closer to V[1] than V[0].
    expect(out[0]![0]).toBeGreaterThan(20);
  });

  it('applies the causal mask: row i cannot see V[j] for j > i', () => {
    // 3 tokens, scores all 1.0 — without mask, each row is uniform
    // mean(V). With causal mask, row 0 only sees V[0], row 1 sees
    // mean(V[0:2]), row 2 sees mean(V[0:3]).
    const scores = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    const V = [
      [10, 0],
      [20, 0],
      [30, 0],
    ];
    const mask = causalMask(3);
    const out = attentionForward({ scores, V, dK: 1, mask });
    // row 0: only V[0] → (10, 0)
    expect(out[0]).toEqual([10, 0]);
    // row 1: mean(V[0], V[1]) = (15, 0)
    expect(out[1]).toEqual([15, 0]);
    // row 2: mean(V[0..2]) = (20, 0)
    expect(out[2]).toEqual([20, 0]);
  });

  it('temperature T→0 collapses W to argmax, then output is that V', () => {
    // n=3, d=2. Each row of W ends up one-hot at the argmax score.
    const scores = [
      [0, 10, 0],
      [0, 0, 10],
      [10, 0, 0],
    ];
    const V = [
      [1, 1],
      [2, 2],
      [3, 3],
    ];
    const out = attentionForward({ scores, V, dK: 1, temperature: 0.1 });
    // row 0: argmax is j=1, output ≈ V[1]
    expect(out[0]![0]).toBeCloseTo(2, 4);
    // row 1: argmax is j=2, output ≈ V[2]
    expect(out[1]![0]).toBeCloseTo(3, 4);
    // row 2: argmax is j=0, output ≈ V[0]
    expect(out[2]![0]).toBeCloseTo(1, 4);
  });

  it('produces identical results whether called via the high-level or low-level', () => {
    // attentionOutput(W, V) where W = softmax(scores * scale) is the
    // same as attentionForward.
    const scores = [
      [1, 0.5, 0.1],
      [0.5, 1, 2],
      [0, 1, 1.5],
    ];
    const V = [
      [1, 0],
      [0, 1],
      [1, 1],
    ];
    const dK = 4;
    const scale = 1 / Math.sqrt(dK);
    const W = softmaxRows(
      scores.map((row) => row.map((v) => v * scale)),
    );
    const direct = attentionOutput(W, V);
    const forward = attentionForward({ scores, V, dK });
    expect(forward).toEqual(direct);
  });
});
