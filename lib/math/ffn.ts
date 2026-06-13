/**
 * Position-wise feed-forward network (FFN) used inside a transformer block.
 *
 * For each token vector x in R^d, the FFN computes
 *   ffn(x) = W2 · (gelu(W1 · x + b1)) + b2
 * with W1 ∈ R^{d × d_ff}, W2 ∈ R^{d_ff × d}.
 *
 * Convention: d_ff = 4 * d (Vaswani et al., 2017). The FFN is applied
 * to each token independently — there is no cross-token interaction here.
 * Attention is the cross-token step; the FFN is the per-token "thinking"
 * step.
 */

import { matMul } from './linalg';

/**
 * Error function approximation (Abramowitz & Stegun 7.1.26).
 * Max error ~1.5e-7, more than enough for the lesson's GELU values.
 */
function erf(x: number): number {
  // Constants for the rational approximation.
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Exact GELU activation. */
export function gelu(x: number): number {
  return 0.5 * x * (1 + erf(x / Math.SQRT2));
}

export interface FFNInput {
  /** Token activations of shape [T, d]. */
  x: readonly (readonly number[])[];
  /** First linear layer: d → d_ff. Shape [d, d_ff]. */
  W1: readonly (readonly number[])[];
  /** First-layer bias. Shape [d_ff]. */
  b1: readonly number[];
  /** Second linear layer: d_ff → d. Shape [d_ff, d]. */
  W2: readonly (readonly number[])[];
  /** Second-layer bias. Shape [d]. */
  b2: readonly number[];
}

/**
 * Run the FFN position-wise. Returns a new [T, d] matrix. Each token
 * is transformed independently.
 *
 * Layout: W1[i] is a row of length d_ff; W1[i][k] is the weight from
 * input dim i to hidden dim k. Similarly for W2.
 */
export function ffn(input: FFNInput): number[][] {
  const { x, W1, b1, W2, b2 } = input;
  const T = x.length;
  if (T === 0) return [];

  const d = x[0]!.length;
  if (W1.length !== d) {
    throw new Error(`ffn: W1 must have ${d} rows (got ${W1.length})`);
  }
  const dFf = W1[0]!.length;
  if (b1.length !== dFf) {
    throw new Error(`ffn: b1 length must be ${dFf} (got ${b1.length})`);
  }
  if (W2.length !== dFf) {
    throw new Error(`ffn: W2 must have ${dFf} rows (got ${W2.length})`);
  }
  if ((W2[0] ?? []).length !== d) {
    throw new Error(
      `ffn: W2 must be ${dFf}×${d} (got ${W2.length}×${W2[0]?.length ?? 0})`,
    );
  }
  if (b2.length !== d) {
    throw new Error(`ffn: b2 length must be ${d} (got ${b2.length})`);
  }

  const out: number[][] = Array.from({ length: T }, () =>
    new Array<number>(d).fill(0),
  );

  for (let t = 0; t < T; t += 1) {
    const xt = x[t]!;
    // hidden = gelu(xt @ W1 + b1)   (xt is 1×d, W1 is d×d_ff, hidden is 1×d_ff)
    // xt @ W1 is implemented as a single row of matMul: matMul([xt], W1) returns 1×d_ff.
    const xtRow: number[][] = [xt as number[]];
    const linear1 = matMul(xtRow, W1);
    for (let k = 0; k < dFf; k += 1) {
      const v = linear1[0]![k]! + b1[k]!;
      linear1[0]![k] = gelu(v);
    }
    // out[t] = hidden @ W2 + b2
    const linear2 = matMul(linear1, W2);
    for (let k = 0; k < d; k += 1) {
      out[t]![k] = linear2[0]![k]! + b2[k]!;
    }
  }
  return out;
}
