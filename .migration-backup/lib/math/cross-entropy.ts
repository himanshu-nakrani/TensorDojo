/**
 * Cross-entropy loss for a single example.
 *
 * For one prediction, the model produces a probability
 * distribution p over the vocabulary. The "true" answer is a
 * one-hot at the index of the correct token. The cross-entropy
 * for this example is
 *
 *   H(p, y) = -log p[true]
 *
 * (y is one-hot so only the true-token term survives.) It is the
 * negative log of the probability the model assigned to the
 * correct answer.
 *
 * Behavior:
 * - p[true] = 1 → loss = 0 (the model put all mass on the right answer)
 * - p[true] = 0 → loss = +∞ (the model put zero mass on the right answer)
 * - As p[true] shrinks, the loss grows without bound.
 *
 * For numerical stability we work in log-space: H = -log p[true]
 * is finite for any positive p, and we clamp p to a small
 * minimum before taking the log.
 */

const MIN_PROB = 1e-12;

/**
 * Single-example cross-entropy.
 *
 * @param probs      Model's predicted distribution (non-negative, sums to 1).
 * @param trueIndex  Index of the correct token.
 * @returns          -log p[true]. 0 if p[true] ≈ 1; +∞ if p[true] ≈ 0.
 */
export function crossEntropy(probs: readonly number[], trueIndex: number): number {
  const n = probs.length;
  if (n === 0) {
    throw new Error('crossEntropy: probs must be non-empty');
  }
  if (trueIndex < 0 || trueIndex >= n || !Number.isInteger(trueIndex)) {
    throw new Error(
      `crossEntropy: trueIndex must be an integer in [0, ${n}) (got ${trueIndex})`,
    );
  }
  for (let i = 0; i < n; i += 1) {
    const p = probs[i] as number;
    if (p < 0) {
      throw new Error(`crossEntropy: probs[${i}] is negative (got ${p})`);
    }
  }
  const p = probs[trueIndex] as number;
  if (p === 0) return Number.POSITIVE_INFINITY;
  // Clamp for numerical safety. With p=0 we return +∞ above, so
  // by the time we get here p is strictly positive. The clamp
  // here is for the very-small-but-positive case (e.g. p=1e-300)
  // which would underflow log(0) → -∞ but is well-defined as a
  // large positive number.
  const safe = Math.max(p, MIN_PROB);
  if (p === 1) return 0; // -log(1) === -0 in IEEE 754; coerce to +0.
  return -Math.log(safe);
}

/**
 * Cross-entropy from raw logits. Numerically stable: applies
 * the log-sum-exp trick so the answer doesn't depend on an
 * arbitrary constant added to the logits.
 *
 *   H = -logsoftmax(logits)[true]
 *     = -logits[true] + log(sum_j exp(logits[j]))
 */
export function crossEntropyFromLogits(
  logits: readonly number[],
  trueIndex: number,
): number {
  const n = logits.length;
  if (n === 0) {
    throw new Error('crossEntropyFromLogits: logits must be non-empty');
  }
  if (trueIndex < 0 || trueIndex >= n || !Number.isInteger(trueIndex)) {
    throw new Error(
      `crossEntropyFromLogits: trueIndex must be an integer in [0, ${n}) (got ${trueIndex})`,
    );
  }
  const maxLogit = Math.max(...logits);
  // log(sum exp(x_i - max)) + max  is the log-sum-exp identity
  // (stable). The cross-entropy is -x_true + log-sum-exp.
  let sumExp = 0;
  for (let i = 0; i < n; i += 1) {
    sumExp += Math.exp((logits[i] as number) - maxLogit);
  }
  const logSumExp = Math.log(sumExp) + maxLogit;
  return logSumExp - (logits[trueIndex] as number);
}

/**
 * Cross-entropy as a function of p[true] only (the reader's
 *   "loss curve" widget). H(p_true) = -log p_true.
 */
export function crossEntropyCurve(pTrue: number): number {
  if (pTrue < 0 || pTrue > 1) {
    throw new Error(`crossEntropyCurve: pTrue must be in [0, 1] (got ${pTrue})`);
  }
  if (pTrue === 0) return Number.POSITIVE_INFINITY;
  if (pTrue === 1) return 0; // -log(1) === -0 in IEEE 754; coerce to +0.
  return -Math.log(Math.max(pTrue, MIN_PROB));
}
