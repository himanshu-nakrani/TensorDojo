/**
 * The training capstone: one full training run, composed from
 * the primitives built across the rest of the module.
 *
 *   - Model: a tiny MLP that maps a 2D point to a 3-class
 *     softmax over the side of a curve the point lies on.
 *   - Loss: cross-entropy on the softmax.
 *   - Optimizer: SGD, SGD+momentum, or Adam.
 *   - Schedule: constant, linear, cosine, or warmup+cosine.
 *   - Batch: user-chosen (1, 4, 16, all).
 *
 * The whole thing runs deterministically given a seed, on a
 * tiny problem (~200 samples) that trains to a known accuracy
 * threshold in a few hundred steps. The centerpiece's "train"
 * button does the whole loop; the secondary widget compares
 * three preset configs (default, diverges, no-schedule) in
 * parallel.
 *
 * The math is plain: forward pass with hand-rolled ReLU and
 * softmax, backward pass via a small per-parameter gradient
 * routine, and the optimizer/schedule functions from the
 * earlier lessons. The point is "training is a loop" —
 * everything the earlier lessons exposed individually gets
 * wired up here, end-to-end.
 */

import { batchGradient, type Example, type Grad3, type ToyModel } from './sgd';
import { adamStep, sgdStep, sgdMomentumStep } from './optimizers';
import {
  constant as lrConstant,
  cosineDecay,
  linearDecay,
  warmupCosine,
} from './schedules';
import { applyFreezeMask, type FreezeMask } from './freeze-mask';

// ---------------------------------------------------------------------------
// Tiny model: 2D input → 8-hidden (ReLU) → 8-hidden (ReLU) → 3 (softmax).
// Forward and backward are by hand. The parameter vector is the
// concatenation of all layer weights and biases, in a fixed order
// the optimizer treats as a flat list of scalars.
// ---------------------------------------------------------------------------

export const N_IN = 2;
export const N_HID = 8;
export const N_OUT = 3;
export const N_PARAMS =
  N_HID * N_IN +
  N_HID +
  N_HID * N_HID +
  N_HID +
  N_OUT * N_HID +
  N_OUT;

/** A flat parameter vector, length N_PARAMS. */
export type Params = number[];

interface ParamSlices {
  W1: number[][]; // [N_HID][N_IN]
  b1: number[]; // [N_HID]
  W2: number[][]; // [N_HID][N_HID]
  b2: number[]; // [N_HID]
  W3: number[][]; // [N_OUT][N_HID]
  b3: number[]; // [N_OUT]
}

/** Slice a flat vector into named layer views. */
export function sliceParams(p: Params): ParamSlices {
  let off = 0;
  const take = (n: number): number[] => p.slice(off, off + n);
  const takeM = (rows: number, cols: number): number[][] => {
    const out: number[][] = [];
    for (let r = 0; r < rows; r += 1) out.push(p.slice(off + r * cols, off + (r + 1) * cols));
    return out;
  };
  const W1 = takeM(N_HID, N_IN);
  off += N_HID * N_IN;
  const b1 = take(N_HID);
  off += N_HID;
  const W2 = takeM(N_HID, N_HID);
  off += N_HID * N_HID;
  const b2 = take(N_HID);
  off += N_HID;
  const W3 = takeM(N_OUT, N_HID);
  off += N_OUT * N_HID;
  const b3 = take(N_OUT);
  return { W1, b1, W2, b2, W3, b3 };
}

/** Concatenate a parameter dict back into a flat vector. */
export function flattenParams(s: ParamSlices): Params {
  const out: number[] = [];
  for (const r of s.W1) for (const v of r) out.push(v);
  out.push(...s.b1);
  for (const r of s.W2) for (const v of r) out.push(v);
  out.push(...s.b2);
  for (const r of s.W3) for (const v of r) out.push(v);
  out.push(...s.b3);
  return out;
}

/** A flat gradient vector, same length as Params. */
export type Grads = number[];

interface GradSlices {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  W3: number[][];
  b3: number[];
}

function flattenGrads(s: GradSlices): Grads {
  const out: number[] = [];
  for (const r of s.W1) for (const v of r) out.push(v);
  out.push(...s.b1);
  for (const r of s.W2) for (const v of r) out.push(v);
  out.push(...s.b2);
  for (const r of s.W3) for (const v of r) out.push(v);
  out.push(...s.b3);
  return out;
}

