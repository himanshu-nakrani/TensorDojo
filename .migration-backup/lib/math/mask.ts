/**
 * Causal attention mask. For a sequence of length n, position i is
 * allowed to attend to positions 0..=i (inclusive) and forbidden to
 * attend to positions i+1..n-1.
 *
 * The mask is an n×n matrix of 0s and -Infinity (or any sufficiently
 * large negative number that, after exp() in softmax, becomes 0).
 */

export const NEG_INF = Number.NEGATIVE_INFINITY;

/**
 * Build the n×n causal mask. `mask[i][j] = 0` if j ≤ i (allowed),
 * `NEG_INF` otherwise (forbidden).
 */
export function causalMask(n: number): number[][] {
  const out: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(NEG_INF),
  );
  for (let i = 0; i < n; i += 1) {
    const row = out[i]!;
    for (let j = 0; j <= i; j += 1) {
      row[j] = 0;
    }
  }
  return out;
}

/**
 * Apply a mask in-place. The mask uses 0 for "keep" and a sentinel
 * (default `NEG_INF`) for "block". Returns a new matrix.
 */
export function applyMask(
  scores: readonly (readonly number[])[],
  mask: readonly (readonly number[])[],
  blockValue: number = NEG_INF,
): number[][] {
  return scores.map((row, i) =>
    row.map((v, j) => (mask[i]![j] === 0 ? v : blockValue)),
  );
}
