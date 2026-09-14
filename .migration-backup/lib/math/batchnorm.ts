/**
 * Batch normalization, in the form used in the conv/CNN era.
 *
 *   Forward (training, batch of N examples, F features per example):
 *
 *     μ_f     = (1/N) Σ_n x_{n,f}                  (per-feature batch mean)
 *     σ²_f    = (1/N) Σ_n (x_{n,f} − μ_f)²         (per-feature batch variance)
 *     x̂_{n,f} = (x_{n,f} − μ_f) / √(σ²_f + ε)    (normalize)
 *     y_{n,f} = γ_f x̂_{n,f} + β_f                (scale + shift, learned)
 *
 *   Running statistics (updated each training step, used at
 *   inference):
 *
 *     μ_running ← (1 − m) μ_running + m μ_f
 *     σ²_running ← (1 − m) σ²_running + m σ²_f
 *
 *   At inference, the running statistics are used (no batch is
 *   available). The classic footgun: if you accidentally use
 *   batch statistics at inference with batch size 1, the
 *   post-normalization output is zero for that one example.
 *   The lesson's secondary widget demonstrates this.
 *
 * The lesson uses batchnorm on an MLP (composes with what the
 * reader has). Real conv batchnorm is per (N, H, W) within a
 * single channel — not implemented here.
 */

/** Epsilon for the inverse-std. Standard value. */
export const DEFAULT_EPS = 1e-5;
/** Default momentum for the running-statistic update. */
export const DEFAULT_MOMENTUM = 0.1;

export interface BatchNormParams {
  /** Per-feature scale (γ). Shape (F,). */
  gamma: number[];
  /** Per-feature shift (β). Shape (F,). */
  beta: number[];
  /** Running mean (μ_running). Shape (F,). Mutated by the forward pass. */
  runningMean: number[];
  /** Running variance (σ²_running). Shape (F,). Mutated by the forward pass. */
  runningVar: number[];
}

export interface BatchNormResult {
  /** Normalized + scaled output. Shape (N, F). */
  y: number[][];
  /** Per-feature mean computed from this batch. Shape (F,). */
  batchMean: number[];
  /** Per-feature variance computed from this batch. Shape (F,). */
  batchVar: number[];
}

/**
 * Make a default BatchNormParams with γ = 1, β = 0, running
 * stats at 0 / 1 (which is the "pass-through" initialization
 * at inference time before any training has happened).
 */
export function defaultBNParams(nFeatures: number): BatchNormParams {
  return {
    gamma: new Array<number>(nFeatures).fill(1),
    beta: new Array<number>(nFeatures).fill(0),
    runningMean: new Array<number>(nFeatures).fill(0),
    runningVar: new Array<number>(nFeatures).fill(1),
  };
}

/**
 * Forward pass, training mode. Computes the per-feature batch
 * mean and variance, normalizes each example, then applies the
 * learned per-feature scale (γ) and shift (β). Mutates
 * `params.runningMean` and `params.runningVar` in place.
 */
export function batchNormForward(
  x: readonly (readonly number[])[],
  params: BatchNormParams,
  options?: { eps?: number; momentum?: number; training?: boolean },
): BatchNormResult {
  const eps = options?.eps ?? DEFAULT_EPS;
  const momentum = options?.momentum ?? DEFAULT_MOMENTUM;
  const training = options?.training ?? true;
  if (x.length === 0) {
    return { y: [], batchMean: [], batchVar: [] };
  }
  const n = x.length;
  const f = x[0]!.length;
  if (params.gamma.length !== f || params.beta.length !== f) {
    throw new Error(
      `batchNormForward: gamma/beta length (${params.gamma.length}/${params.beta.length}) does not match feature count (${f})`,
    );
  }
  if (params.runningMean.length !== f || params.runningVar.length !== f) {
    throw new Error(
      `batchNormForward: running stats length does not match feature count (${f})`,
    );
  }
  // Compute batch mean and variance.
  const mean = new Array<number>(f).fill(0);
  for (let i = 0; i < n; i += 1) {
    const row = x[i]!;
    for (let j = 0; j < f; j += 1) mean[j] = (mean[j] ?? 0) + (row[j] ?? 0);
  }
  for (let j = 0; j < f; j += 1) mean[j] = (mean[j] ?? 0) / n;
  const variance = new Array<number>(f).fill(0);
  for (let i = 0; i < n; i += 1) {
    const row = x[i]!;
    for (let j = 0; j < f; j += 1) {
      const d = (row[j] ?? 0) - (mean[j] ?? 0);
      variance[j] = (variance[j] ?? 0) + d * d;
    }
  }
  for (let j = 0; j < f; j += 1) variance[j] = (variance[j] ?? 0) / n;
  // Normalize + scale + shift.
  const y: number[][] = Array.from({ length: n }, () => new Array<number>(f).fill(0));
  for (let i = 0; i < n; i += 1) {
    const row = x[i]!;
    const out = y[i]!;
    for (let j = 0; j < f; j += 1) {
      const invStd = 1 / Math.sqrt((variance[j] ?? 0) + eps);
      const xHat = ((row[j] ?? 0) - (mean[j] ?? 0)) * invStd;
      out[j] = (params.gamma[j] ?? 1) * xHat + (params.beta[j] ?? 0);
    }
  }
  if (training) {
    // Update running stats: μ_running ← (1-m) μ_running + m μ_batch.
    for (let j = 0; j < f; j += 1) {
      params.runningMean[j] =
        (1 - momentum) * (params.runningMean[j] ?? 0) + momentum * (mean[j] ?? 0);
      params.runningVar[j] =
        (1 - momentum) * (params.runningVar[j] ?? 1) + momentum * (variance[j] ?? 0);
    }
  }
  return { y, batchMean: mean, batchVar: variance };
}

/**
 * Forward pass, inference mode. Uses the running mean and
 * variance (no batch normalization; the data point is normalized
 * against the running stats collected during training). The
 * `gamma` and `beta` learned scale/shift are still applied.
 */
export function batchNormInference(
  x: readonly (readonly number[])[],
  params: BatchNormParams,
  options?: { eps?: number },
): number[][] {
  const eps = options?.eps ?? DEFAULT_EPS;
  if (x.length === 0) return [];
  const f = x[0]!.length;
  const y: number[][] = Array.from({ length: x.length }, () => new Array<number>(f).fill(0));
  for (let i = 0; i < x.length; i += 1) {
    const row = x[i]!;
    const out = y[i]!;
    for (let j = 0; j < f; j += 1) {
      const invStd = 1 / Math.sqrt((params.runningVar[j] ?? 1) + eps);
      const xHat = ((row[j] ?? 0) - (params.runningMean[j] ?? 0)) * invStd;
      out[j] = (params.gamma[j] ?? 1) * xHat + (params.beta[j] ?? 0);
    }
  }
  return y;
}