/** Forward pass: returns the per-class softmax probabilities. */
export function forwardProbs(
  p: Params,
  x: readonly number[],
): { probs: number[]; z1: number[]; h1: number[]; z2: number[]; h2: number[]; z3: number[] } {
  const { W1, b1, W2, b2, W3, b3 } = sliceParams(p);
  const z1: number[] = new Array(N_HID);
  for (let i = 0; i < N_HID; i += 1) {
    let s = b1[i] ?? 0;
    for (let j = 0; j < N_IN; j += 1) s += (W1[i]![j] ?? 0) * (x[j] ?? 0);
    z1[i] = s;
  }
  const h1 = z1.map((v) => (v > 0 ? v : 0));
  const z2: number[] = new Array(N_HID);
  for (let i = 0; i < N_HID; i += 1) {
    let s = b2[i] ?? 0;
    for (let j = 0; j < N_HID; j += 1) s += (W2[i]![j] ?? 0) * h1[j]!;
    z2[i] = s;
  }
  const h2 = z2.map((v) => (v > 0 ? v : 0));
  const z3: number[] = new Array(N_OUT);
  for (let i = 0; i < N_OUT; i += 1) {
    let s = b3[i] ?? 0;
    for (let j = 0; j < N_HID; j += 1) s += (W3[i]![j] ?? 0) * h2[j]!;
    z3[i] = s;
  }
  // Softmax, log-sum-exp stable.
  const mz = Math.max(...z3);
  const exp = z3.map((v) => Math.exp(v - mz));
  const z = exp.reduce((a, b) => a + b, 0);
  const probs = exp.map((v) => v / z);
  return { probs, z1, h1, z2, h2, z3 };
}

/** Cross-entropy loss for a single example (label = true class index). */
export function lossForExample(p: Params, x: readonly number[], label: number): number {
  const { probs } = forwardProbs(p, x);
  const pt = probs[label] ?? 0;
  if (pt <= 0) return Number.POSITIVE_INFINITY;
  return -Math.log(pt);
}

/** Mean cross-entropy over a batch. */
export function batchLoss(
  p: Params,
  batch: readonly { x: readonly number[]; label: number }[],
): number {
  if (batch.length === 0) {
    throw new Error('training.batchLoss: batch must be non-empty');
  }
  let s = 0;
  for (const e of batch) {
    s += lossForExample(p, e.x, e.label);
  }
  return s / batch.length;
}

/** Accuracy: fraction of examples whose argmax matches the label. */
export function batchAccuracy(
  p: Params,
  batch: readonly { x: readonly number[]; label: number }[],
): number {
  if (batch.length === 0) {
    throw new Error('training.batchAccuracy: batch must be non-empty');
  }
  let correct = 0;
  for (const e of batch) {
    const { probs } = forwardProbs(p, e.x);
    let best = 0;
    let arg = 0;
    for (let k = 0; k < N_OUT; k += 1) {
      if ((probs[k] ?? 0) > best) {
        best = probs[k] ?? 0;
        arg = k;
      }
    }
    if (arg === e.label) correct += 1;
  }
  return correct / batch.length;
}

/**
 * Backward pass for one example. Returns the gradient of the
 * cross-entropy loss wrt every parameter. Implementation:
 * numerical differentiation in the *flat* parameter space
 * with central differences. This is slow but trivially
 * correct, and the small model + small dataset make it
 * acceptable. The test file checks the result against an
 * alternative analytic implementation as a smoke test.
 *
 *   For the 123-parameter model and a small batch, central
 *   differences over each parameter is N_PARAMS × 2 forward
 *   passes. For 200 examples that's 123 × 2 = 246 forward
 *   passes per example. Each forward is
 *   cheap. The capstone uses a real but slower
 *   implementation, and the test guards the correctness.
 */
export function backwardOne(
  p: Params,
  x: readonly number[],
  label: number,
  h = 1e-5,
): Grads {
  const grad: Grads = new Array(N_PARAMS).fill(0);
  for (let k = 0; k < N_PARAMS; k += 1) {
    const plus = p.slice();
    const minus = p.slice();
    plus[k] = (plus[k] ?? 0) + h;
    minus[k] = (minus[k] ?? 0) - h;
    const lp = lossForExample(plus, x, label);
    const lm = lossForExample(minus, x, label);
    grad[k] = (lp - lm) / (2 * h);
  }
  return grad;
}

