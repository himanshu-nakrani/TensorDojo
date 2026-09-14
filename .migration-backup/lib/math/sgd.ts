/**
 * Stochastic gradient descent over a small dataset.
 *
 * The previous lessons worked with the *toy 2D loss* from
 * `gradient-descent.ts`. This module is the bridge from that
 * toy into a real dataset: many examples, each contributing a
 * (slightly different) loss, and the gradient at each step is
 * the *average* gradient over a sampled batch.
 *
 *   full-batch  : use the entire dataset; smooth, slow per step.
 *   mini-batch  : sample B examples; mild noise, decent throughput.
 *   one-sample  : sample a single example; very noisy, fast per step.
 *
 * The lesson exercises all three on a synthetic 2D regression
 * task: f(x, y) = sin(2x) · cos(2y), 30 noisy samples. The
 * lesson's centerpiece compares trajectories of full-batch vs
 * mini-batch vs one-sample starting from the same point on the
 * same landscape.
 *
 * Variance sanity (mini-batch > 1 reduces variance, asymptotically
 * to full-batch) is the secondary widget: a histogram of 100
 * mini-batch gradient estimates at a chosen batch size, with the
 * true gradient marked.
 */

const SAMPLE_SIZE = 30;
const NOISE_SCALE = 0.15;

/** A 2D regression example. */
export interface Example {
  x: number;
  y: number;
  /** Noisy target: f(x, y) = sin(2x)·cos(2y) + ε, ε ~ N(0, NOISE_SCALE). */
  target: number;
}

/** A deterministic 30-example dataset. Same shape every call. */
export function syntheticDataset(): Example[] {
  const out: Example[] = [];
  for (let i = 0; i < SAMPLE_SIZE; i += 1) {
    // 6×5 grid in [-1.5, 1.5]² — small, dense enough to make
    // the mini-batch intuition visible.
    const ix = i % 6;
    const iy = Math.floor(i / 6);
    const x = -1.5 + (ix / 5) * 3;
    const y = -1.5 + (iy / 4) * 3;
    const clean = Math.sin(2 * x) * Math.cos(2 * y);
    // Deterministic noise: hash (i) into [-NOISE_SCALE, NOISE_SCALE].
    // Keeps the lesson reproducible; no PRNG state to track.
    const h = ((i + 1) * 2654435761) % 0x7fffffff;
    const noise = ((h / 0x7fffffff) * 2 - 1) * NOISE_SCALE;
    out.push({ x, y, target: clean + noise });
  }
  return out;
}

/** Number of examples in the synthetic dataset. */
export const SYNTHETIC_SIZE = SAMPLE_SIZE;

/**
 * Mean squared error loss over a batch.
 *
 * Loss for a single example:  ½ (ŷ − t)²
 * Loss over a batch:          mean over the batch.
 *
 * Predictions come from a fixed toy "model": ŷ = a·x + b·y + c
 * (linear in 3 parameters). Cheap, deterministic, and lets the
 * mini-batch lesson be about the *sampling* — not the model.
 */
export interface ToyModel {
  a: number;
  b: number;
  c: number;
}

export function predict(m: ToyModel, e: Example): number {
  return m.a * e.x + m.b * e.y + m.c;
}

export function batchLoss(m: ToyModel, batch: readonly Example[]): number {
  if (batch.length === 0) {
    throw new Error('sgd.batchLoss: batch must be non-empty');
  }
  let s = 0;
  for (const e of batch) {
    const r = predict(m, e) - e.target;
    s += r * r;
  }
  return s / (2 * batch.length);
}

/**
 * Gradient of the batch loss w.r.t. (a, b, c).
 * dL/da = mean_batch (ŷ − t)·x
 * dL/db = mean_batch (ŷ − t)·y
 * dL/dc = mean_batch (ŷ − t)
 */
export interface Grad3 {
  a: number;
  b: number;
  c: number;
}

export function batchGradient(m: ToyModel, batch: readonly Example[]): Grad3 {
  if (batch.length === 0) {
    throw new Error('sgd.batchGradient: batch must be non-empty');
  }
  let da = 0;
  let db = 0;
  let dc = 0;
  for (const e of batch) {
    const r = predict(m, e) - e.target;
    da += r * e.x;
    db += r * e.y;
    dc += r;
  }
  const n = batch.length;
  return { a: da / n, b: db / n, c: dc / n };
}

/** Take one SGD step: m = m − η · grad. */
export function sgdStepModel(m: ToyModel, g: Grad3, eta: number): ToyModel {
  if (eta < 0 || !Number.isFinite(eta)) {
    throw new Error(`sgd.sgdStepModel: eta must be a non-negative finite number (got ${eta})`);
  }
  return {
    a: m.a - eta * g.a,
    b: m.b - eta * g.b,
    c: m.c - eta * g.c,
  };
}

