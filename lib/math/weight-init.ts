/**
 * Weight-initialization variance experiments.
 *
 * Runs a deep ReLU MLP forward pass with weights drawn from a
 * normal at user-chosen scale, and records the activation variance
 * at every layer. The four canonical regimes (small/large constant,
 * Xavier, Kaiming) come out of one shared computation by varying
 * the per-layer standard deviation.
 */

import { mulberry32 } from './random';

export type InitScheme = 'kaiming' | 'xavier' | 'small' | 'large';

export interface InitConfig {
  scheme: InitScheme;
  /** width of every hidden layer (input width is the same) */
  d: number;
  /** number of linear+ReLU layers */
  depth: number;
  /** PRNG seed */
  seed: number;
}

/** Per-layer std for each scheme, given input dimension d. */
export function stdForScheme(scheme: InitScheme, d: number): number {
  switch (scheme) {
    case 'kaiming':
      return Math.sqrt(2 / d);
    case 'xavier':
      return Math.sqrt(1 / d);
    case 'small':
      return 0.01;
    case 'large':
      return 0.5;
  }
}

/** Box-Muller normal sample. */
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Mean and variance of a vector. */
function meanVar(x: readonly number[]): { mean: number; variance: number } {
  let s = 0;
  for (let i = 0; i < x.length; i += 1) s += x[i] as number;
  const mean = s / x.length;
  let ss = 0;
  for (let i = 0; i < x.length; i += 1) {
    const d = (x[i] as number) - mean;
    ss += d * d;
  }
  return { mean, variance: ss / x.length };
}

/** Sample an N(0,1) input vector of length d. */
function makeInput(d: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const out: number[] = new Array<number>(d);
  for (let i = 0; i < d; i += 1) out[i] = gaussian(rand);
  return out;
}

/** Multiply a flat (d_out × d_in) weight by an input vector, ReLU. */
function reluMatVec(
  W: readonly number[],
  x: readonly number[],
  dOut: number,
  dIn: number,
): number[] {
  const out: number[] = new Array<number>(dOut).fill(0);
  for (let i = 0; i < dOut; i += 1) {
    let acc = 0;
    const row = i * dIn;
    for (let j = 0; j < dIn; j += 1) {
      acc += (W[row + j] as number) * (x[j] as number);
    }
    out[i] = acc > 0 ? acc : 0;
  }
  return out;
}

/** Sample a (d_out × d_in) weight matrix drawn from N(0, std^2). */
function sampleWeights(
  dOut: number,
  dIn: number,
  std: number,
  rand: () => number,
): number[] {
  const W: number[] = new Array<number>(dOut * dIn);
  for (let i = 0; i < W.length; i += 1) W[i] = gaussian(rand) * std;
  return W;
}

/**
 * Run one forward pass through a `depth`-layer ReLU MLP at the
 * chosen scheme. Returns the per-layer activation variance for
 * layers 0..depth (layer 0 is the input).
 */
export function activationVariancePerLayer(cfg: InitConfig): number[] {
  const { scheme, d, depth, seed } = cfg;
  const std = stdForScheme(scheme, d);
  const rand = mulberry32(seed * 31 + 7);
  let x = makeInput(d, seed);
  const out: number[] = [meanVar(x).variance];
  for (let l = 0; l < depth; l += 1) {
    const W = sampleWeights(d, d, std, rand);
    x = reluMatVec(W, x, d, d);
    out.push(meanVar(x).variance);
  }
  return out;
}
