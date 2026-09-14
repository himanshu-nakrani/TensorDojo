/**
 * Root-mean-square layer normalization (Zhang & Sennrich, 2019).
 *
 * Drops the mean-subtraction step (and the learned shift β) from
 * LayerNorm, leaving only the magnitude normalization and the
 * learned scale γ:
 *   y = (x / RMS(x)) · γ,   RMS(x) = √(mean(x²) + ε)
 */

const DEFAULT_EPS = 1e-5;

/**
 * Compute the root mean square of a vector, with epsilon for
 * numerical safety inside the square root.
 */
export function rms(x: readonly number[], eps: number = DEFAULT_EPS): number {
  const n = x.length;
  if (n === 0) return Math.sqrt(eps);
  let sumSq = 0;
  for (let i = 0; i < n; i += 1) {
    const v = x[i] as number;
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / n + eps);
}

/**
 * RMS-normalize a single vector. `gamma` defaults to all-ones.
 */
export function rmsNorm(
  x: readonly number[],
  gamma?: readonly number[],
  eps: number = DEFAULT_EPS,
): number[] {
  const n = x.length;
  if (n === 0) return [];
  const denom = rms(x, eps);
  const g = gamma ?? new Array<number>(n).fill(1);
  if (g.length !== n) {
    throw new Error(
      `rmsNorm: gamma length must match x (got ${g.length} vs ${n})`,
    );
  }
  const out: number[] = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = ((x[i] as number) / denom) * (g[i] as number);
  }
  return out;
}
