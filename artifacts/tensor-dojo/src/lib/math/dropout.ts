/**
 * Dropout: random zeroing of activations during training, with
 * two equivalent forms.
 *
 *   1. Naive dropout:  y = mask ⊙ x       (mask ~ Bernoulli(1-p))
 *      Expected activation:  E[y] = (1 - p) x
 *   2. Inverted dropout:  y = mask ⊙ x / (1 - p)
 *      Expected activation:  E[y] = x        (matches training-time
 *      distribution; no scaling needed at inference)
 *
 * Every modern deep-learning library (PyTorch, JAX, TF) uses
 * inverted dropout at training and identity at inference, so the
 * only thing the user has to remember is "scale by 1/(1-p) at
 * training time and turn dropout off at inference." The lesson's
 * secondary widget walks through the scaling explicitly.
 */

/**
 * A single-sample Bernoulli dropout mask. Returns 0 with
 * probability p, (1-p)/p scaled by the inverted form. If
 * inverted=true, the mask is 0 with prob p and 1/(1-p) with
 * prob (1-p), so the *expected value of the elementwise
 * product* equals the input (the whole point of inverted
 * dropout).
 */
export function dropoutSample(
  x: number,
  p: number,
  rand: number,
  inverted: boolean,
): number {
  if (rand < p) return 0;
  return inverted ? x / (1 - p) : x;
}

/**
 * Apply dropout to a vector of activations. `rand` is an
 * array of uniform [0,1) samples, one per activation. Caller
 * is responsible for generating the noise (deterministic tests
 * pass a fixed sequence; the React component uses a seeded
 * PRNG so rerenders are reproducible).
 */
export function dropoutMask(
  x: readonly number[],
  p: number,
  rand: readonly number[],
  inverted: boolean,
): number[] {
  if (p < 0 || p >= 1) {
    throw new Error(`dropoutMask: p must be in [0, 1) (got ${p})`);
  }
  if (x.length !== rand.length) {
    throw new Error(
      `dropoutMask: x and rand must have the same length (got ${x.length} vs ${rand.length})`,
    );
  }
  // Special-case p = 0: identity. Avoids 1/(1-p) → 1/0.
  if (p === 0) return x.slice();
  return x.map((xi, i) => dropoutSample(xi, p, rand[i] ?? 0, inverted));
}

/**
 * Inverted-dropout mask only. Convenience: equivalent to
 * dropoutMask(x, p, rand, true). The lesson's centerpiece uses
 * this directly.
 */
export function invertedDropout(
  x: readonly number[],
  p: number,
  rand: readonly number[],
): number[] {
  return dropoutMask(x, p, rand, true);
}

/**
 * Compute the expected post-dropout activation under the
 * *non-inverted* form. E[y] = (1 - p) x. Used by the lesson's
 * side panel that walks through the scaling.
 */
export function expectedActivation(x: number, p: number, inverted: boolean): number {
  return inverted ? x : (1 - p) * x;
}

/**
 * True if, for a fixed seed, applying dropout with the given p
 * preserves the expected value of the activation. I.e.
 * E[y] = x. The inverted form is the only one that satisfies
 * this; the naive form does not.
 */
export function preservesExpectation(p: number, inverted: boolean): boolean {
  return inverted;
}
