export type SamplingStrategy = 'greedy' | 'temperature' | 'top-k' | 'top-p';

/**
 * Decoding strategies: from a distribution over the vocabulary
 * to a single output token.
 *
 * The model produces a vector of logits (one per vocabulary
 * entry) at the output head. The decoding strategy decides
 * which token is emitted:
 *
 *   - Greedy: argmax(logits). Deterministic, always the same
 *     top-scoring token. Boring but reproducible.
 *   - Temperature sampling: softmax(logits / T), then sample
 *     one entry. T = 1 is the canonical softmax; T < 1 sharpens,
 *     T > 1 flattens. The reader has already met this in the
 *     softmax lesson — here it is the same operation in a
 *     different role.
 *   - Top-k: restrict to the top k logits, renormalize, sample.
 *     k = 1 collapses to greedy; large k approaches full
 *     temperature sampling.
 *   - Top-p (nucleus): smallest set whose cumulative probability
 *     ≥ p, renormalize, sample. Adaptive: when the distribution
 *     is peaked, the nucleus is small; when it is flat, the
 *     nucleus is large.
 *
 * The RNG is seeded (mulberry32) so the empirical distribution
 * is reproducible across renders.
 */

import { softmax, argmax } from './softmax';

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — same algorithm as `lib/math/random.ts`
// but kept here for the test fixture independence. The tests use
// their own seeds; the sims use a default seed for first-paint
// stability.
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleFromDistribution(
  dist: readonly number[],
  rng: () => number,
): number {
  const u = Math.max(rng(), 1e-12);
  let cumsum = 0;
  for (let i = 0; i < dist.length; i += 1) {
    cumsum += dist[i] as number;
    if (u <= cumsum) return i;
  }
  return dist.length - 1;
}

/** Greedy decoding: pick the argmax. */
export function greedyDecode(logits: readonly number[]): number {
  return argmax(logits);
}

/**
 * Temperature sampling: softmax(logits / T), then sample one
 * index. T = 1 is the canonical softmax. T must be > 0.
 */
export function temperatureSample(
  logits: readonly number[],
  temperature: number,
  seed: number = 1,
): number {
  if (temperature <= 0) {
    throw new Error(`temperature must be > 0 (got ${temperature})`);
  }
  const probs = softmax(logits, temperature);
  return sampleFromDistribution(probs, mulberry32(seed));
}

/**
 * Top-k sampling: zero out everything outside the top k logits,
 * renormalize the rest to sum to 1, then sample. k = 1 collapses
 * to greedy. k >= n is equivalent to plain softmax sampling.
 */
export function topKSample(
  logits: readonly number[],
  k: number,
  temperature: number = 1,
  seed: number = 1,
): number {
  const n = logits.length;
  if (n === 0) return -1;
  if (k <= 0) {
    throw new Error(`top-k: k must be > 0 (got ${k})`);
  }
  if (k >= n) {
    return temperatureSample(logits, temperature, seed);
  }
  // Find the k-th largest logit (the threshold).
  const sorted = [...logits].sort((a, b) => b - a);
  const threshold = sorted[k - 1] as number;
  // Zero out everything below the threshold (ties broken by
  // taking the first k entries by index).
  const keptIndices: number[] = [];
  for (let i = 0; i < n; i += 1) {
    if ((logits[i] as number) >= threshold) {
      keptIndices.push(i);
      if (keptIndices.length > k) break;
    }
  }
  // Build a sparse distribution over the kept entries.
  const keptLogits = keptIndices.map((i) => (logits[i] as number) / temperature);
  const exps = keptLogits.map((v) => Math.exp(v - Math.max(...keptLogits)));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);
  const localIdx = sampleFromDistribution(probs, mulberry32(seed));
  return keptIndices[localIdx]!;
}

/**
 * Top-p (nucleus) sampling: take the smallest set of entries
 * whose cumulative probability ≥ p, renormalize, sample.
 *
 * Note: T = 1 here (the function applies temperature before
 * sorting, so the user controls the peakiness via the
 * temperature parameter, and `p` controls the truncation).
 */
export function topPSample(
  logits: readonly number[],
  p: number,
  temperature: number = 1,
  seed: number = 1,
): number {
  const n = logits.length;
  if (n === 0) return -1;
  if (p <= 0 || p > 1) {
    throw new Error(`top-p: p must be in (0, 1] (got ${p})`);
  }
  const probs = softmax(logits, temperature);
  // Sort indices by probability descending, paired with their values.
  const indexed = probs
    .map((v, i) => ({ i, p: v }))
    .sort((a, b) => b.p - a.p);
  // Walk the sorted list until cumulative prob ≥ p.
  const kept: Array<{ i: number; p: number }> = [];
  let cumsum = 0;
  for (const { i, p: prob } of indexed) {
    kept.push({ i, p: prob });
    cumsum += prob;
    if (cumsum >= p) break;
  }
  // Renormalize.
  const z = cumsum > 0 ? cumsum : 1;
  const keptProbs = kept.map((k) => k.p / z);
  const localIdx = sampleFromDistribution(keptProbs, mulberry32(seed));
  return kept[localIdx]!.i;
}

/**
 * The effective sampling distribution after a strategy is
 * applied. Useful for the centerpiece: show the user the
 * *post-strategy* distribution they're sampling from.
 */
export function effectiveDistribution(
  logits: readonly number[],
  strategy: 'greedy' | 'temperature' | 'top-k' | 'top-p',
  params: { temperature?: number; k?: number; p?: number } = {},
): number[] {
  const n = logits.length;
  if (n === 0) return [];
  const T = params.temperature ?? 1;
  switch (strategy) {
    case 'greedy': {
      // One-hot at argmax.
      const out = new Array<number>(n).fill(0);
      out[argmax(logits)] = 1;
      return out;
    }
    case 'temperature': {
      return softmax(logits, T);
    }
    case 'top-k': {
      const k = params.k ?? 1;
      if (k >= n) return softmax(logits, T);
      const sorted = [...logits].sort((a, b) => b - a);
      const threshold = sorted[k - 1] as number;
      const keptIdx: number[] = [];
      for (let i = 0; i < n; i += 1) {
        if ((logits[i] as number) >= threshold) {
          keptIdx.push(i);
          if (keptIdx.length > k) break;
        }
      }
      const keptLogits = keptIdx.map((i) => (logits[i] as number) / T);
      const exps = keptLogits.map((v) => Math.exp(v - Math.max(...keptLogits)));
      const sum = exps.reduce((a, b) => a + b, 0);
      const out = new Array<number>(n).fill(0);
      keptIdx.forEach((i, j) => {
        out[i] = (exps[j] as number) / sum;
      });
      return out;
    }
    case 'top-p': {
      const p = params.p ?? 0.9;
      const probs = softmax(logits, T);
      const indexed = probs
        .map((v, i) => ({ i, p: v }))
        .sort((a, b) => b.p - a.p);
      const out = new Array<number>(n).fill(0);
      let cumsum = 0;
      let z = 0;
      for (const { i, p: prob } of indexed) {
        out[i] = prob;
        cumsum += prob;
        z += prob;
        if (cumsum >= p) break;
      }
      if (z > 0) {
        for (let i = 0; i < n; i += 1) out[i] = (out[i] as number) / z;
      }
      return out;
    }
  }
}
