/**
 * Pretrained parameter vector for the fine-tuning module (lesson 27).
 *
 * The weights are produced by training on a *related but different* task:
 * 3-class concentric-arcs classification (same 2D input shape, different
 * decision boundaries). Low-level features transfer; the output head does not.
 *
 * PRETRAINED_PARAMS is computed once at module-load time via
 * generatePretrainedParams(42) and memoised — subsequent imports share the
 * same frozen array.
 */

import {
  N_PARAMS,
  train,
  defaultInitParams,
  type LabeledExample,
} from './training';
import { mulberry32 } from './random';

// Concentric-arcs data generator (private — not exported)
// 3 classes defined by radius bands: r < 0.4, 0.4 ≤ r < 0.8, 0.8 ≤ r < 1.2
// Samples are drawn uniformly in angle and with Gaussian-ish radius noise.

function concentricArcsDataset(seed: number, n = 200): LabeledExample[] {
  const rand = mulberry32(seed);

  // Box-Muller for Gaussian noise
  const randGauss = (): number => {
    const u1 = Math.max(rand(), 1e-10);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const out: LabeledExample[] = [];
  const radii = [0.4, 0.8, 1.2] as const;

  for (let i = 0; i < n; i += 1) {
    const label = i % 3; // balanced classes
    const targetRadius = radii[label]!;
    const r = targetRadius + randGauss() * 0.04;
    const theta = rand() * 2 * Math.PI;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    out.push({ x: [x, y], label });
  }

  return out;
}

/**
 * Train a small MLP on the concentric-arcs task starting from a
 * seed-derived random init. Returns the final parameter vector.
 */
export function generatePretrainedParams(seed: number): number[] {
  const dataset = concentricArcsDataset(seed);
  const initParams = defaultInitParams(seed);

  const result = train({
    initParams,
    dataset,
    optimizer: 'adam',
    schedule: 'cosine',
    peakLr: 3e-3,
    batchSize: 32,
    numSteps: 400,
    seed,
  });

  return result.finalParams;
}

const _baked: number[] = generatePretrainedParams(42);

if (_baked.length !== N_PARAMS) {
  throw new Error(
    `pretrain-init: expected ${N_PARAMS} params but got ${_baked.length}`,
  );
}

/** Frozen pre-trained weights (length === N_PARAMS). */
export const PRETRAINED_PARAMS: readonly number[] = Object.freeze(_baked);
