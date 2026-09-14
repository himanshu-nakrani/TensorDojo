import { describe, expect, it } from 'vitest';
import { ffn, gelu } from './ffn';

describe('gelu', () => {
  it('is exactly 0 at x=0', () => {
    expect(gelu(0)).toBeCloseTo(0, 6);
  });

  it('is positive for positive x', () => {
    expect(gelu(1)).toBeGreaterThan(0);
    expect(gelu(2)).toBeGreaterThan(0);
    expect(gelu(0.5)).toBeGreaterThan(0);
  });

  it('does not zero negatives the way ReLU does', () => {
    // GELU is not ReLU: for x = -2, GELU is small-negative (~-0.046),
    // not zero. This is the key difference — GELU lets a small
    // negative signal through, which is what makes the FFN
    // "thinking" step differentiable at zero.
    const v = gelu(-2);
    expect(v).toBeLessThan(0);
    expect(Math.abs(v)).toBeLessThan(0.1);
    expect(Math.abs(v)).toBeGreaterThan(0.01);
  });

  it('matches the closed-form for moderate x', () => {
    // gelu(1) = 0.5 * 1 * (1 + erf(1/sqrt(2)))
    //        = 0.5 * (1 + erf(0.7071...))
    //        ≈ 0.5 * (1 + 0.6827)
    //        ≈ 0.8413
    expect(gelu(1)).toBeCloseTo(0.8413, 3);
  });
});

describe('ffn', () => {
  // A simple identity-ish FFN: d=2, d_ff=4, W1 maps to a 4-wide
  // intermediate that passes through GELU, W2 maps back.
  const d = 2;
  const dFf = 4;
  const W1: number[][] = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
  ];
  const W2: number[][] = [
    [1, 0],
    [1, 0],
    [0, 1],
    [0, 1],
  ];
  const b1 = [0, 0, 0, 0];
  const b2 = [0, 0];

  it('returns the right shape [T, d]', () => {
    const x = [
      [1, 0],
      [0, 1],
      [1, 1],
    ];
    const out = ffn({ x, W1, b1, W2, b2 });
    expect(out.length).toBe(3);
    expect(out[0]!.length).toBe(2);
    expect(out[1]!.length).toBe(2);
    expect(out[2]!.length).toBe(2);
  });

  it('with zero weights the output equals b2 for any input', () => {
    const x = [[1, 2], [3, 4], [-1, 0]];
    const zeroW1: number[][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const zeroW2: number[][] = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    const out = ffn({ x, W1: zeroW1, b1, W2: zeroW2, b2: [0.5, -0.5] });
    for (const row of out) {
      expect(row[0]).toBeCloseTo(0.5, 10);
      expect(row[1]).toBeCloseTo(-0.5, 10);
    }
  });

  it('with zero bias, gelu(0) = 0 zeroing half of d_ff still gives a valid output', () => {
    // W1 maps [1, 0] → [gelu(1), gelu(0), 0, 0]. W2 sums into out[0].
    // gelu(0) = 0, so half the channels contribute nothing; the
    // output is still a real vector.
    const x = [[1, 0]];
    const out = ffn({ x, W1, b1, W2, b2 });
    // hidden = [gelu(1), gelu(0), 0, 0]  (xt @ W1 = [1, 0, 0, 0])
    // out = hidden @ W2 = [gelu(1) * 1 + gelu(0) * 1 + 0 + 0,
    //                     gelu(1) * 0 + gelu(0) * 0 + 0 + 0]
    //     = [gelu(1), 0]
    expect(out[0]![0]).toBeCloseTo(gelu(1), 5);
    expect(out[0]![1]).toBeCloseTo(0, 6);
  });

  it('is position-wise: token t depends only on row t of x', () => {
    const x = [
      [1, 0],
      [1, 0],
    ];
    const out = ffn({ x, W1, b1, W2, b2 });
    expect(out[0]).toEqual(out[1]);
  });

  it('throws on shape mismatch', () => {
    const x = [[1, 0]];
    const badW1: number[][] = [[1, 0, 0]]; // 1×3 instead of 2×4
    expect(() => ffn({ x, W1: badW1, b1, W2, b2 })).toThrow();
  });

  it('handles empty token batch', () => {
    const out = ffn({ x: [], W1, b1, W2, b2 });
    expect(out).toEqual([]);
  });
});
