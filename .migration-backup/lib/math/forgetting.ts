/**
 * Catastrophic-forgetting math: a two-phase training loop that evaluates
 * accuracy on BOTH tasks at every step. Used by lesson 29's
 * SequentialTaskTrainer sim.
 *
 * Phase A trains on taskA for stepsA steps with lrA.
 * Phase B trains on taskB (or taskA+taskB interleaved) for stepsB steps
 * with lrB. At every step, accuracy on both held-out test sets is recorded,
 * producing two time-series of length stepsA + stepsB + 1.
 */

import type { LabeledExample, OptimizerKind, ScheduleKind } from './training';
import { defaultInitParams, backwardOneAnalytic, batchAccuracy, N_PARAMS } from './training';

export interface ForgettingConfig {
  taskA: readonly LabeledExample[];     // phase A training data
  taskATest: readonly LabeledExample[]; // held-out task A test set, evaluated throughout both phases
  taskB: readonly LabeledExample[];     // phase B training data
  taskBTest: readonly LabeledExample[]; // held-out task B test set, evaluated throughout both phases
  stepsA: number;
  stepsB: number;
  lrA: number;
  lrB: number;
  /** If true, ALL samples (taskA + taskB) are shuffled together during phase B.
   *  If false, phase B trains on taskB only. */
  interleave: boolean;
  seed: number;
  optimizer?: OptimizerKind; // default 'sgd'
  schedule?: ScheduleKind;   // default 'constant'
  batchSize?: number;        // default 16
}

export interface ForgettingResult {
  /** Length stepsA + stepsB + 1 (includes step-0 initial value). */
  accAOverTime: number[];
  /** Same length as accAOverTime. */
  accBOverTime: number[];
}

// ---------------------------------------------------------------------------
// Internal helpers — mirror what training.ts does locally so we don't have
// to reach into its private symbols.
// ---------------------------------------------------------------------------

/** Mulberry32 seeded PRNG returning [0, 1). */
function makePrng(seed: number): () => number {
  let s = (seed + 1) >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle of indices [0..n), returning first k. */
function sampleIndices(n: number, k: number, rand: () => number): number[] {
  if (k >= n) {
    const out: number[] = [];
    for (let i = 0; i < n; i += 1) out.push(i);
    return out;
  }
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

/** Mean gradient over a mini-batch using the analytic backward pass. */
function batchGrad(p: number[], batch: readonly LabeledExample[]): number[] {
  const sum = new Array<number>(N_PARAMS).fill(0);
  for (const e of batch) {
    const g = backwardOneAnalytic(p, e.x, e.label);
    for (let i = 0; i < N_PARAMS; i += 1) sum[i] = (sum[i] ?? 0) + (g[i] ?? 0);
  }
  const n = batch.length;
  return sum.map((v) => v / n);
}

/** Plain SGD update: p ← p − lr · grad. */
function sgdUpdate(p: number[], grad: number[], lr: number): number[] {
  const out = new Array<number>(p.length);
  for (let i = 0; i < p.length; i += 1) out[i] = (p[i] ?? 0) - lr * (grad[i] ?? 0);
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the two-phase sequential-training experiment and return accuracy
 * traces on both tasks at every step.
 *
 * Deterministic: given the same seed, produces identical output.
 */
export function trainSequential(config: ForgettingConfig): ForgettingResult {
  const batchSize = config.batchSize ?? 16;
  const accAOverTime: number[] = [];
  const accBOverTime: number[] = [];

  // One PRNG for all batch sampling; seeded from config.seed so the whole
  // run is reproducible. We advance the PRNG independently for phase A and
  // phase B by using per-step seeds derived from config.seed.
  // We use separate per-step Mulberry32 invocations (like training.ts does)
  // so each step's batch is independent yet deterministic.

  let p = defaultInitParams(config.seed);

  // Step 0: record initial accuracy before any training.
  accAOverTime.push(batchAccuracy(p, config.taskATest));
  accBOverTime.push(batchAccuracy(p, config.taskBTest));

  // Phase A: train on taskA for stepsA steps with lrA.
  for (let t = 0; t < config.stepsA; t += 1) {
    // Use a per-step seeded PRNG (same strategy as training.ts: seed + t).
    const rand = makePrng(config.seed + t);
    const indices = sampleIndices(config.taskA.length, batchSize, rand);
    const batch = indices.map((i) => config.taskA[i]!);
    const grad = batchGrad(p, batch);
    p = sgdUpdate(p, grad, config.lrA);

    accAOverTime.push(batchAccuracy(p, config.taskATest));
    accBOverTime.push(batchAccuracy(p, config.taskBTest));
  }

  // Phase B: train on taskB (or interleaved set) for stepsB steps with lrB.
  // Use a different seed base to keep phase B sampling independent of phase A.
  const phaseBSeedBase = config.seed + config.stepsA + 100_000;
  const phaseB = config.interleave
    ? ([...config.taskA, ...config.taskB] as readonly LabeledExample[])
    : config.taskB;

  for (let t = 0; t < config.stepsB; t += 1) {
    const rand = makePrng(phaseBSeedBase + t);
    const indices = sampleIndices(phaseB.length, batchSize, rand);
    const batch = indices.map((i) => phaseB[i]!);
    const grad = batchGrad(p, batch);
    p = sgdUpdate(p, grad, config.lrB);

    accAOverTime.push(batchAccuracy(p, config.taskATest));
    accBOverTime.push(batchAccuracy(p, config.taskBTest));
  }

  return { accAOverTime, accBOverTime };
}
