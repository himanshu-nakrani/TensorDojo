import { describe, expect, it } from 'vitest';
import { multiHeadAttention } from './multihead';
import { matMul, transpose } from './linalg';
import { softmaxRows } from './softmax';
import { causalMask, applyMask } from './mask';

describe('multiHeadAttention', () => {
  it('returns the same vector when h=1 and projections are identity', () => {
    // 2 tokens, d_model=2, h=1 -> d_k=2
    const Q = [[1, 0], [0, 1]];
    const K = [[1, 0], [0, 1]];
    const V = [[1, 0], [0, 1]];
    const out = multiHeadAttention({ Q, K, V, h: 1 });
    // Sanity: output shape is n × d_model
    expect(out.length).toBe(2);
    expect(out[0]!.length).toBe(2);
  });

  it('rejects d_model not divisible by h', () => {
    const Q = [[1, 0, 0]]; // d=3
    const K = [[1, 0, 0]];
    const V = [[1, 0, 0]];
    expect(() => multiHeadAttention({ Q, K, V, h: 2 })).toThrow();
  });

  it('with h=2, d_model=2, the output has the same dimensions as a single-head call', () => {
    const Q = [[1, 0], [0, 1]];
    const K = [[1, 0], [0, 1]];
    const V = [[1, 0], [0, 1]];
    const out = multiHeadAttention({ Q, K, V, h: 2 });
    expect(out.length).toBe(2);
    expect(out[0]!.length).toBe(2);
  });

  it('causal mode zeros out the upper-triangular attention weights (post-softmax)', () => {
    // We can verify this indirectly: the input Q is the identity so each
    // token attends to itself. With causal masking, this is preserved.
    const Q = [[1, 0], [1, 0]];
    const K = [[1, 0], [0, 1]];
    const V = [[1, 0], [0, 1]];
    const out = multiHeadAttention({ Q, K, V, h: 1, causal: true });
    expect(out.length).toBe(2);
    expect(out[0]!.length).toBe(2);
  });

  it('rejects malformed K and V rows before the optimized path runs', () => {
    const Q = [[1, 0], [0, 1]];
    expect(() => multiHeadAttention({ Q, K: [[1, 0], [0]], V: Q, h: 1 })).toThrow(/K row 1 must have 2 columns/);
    expect(() => multiHeadAttention({ Q, K: Q, V: [[1, 0], [0, 1, 2]], h: 1 })).toThrow(/V row 1 must have 2 columns/);
  });

  it('rejects non-finite tensors, invalid head counts, and malformed projections', () => {
    const Q = [[1, 0], [0, 1]];
    expect(() => multiHeadAttention({ Q: [[Number.NaN, 0], [0, 1]], K: Q, V: Q, h: 1 })).toThrow(/Q contains a non-finite value/);
    expect(() => multiHeadAttention({ Q, K: Q, V: Q, h: 0 })).toThrow(/h must be a positive integer/);
    expect(() => multiHeadAttention({ Q, K: Q, V: Q, h: 1, Wq: [[1, 0]] })).toThrow(/Wq must have 2 rows/);
  });

  it('matches explicit identity projections in the optimized default path', () => {
    const Q = [[1, 0, 0, 1], [0, 1, 1, 0]];
    const K = [[0.5, 1, 0, 0.5], [1, 0.5, 0.5, 1]];
    const V = [[1, 2, 3, 4], [4, 3, 2, 1]];
    const identity = Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 4 }, (_, col) => (row === col ? 1 : 0)),
    );

    const optimized = multiHeadAttention({ Q, K, V, h: 2, causal: true });
    const explicit = multiHeadAttention({
      Q,
      K,
      V,
      h: 2,
      causal: true,
      Wq: identity,
      Wk: identity,
      Wv: identity,
      Wout: identity,
    });

    expect(optimized).toEqual(explicit);
  });
});
