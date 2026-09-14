/**
 * Numerically stable softmax.
 *
 * softmax_i(x, T) = exp(x_i / T) / sum_j exp(x_j / T)
 *
 * Subtracting the max before exponentiating keeps the largest exponent at 0
 * (exp(0) = 1) so the operation never overflows regardless of input scale.
 * The result is unchanged because dividing numerator and denominator by the
 * same constant leaves the ratio intact.
 *
 * @param scores      Real-valued input vector.
 * @param temperature Divisor applied before exponentiating. Lower T sharpens,
 *                    higher T flattens. Must be > 0. Default 1.
 * @returns           Probability distribution: non-negative, sums to 1.
 */
export function softmax(scores: readonly number[], temperature = 1): number[] {
  if (!Number.isFinite(temperature) || temperature <= 0) {
    throw new Error(`temperature must be a positive finite number (got ${temperature})`);
  }
  const n = scores.length;
  if (n === 0) return [];

  const scaled = new Array<number>(n);
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = (scores[i] as number) / temperature;
    scaled[i] = v;
    if (v > max) max = v;
  }

  let sum = 0;
  const exps = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const e = Math.exp((scaled[i] as number) - max);
    exps[i] = e;
    sum += e;
  }

  if (sum === 0) {
    // Pathological: all scaled values were -Infinity. Return uniform.
    return new Array<number>(n).fill(1 / n);
  }

  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    out[i] = (exps[i] as number) / sum;
  }
  return out;
}

/** Index of the maximum-probability entry. Returns -1 for empty input. */
export function argmax(xs: readonly number[]): number {
  if (xs.length === 0) return -1;
  let bestIdx = 0;
  let bestVal = xs[0] as number;
  for (let i = 1; i < xs.length; i++) {
    const v = xs[i] as number;
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Apply softmax row-wise to a 2D matrix. Rows may have different lengths. */
export function softmaxRows(
  rows: readonly (readonly number[])[],
  temperature = 1,
): number[][] {
  return rows.map((r) => softmax(r, temperature));
}