/**
 * Analytic backward for one example — derived from the
 * chain rule. Implemented separately from the numerical one
 * and used by `train()`; the numerical one is a sanity check
 * the test suite uses.
 *
 * Forward and backward reuse the by-hand forward pass; the
 * backward is the standard softmax+CE gradient:
 *
 *   dL/dz3 = probs − one_hot(label)
 *   dL/dW3 = outer(dL/dz3, h2)
 *   dL/db3 = dL/dz3
 *   dL/dh2 = W3ᵀ · dL/dz3
 *   dL/dz2 = dL/dh2 ⊙ relu'(z2)
 *   ... and the same for layer 1.
 */
export function backwardOneAnalytic(
  p: Params,
  x: readonly number[],
  label: number,
): Grads {
  const { W1, b1, W2, b2, W3, b3 } = sliceParams(p);
  const { probs, z1, h1, z2, h2 } = forwardProbs(p, x);
  // dL/dz3 = probs - e_label
  const dLdz3 = probs.slice();
  dLdz3[label] = (dLdz3[label] ?? 0) - 1;
  // dL/dW3 = outer(dL/dz3, h2)
  const dLdW3: number[][] = new Array(N_OUT);
  for (let i = 0; i < N_OUT; i += 1) {
    const row = new Array(N_HID);
    for (let j = 0; j < N_HID; j += 1) row[j] = (dLdz3[i] ?? 0) * (h2[j] ?? 0);
    dLdW3[i] = row;
  }
  const dLdb3 = dLdz3.slice();
  // dL/dh2 = W3ᵀ · dL/dz3
  const dLdh2 = new Array(N_HID).fill(0);
  for (let j = 0; j < N_HID; j += 1) {
    let s = 0;
    for (let i = 0; i < N_OUT; i += 1) s += (W3[i]![j] ?? 0) * (dLdz3[i] ?? 0);
    dLdh2[j] = s;
  }
  const dLdz2 = dLdh2.map((v, i) => (z2[i]! > 0 ? v : 0));
  const dLdW2: number[][] = new Array(N_HID);
  for (let i = 0; i < N_HID; i += 1) {
    const row = new Array(N_HID);
    for (let j = 0; j < N_HID; j += 1) row[j] = (dLdz2[i] ?? 0) * (h1[j] ?? 0);
    dLdW2[i] = row;
  }
  const dLdb2 = dLdz2.slice();
  const dLdh1 = new Array(N_HID).fill(0);
  for (let j = 0; j < N_HID; j += 1) {
    let s = 0;
    for (let i = 0; i < N_HID; i += 1) s += (W2[i]![j] ?? 0) * (dLdz2[i] ?? 0);
    dLdh1[j] = s;
  }
  const dLdz1 = dLdh1.map((v, i) => (z1[i]! > 0 ? v : 0));
  const dLdW1: number[][] = new Array(N_HID);
  for (let i = 0; i < N_HID; i += 1) {
    const row = new Array(N_IN);
    for (let j = 0; j < N_IN; j += 1) row[j] = (dLdz1[i] ?? 0) * (x[j] ?? 0);
    dLdW1[i] = row;
  }
  const dLdb1 = dLdz1.slice();
  return flattenGrads({ W1: dLdW1, b1: dLdb1, W2: dLdW2, b2: dLdb2, W3: dLdW3, b3: dLdb3 });
}

// ---------------------------------------------------------------------------
// Synthetic dataset: classify 2D points by which of three regions
// (curves splitting the plane) they fall into. 200 samples, 3 classes,
// ~67/class. Deterministic given the seed.
// ---------------------------------------------------------------------------

export interface LabeledExample {
  x: readonly number[];
  label: number;
}

