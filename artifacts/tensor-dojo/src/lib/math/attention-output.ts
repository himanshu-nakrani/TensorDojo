/**
 * Attention output: the weighted sum of value vectors.
 *
 * For each query position i, the attention output is:
 *   out[i] = sum_j W[i][j] * V[j]
 *
 * where W is the row-stochastic weight matrix (post-softmax) and
 * V is the matrix of value vectors. This is the "what each
 * token actually receives" step in self-attention — the score
 * matrix tells us *who attends to whom*, the weight matrix turns
 * scores into allocations, and this function executes the
 * allocation.
 *
 * Bookend cases used in the lesson:
 * - If W is a one-hot row (W[i][k] = 1, all others 0), then
 *   out[i] = V[k] — the row collapses to a single V.
 * - If W is uniform (W[i][j] = 1/n), then out[i] = mean(V) —
 *   every row is the centroid of the values.
 */

import { matMul } from './linalg';
import { softmaxRows } from './softmax';

/**
 * Compute the attention output. Returns a new matrix of shape
 * [n, d] where n is the number of queries and d is the value
 * dimension.
 *
 * Both W and V are passed in; the caller is responsible for
 * having applied softmax (rows of W must sum to 1) and having
 * applied the causal mask if any (rows of W may have trailing
 * zeros, which is fine).
 */
export function attentionOutput(
  W: readonly (readonly number[])[],
  V: readonly (readonly number[])[],
): number[][] {
  const n = W.length;
  if (n === 0) return [];
  if (V.length !== n) {
    throw new Error(
      `attentionOutput: W and V must have the same length (got ${W.length} vs ${V.length})`,
    );
  }
  return matMul(W, V);
}

/**
 * Convenience: full attention output from raw scores + V. This
 * is the production-shape helper — it scales the scores by
 * 1/√d_k, applies an optional causal mask, row-softmaxes, then
 * computes the weighted sum. Tests cover the bookend cases
 * (one-hot W, uniform W) by calling the lower-level
 * `attentionOutput` with the relevant W.
 */
export interface AttentionForwardInput {
  scores: readonly (readonly number[])[];
  V: readonly (readonly number[])[];
  /** d_k for the 1/√d_k scaling. */
  dK: number;
  /** Optional causal mask. */
  mask?: readonly (readonly number[])[] | null;
  /** Softmax temperature. Default 1. */
  temperature?: number;
}

export function attentionForward(input: AttentionForwardInput): number[][] {
  const { scores, V, dK, mask, temperature = 1 } = input;
  const n = scores.length;
  if (n === 0) return [];
  // Scale by 1/√d_k
  const scale = 1 / Math.sqrt(dK);
  const divided = scores.map((row) => row.map((v) => v * scale));
  // Apply mask (additive): mask[i][j] = 0 means "keep", -∞ means "block"
  const masked = mask
    ? divided.map((row, i) =>
        row.map((v, j) => (mask[i]![j] === 0 ? v : Number.NEGATIVE_INFINITY)),
      )
    : divided;
  const W = softmaxRows(masked, temperature);
  return attentionOutput(W, V);
}