/**
 * Sample a batch of `batchSize` examples without replacement
 * from a dataset, using a Mulberry32 seeded RNG so the lesson
 * is reproducible. Returns the sampled batch.
 */
export function sampleBatch(
  dataset: readonly Example[],
  batchSize: number,
  seed: number,
): Example[] {
  if (batchSize <= 0 || !Number.isInteger(batchSize)) {
    throw new Error(`sgd.sampleBatch: batchSize must be a positive integer (got ${batchSize})`);
  }
  if (batchSize > dataset.length) {
    throw new Error(
      `sgd.sampleBatch: batchSize (${batchSize}) cannot exceed dataset size (${dataset.length})`,
    );
  }
  // Mulberry32 PRNG; deterministic, branch-free.
  let s = seed >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Fisher–Yates shuffle of indices; take the first `batchSize`.
  const idx = dataset.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const ti = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = ti;
  }
  return idx.slice(0, batchSize).map((i) => dataset[i]!);
}

/**
 * Run `numSteps` SGD steps, sampling a fresh batch of `batchSize`
 * examples per step. Returns the trajectory of (a, b, c) and the
 * per-step loss.
 *
 *   batchSize = dataset.length  →  full-batch, no sampling noise
 *   batchSize = 1                →  one-sample, max sampling noise
 *   batchSize = 4 (say)          →  mini-batch, the practical compromise
 */
export function runSgd(
  start: ToyModel,
  dataset: readonly Example[],
  batchSize: number,
  eta: number,
  numSteps: number,
  seed = 0,
): { trajectory: ToyModel[]; losses: number[] } {
  if (numSteps < 0 || !Number.isInteger(numSteps)) {
    throw new Error(`sgd.runSgd: numSteps must be a non-negative integer (got ${numSteps})`);
  }
  if (dataset.length === 0) {
    throw new Error('sgd.runSgd: dataset must be non-empty');
  }
  const trajectory: ToyModel[] = [start];
  const losses: number[] = [batchLoss(start, dataset)];
  let m = start;
  let s = seed;
  for (let i = 0; i < numSteps; i += 1) {
    const batch =
      batchSize >= dataset.length ? dataset.slice() : sampleBatch(dataset, batchSize, s);
    s = (s + 1) >>> 0;
    const g = batchGradient(m, batch);
    m = sgdStepModel(m, g, eta);
    trajectory.push(m);
    losses.push(batchLoss(m, dataset));
  }
  return { trajectory, losses };
}

/**
 * Empirical variance of a per-coordinate gradient estimator
 * over `numEstimates` batches of size `batchSize` drawn from
 * `dataset`. Used by the secondary widget — the "variance
 * shrinks with batch size" sanity check.
 *
 * Returns the three diagonal elements of the empirical
 * covariance (a, b, c) and the three coordinate means, so the
 * reader can plot a histogram of (for example) a's estimates
 * with the true full-batch gradient marked.
 */
export interface GradientVariance {
  /** Coordinate means. */
  mean: Grad3;
  /** Coordinate variances (diagonal of the cov matrix). */
  variance: { a: number; b: number; c: number };
  /** Sampled gradient vectors (length `numEstimates`). */
  samples: Grad3[];
}

export function gradientEmpiricalStats(
  m: ToyModel,
  dataset: readonly Example[],
  batchSize: number,
  numEstimates: number,
  seed = 0,
): GradientVariance {
  if (numEstimates <= 0 || !Number.isInteger(numEstimates)) {
    throw new Error(
      `sgd.gradientEmpiricalStats: numEstimates must be a positive integer (got ${numEstimates})`,
    );
  }
  const samples: Grad3[] = [];
  for (let i = 0; i < numEstimates; i += 1) {
    const batch =
      batchSize >= dataset.length ? dataset.slice() : sampleBatch(dataset, batchSize, seed + i);
    samples.push(batchGradient(m, batch));
  }
  // Means
  const mean: Grad3 = { a: 0, b: 0, c: 0 };
  for (const s of samples) {
    mean.a += s.a;
    mean.b += s.b;
    mean.c += s.c;
  }
  mean.a /= samples.length;
  mean.b /= samples.length;
  mean.c /= samples.length;
  // Variances
  let va = 0;
  let vb = 0;
  let vc = 0;
  for (const s of samples) {
    va += (s.a - mean.a) ** 2;
    vb += (s.b - mean.b) ** 2;
    vc += (s.c - mean.c) ** 2;
  }
  return {
    mean,
    variance: { a: va / samples.length, b: vb / samples.length, c: vc / samples.length },
    samples,
  };
}

/** The "true" gradient at a point: the full-batch gradient. */
export function trueGradient(m: ToyModel, dataset: readonly Example[]): Grad3 {
  return batchGradient(m, dataset);
}
