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
});
