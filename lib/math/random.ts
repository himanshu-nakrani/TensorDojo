/**
 * Tiny RNG helpers used by the lessons. We don't need cryptographic
 * randomness — we just need stable, repeatable sampling so the
 * histogram doesn't flicker every render.
 */

import { dot } from './linalg';

/**
 * Mulberry32 — a tiny 32-bit PRNG with a seed. ~5 ns per call, more
 * than enough for a few thousand samples per render.
 */
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

/** Sample one standard-normal variate from two uniform draws (Box-Muller). */
function gaussian(rand: () => number): number {
  // Avoid u=0 so the log doesn't blow up.
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Sample one independent d-dimensional vector with each component ~ N(0, 1). */
export function sampleGaussianVector(
  d: number,
  seed: number,
): number[] {
  const rand = mulberry32(seed);
  const out: number[] = new Array(d);
  for (let i = 0; i < d; i += 1) out[i] = gaussian(rand);
  return out;
}

/**
 * Sample `nPairs` independent (Q, K) pairs, each of dimension `d`,
 * with each component ~ N(0, 1). Returns the nPairs dot products.
 *
 * The seed is `nPairs * 0x9E3779B9 ^ d ^ salt` so the same
 * (nPairs, d) pair always gives the same numbers — that way
 * re-rendering the interactive (with the same d slider) doesn't
 * cause the histogram to shimmer.
 */
export function sampleDotProducts(
  nPairs: number,
  d: number,
  salt = 0,
): number[] {
  const seed = (nPairs * 0x9e3779b9) ^ (d * 0x85ebca6b) ^ (salt | 0);
  const rand = mulberry32(seed >>> 0);
  const gauss = (): number => {
    const u = Math.max(rand(), 1e-9);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const out: number[] = new Array(nPairs);
  const q: number[] = new Array(d);
  const k: number[] = new Array(d);
  for (let p = 0; p < nPairs; p += 1) {
    for (let i = 0; i < d; i += 1) q[i] = gauss();
    for (let i = 0; i < d; i += 1) k[i] = gauss();
    out[p] = dot(q, k);
  }
  return out;
}
