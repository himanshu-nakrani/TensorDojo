import { describe, expect, it } from 'vitest';
import { NEG_INF, applyMask, causalMask } from './mask';

describe('causalMask', () => {
  it('is lower-triangular inclusive of the diagonal', () => {
    const m = causalMask(4);
    expect(m[0]).toEqual([0, NEG_INF, NEG_INF, NEG_INF]);
    expect(m[1]).toEqual([0, 0, NEG_INF, NEG_INF]);
    expect(m[2]).toEqual([0, 0, 0, NEG_INF]);
    expect(m[3]).toEqual([0, 0, 0, 0]);
  });

  it('handles edge cases n=0 and n=1', () => {
    expect(causalMask(0)).toEqual([]);
    expect(causalMask(1)).toEqual([[0]]);
  });
});

describe('applyMask', () => {
  it('keeps values where the mask is 0, sets the rest to blockValue', () => {
    const scores = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const m = causalMask(2);
    const out = applyMask(scores, m);
    expect(out[0]).toEqual([1, NEG_INF, NEG_INF]);
    expect(out[1]).toEqual([4, 5, NEG_INF]);
  });

  it('accepts a custom block value', () => {
    const scores = [[1, 2]];
    const m = [[0, NEG_INF]];
    expect(applyMask(scores, m, -1e9)).toEqual([[1, -1e9]]);
  });
});
