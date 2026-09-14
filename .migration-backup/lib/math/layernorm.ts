/**
 * Layer normalization (Ba et al., 2016).
 *
 * For an input vector x, the affine transform is
 *   y = ((x − μ) / √(σ² + ε)) · γ + β
 * where μ and σ² are the mean and variance of x's components, and
 * γ, β are learned (here, defaults to 1 and 0).
 */

const DEFAULT_EPS = 1e-5;

/**
 * Layer-normalize a single token's vector. Returns a new vector.
 * `gamma` defaults to all-ones; `beta` defaults to all-zeros.
 */
export function layerNorm(
  x: readonly number[],
  gamma?: readonly number[],
  beta?: readonly number[],
  eps: number = DEFAULT_EPS,
): number[] {
  const n = x.length;
  if (n === 0) return [];
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += x[i] as number;
  const mean = sum / n;
  let varSum = 0;
  for (let i = 0; i < n; i += 1) {
    const d = (x[i] as number) - mean;
    varSum += d * d;
  }
  const variance = varSum / n;
  const std = Math.sqrt(variance + eps);
  const g = gamma ?? new Array<number>(n).fill(1);
  const b = beta ?? new Array<number>(n).fill(0);
  if (g.length !== n || b.length !== n) {
    throw new Error(
      `layerNorm: gamma/beta length must match x (got ${g.length}/${b.length} vs ${n})`,
    );
  }
  const out: number[] = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = ((x[i] as number - mean) / std) * (g[i] as number) + (b[i] as number);
  }
  return out;
}

/** Layer-normalize a batch of token vectors. */
export function layerNormBatch(
  xs: readonly (readonly number[])[],
  gamma?: readonly number[],
  beta?: readonly number[],
  eps: number = DEFAULT_EPS,
): number[][] {
  return xs.map((x) => layerNorm(x, gamma, beta, eps));
}