export function syntheticClassification(seed = 0): LabeledExample[] {
  const out: LabeledExample[] = [];
  // Mulberry32 PRNG
  let s = seed >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Three classes, ~67 each, sampled uniformly in [-1.5, 1.5]².
  // Label = which "pie slice" the point's angle falls in (0..2).
  // This gives a 3-class problem with a non-linear boundary
  // (the three rays θ = 0, 2π/3, 4π/3).
  for (let i = 0; i < 200; i += 1) {
    const x = -1.5 + rand() * 3;
    const y = -1.5 + rand() * 3;
    const theta = Math.atan2(y, x);
    const label = Math.floor(((theta + Math.PI) / (2 * Math.PI)) * 3) % 3;
    out.push({ x: [x, y], label });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The training loop.
// ---------------------------------------------------------------------------

export type OptimizerKind = 'sgd' | 'momentum' | 'adam';
export type ScheduleKind = 'constant' | 'linear' | 'cosine' | 'warmup-cosine';

export interface TrainConfig {
  /** Starting parameters. Required. */
  initParams: Params;
  /** Training set. Required. */
  dataset: readonly LabeledExample[];
  /** Held-out test set (optional, used to log test accuracy per step). */
  testSet?: readonly LabeledExample[];
  optimizer: OptimizerKind;
  schedule: ScheduleKind;
  /** Peak learning rate. */
  peakLr: number;
  /** Momentum coefficient (only used if optimizer === 'momentum'). */
  beta?: number;
  /** Mini-batch size; clamped to the dataset size. */
  batchSize: number;
  /** Number of optimization steps. */
  numSteps: number;
  /** Warmup steps (only used if schedule === 'warmup-cosine'). */
  warmupSteps?: number;
  /** RNG seed for batch sampling. */
  seed?: number;
}

export interface TrainResult {
  /** Loss recorded at every step. Index 0 is the initial loss. */
  losses: number[];
  /** Test accuracy at every step, or [] if no test set was supplied. */
  testAcc: number[];
  /** Final parameters. */
  finalParams: Params;
  /** Whether the run diverged (loss became NaN/Inf or > 1e6). */
  diverged: boolean;
  /** Step at which divergence was first detected, or null. */
  divergedAt: number | null;
}

/** A naive "rng-ish" deterministic batch sampler (no replacement). */
function sampleIndices(n: number, k: number, seed: number): number[] {
  if (k >= n) {
    const out: number[] = [];
    for (let i = 0; i < n; i += 1) out.push(i);
    return out;
  }
  let s = (seed + 1) >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const idx = new Array<number>(n);
  for (let i = 0; i < n; i += 1) idx[i] = i;
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const ti = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = ti;
  }
  return idx.slice(0, k);
}

/** Add two flat vectors. */
function vAdd(a: number[], b: number[]): number[] {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}

/** Scale a flat vector by a scalar. */
function vScale(a: number[], s: number): number[] {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = (a[i] ?? 0) * s;
  return out;
}

/** Sum a list of flat vectors. */
function vSum(xs: number[][]): number[] {
  if (xs.length === 0) return [];
  const out = new Array<number>(xs[0]!.length).fill(0);
  for (const v of xs) {
    for (let i = 0; i < v.length; i += 1) out[i] = (out[i] ?? 0) + (v[i] ?? 0);
  }
  return out;
}

/** Pick the LR for step t given the schedule kind. */
export function lrForStep(
  t: number,
  schedule: ScheduleKind,
  total: number,
  peak: number,
  warmupSteps: number,
): number {
  switch (schedule) {
    case 'constant':
      return lrConstant(t, total, peak);
    case 'linear':
      return linearDecay(t, total, peak);
    case 'cosine':
      return cosineDecay(t, total, peak);
    case 'warmup-cosine':
      return warmupCosine(t, total, peak, warmupSteps);
  }
}

/**
 * Run a full training loop and return the loss/accuracy
 * traces. The optimizer state is threaded through calls so the
 * momentum velocity and Adam moments are carried correctly.
 */
export function train(config: TrainConfig): TrainResult {
  if (config.numSteps < 0 || !Number.isInteger(config.numSteps)) {
    throw new Error(
      `training.train: numSteps must be a non-negative integer (got ${config.numSteps})`,
    );
  }
  if (config.dataset.length === 0) {
    throw new Error('training.train: dataset must be non-empty');
  }
  if (config.batchSize <= 0) {
    throw new Error(`training.train: batchSize must be positive (got ${config.batchSize})`);
  }
  const losses: number[] = [];
  const testAcc: number[] = [];
  let p = config.initParams.slice();
  losses.push(batchLoss(p, config.dataset));
  if (config.testSet && config.testSet.length > 0) {
    testAcc.push(batchAccuracy(p, config.testSet));
  }
  // Optimizer state.
  let sgdState: { kind: 'sgd' } = { kind: 'sgd' };
  let momentumState: { kind: 'momentum'; velocity: number[] } = {
    kind: 'momentum',
    velocity: new Array(N_PARAMS).fill(0),
  };
  let adamState: { kind: 'adam'; m: number[]; v: number[]; t: number } = {
    kind: 'adam',
    m: new Array(N_PARAMS).fill(0),
    v: new Array(N_PARAMS).fill(0),
    t: 0,
  };
  let diverged = false;
  let divergedAt: number | null = null;
  const total = Math.max(1, config.numSteps);
  const warmup = config.warmupSteps ?? Math.floor(total * 0.05);
  const seed = config.seed ?? 0;
  for (let t = 0; t < config.numSteps; t += 1) {
    // Sample a batch.
    const indices = sampleIndices(config.dataset.length, config.batchSize, seed + t);
    const batch = indices.map((i) => config.dataset[i]!);
    // Gradient of CE on the batch = mean of per-example gradients.
    const perEx = batch.map((e) => backwardOneAnalytic(p, e.x, e.label));
    const grad = vScale(vSum(perEx), 1 / batch.length);
    // LR.
    const lr = lrForStep(t, config.schedule, total, config.peakLr, warmup);
    // Optimizer step.
    if (config.optimizer === 'sgd') {
      const r = sgdStep(p, grad, lr, sgdState);
      p = r.params;
      sgdState = r.state;
    } else if (config.optimizer === 'momentum') {
      const r = sgdMomentumStep(p, grad, lr, config.beta ?? 0.9, momentumState);
      p = r.params;
      momentumState = r.state;
    } else {
      const r = adamStep(p, grad, lr, 0.9, 0.999, 1e-8, adamState);
      p = r.params;
      adamState = r.state;
    }
    // Loss / accuracy.
    const l = batchLoss(p, config.dataset);
    if (!Number.isFinite(l) || l > 1e6) {
      diverged = true;
      if (divergedAt === null) divergedAt = t + 1;
    }
    losses.push(l);
    if (config.testSet && config.testSet.length > 0) {
      testAcc.push(batchAccuracy(p, config.testSet));
    }
  }
  return { losses, testAcc, finalParams: p, diverged, divergedAt };
}

/**
 * Like `train`, but applies a per-layer freeze mask to the gradient before
 * each optimizer step. Frozen layers receive a zero gradient so their
 * parameters are never updated.
 */
export function trainWithFreezeMask(
  config: TrainConfig & { freezeMask: FreezeMask },
): TrainResult {
  if (config.numSteps < 0 || !Number.isInteger(config.numSteps)) {
    throw new Error(
      `training.trainWithFreezeMask: numSteps must be a non-negative integer (got ${config.numSteps})`,
    );
  }
  if (config.dataset.length === 0) {
    throw new Error('training.trainWithFreezeMask: dataset must be non-empty');
  }
  if (config.batchSize <= 0) {
    throw new Error(
      `training.trainWithFreezeMask: batchSize must be positive (got ${config.batchSize})`,
    );
  }
  const losses: number[] = [];
  const testAcc: number[] = [];
  let p = config.initParams.slice();
  losses.push(batchLoss(p, config.dataset));
  if (config.testSet && config.testSet.length > 0) {
    testAcc.push(batchAccuracy(p, config.testSet));
  }
  // Optimizer state.
  let sgdState: { kind: 'sgd' } = { kind: 'sgd' };
  let momentumState: { kind: 'momentum'; velocity: number[] } = {
    kind: 'momentum',
    velocity: new Array(N_PARAMS).fill(0),
  };
  let adamState: { kind: 'adam'; m: number[]; v: number[]; t: number } = {
    kind: 'adam',
    m: new Array(N_PARAMS).fill(0),
    v: new Array(N_PARAMS).fill(0),
    t: 0,
  };
  let diverged = false;
  let divergedAt: number | null = null;
  const total = Math.max(1, config.numSteps);
  const warmup = config.warmupSteps ?? Math.floor(total * 0.05);
  const seed = config.seed ?? 0;
  for (let t = 0; t < config.numSteps; t += 1) {
    // Sample a batch.
    const indices = sampleIndices(config.dataset.length, config.batchSize, seed + t);
    const batch = indices.map((i) => config.dataset[i]!);
    // Gradient of CE on the batch = mean of per-example gradients.
    const perEx = batch.map((e) => backwardOneAnalytic(p, e.x, e.label));
    // Apply freeze mask: zero out the gradient for frozen layers.
    const grad = applyFreezeMask(vScale(vSum(perEx), 1 / batch.length), config.freezeMask);
    // LR.
    const lr = lrForStep(t, config.schedule, total, config.peakLr, warmup);
    // Optimizer step.
    if (config.optimizer === 'sgd') {
      const r = sgdStep(p, grad, lr, sgdState);
      p = r.params;
      sgdState = r.state;
    } else if (config.optimizer === 'momentum') {
      const r = sgdMomentumStep(p, grad, lr, config.beta ?? 0.9, momentumState);
      p = r.params;
      momentumState = r.state;
    } else {
      const r = adamStep(p, grad, lr, 0.9, 0.999, 1e-8, adamState);
      p = r.params;
      adamState = r.state;
    }
    // Loss / accuracy.
    const l = batchLoss(p, config.dataset);
    if (!Number.isFinite(l) || l > 1e6) {
      diverged = true;
      if (divergedAt === null) divergedAt = t + 1;
    }
    losses.push(l);
    if (config.testSet && config.testSet.length > 0) {
      testAcc.push(batchAccuracy(p, config.testSet));
    }
  }
  return { losses, testAcc, finalParams: p, diverged, divergedAt };
}

/**
 * Preset training configurations. The lesson's "secondary"
 * widget runs all three in parallel.
 *
 *   - default  : Adam, lr=5e-3, batch=16, warmup+cosine. Trains
 *                to ≥ 90% test accuracy on the default synthetic
 *                problem in a few hundred steps.
 *   - diverges : SGD, lr=1.0 (way too high), batch=16, constant.
 *                The loss explodes within the first few steps.
 *   - no-sched : Adam, lr=5e-3, batch=16, *constant* LR. Trains
 *                but oscillates near the end because the LR never
 *                shrinks.
 */
export interface PresetConfig {
  id: 'default' | 'diverges' | 'no-schedule';
  label: string;
  description: string;
  config: Omit<TrainConfig, 'initParams' | 'dataset' | 'testSet'>;
}

export const PRESET_CONFIGS: readonly PresetConfig[] = [
  {
    id: 'default',
    label: 'Default (works)',
    description:
      'Adam, peak LR 5e-3, batch 16, warmup + cosine. Trains cleanly in a few hundred steps.',
    config: {
      optimizer: 'adam',
      schedule: 'warmup-cosine',
      peakLr: 5e-3,
      batchSize: 16,
      numSteps: 300,
      warmupSteps: 15,
    },
  },
  {
    id: 'diverges',
    label: 'LR too high (diverges)',
    description:
      'SGD, peak LR 5.0 (way too high), batch 16, constant. Loss explodes within a few steps.',
    config: {
      optimizer: 'sgd',
      schedule: 'constant',
      peakLr: 5.0,
      batchSize: 16,
      numSteps: 100,
    },
  },
  {
    id: 'no-schedule',
    label: 'No schedule (oscillates)',
    description:
      'Adam, peak LR 5e-3, batch 16, *constant* LR. Trains but oscillates near the end because the LR never shrinks.',
    config: {
      optimizer: 'adam',
      schedule: 'constant',
      peakLr: 5e-3,
      batchSize: 16,
      numSteps: 300,
    },
  },
];

/** Default init parameters: small random numbers (He-ish for 2D). */
export function defaultInitParams(seed = 0): Params {
  let s = (seed + 1) >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Scale = sqrt(2/fan_in); uniformly sample in [-scale, scale].
  const make = (rows: number, cols: number): number[] => {
    const scale = Math.sqrt(2 / cols);
    const out = new Array<number>(rows * cols);
    for (let i = 0; i < rows * cols; i += 1) out[i] = (rand() * 2 - 1) * scale;
    return out;
  };
  const makeB = (n: number): number[] => new Array<number>(n).fill(0);
  return [
    ...make(N_HID, N_IN),
    ...makeB(N_HID),
    ...make(N_HID, N_HID),
    ...makeB(N_HID),
    ...make(N_OUT, N_HID),
    ...makeB(N_OUT),
  ];
}

// ---------------------------------------------------------------------------
// "Quick" helpers the lesson uses to keep its centerpiece snappy.
// These exist because `train()` runs synchronously; the lesson's
// React layer wraps them in a setTimeout so the UI doesn't freeze.
// ---------------------------------------------------------------------------

/** A 60% / 40% train/test split of a labeled dataset. */
export function trainTestSplit(
  data: readonly LabeledExample[],
  testFraction = 0.4,
  seed = 0,
): { train: LabeledExample[]; test: LabeledExample[] } {
  let s = seed >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const idx = data.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const ti = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = ti;
  };
  const cut = Math.floor(data.length * (1 - testFraction));
  return {
    train: idx.slice(0, cut).map((i) => data[i]!),
    test: idx.slice(cut).map((i) => data[i]!),
  };
}

// Re-exports for the lesson.
export type { Example, Grad3, ToyModel };
