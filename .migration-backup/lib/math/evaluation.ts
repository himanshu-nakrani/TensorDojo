/**
 * LM evaluation metrics — the curriculum-closing lesson covers
 * how the field actually measures models.
 *
 * Three intrinsic + extrinsic metrics that show up everywhere:
 *
 *   - Perplexity: the intrinsic LM quality metric. exp of the
 *     mean negative log-likelihood per token. The original
 *     before-benchmarks-existed metric.
 *
 *   - Accuracy: multiple-choice (MMLU, HellaSwag, ARC). The
 *     fraction of tasks the model's argmax matches the gold
 *     label.
 *
 *   - Pass@k: HumanEval-style code metric. Given multiple
 *     samples per task, the fraction of tasks with at least
 *     one passing sample in the first k. The HumanEval paper
 *     uses an unbiased estimator that takes the full pass-list
 *     into account.
 *
 *   - Agreement: a poor-man's contamination detector. When two
 *     unrelated models agree on benchmark answers with
 *     suspiciously high frequency, it suggests the benchmark is
 *     in both pretraining sets.
 */

/**
 * Perplexity from per-token log-probabilities (natural log).
 * exp(-mean(logProbs)) by definition.
 *
 * Lower perplexity = better. A perfect model has perplexity 1
 * (probability 1 on the true token at every position). Uniform
 * over a vocabulary of size V has perplexity V.
 */
export function perplexity(logProbs: readonly number[]): number {
  if (logProbs.length === 0) {
    throw new Error('logProbs must be non-empty');
  }
  for (const lp of logProbs) {
    if (lp > 0 || !Number.isFinite(lp)) {
      throw new Error('logProbs must be ≤ 0 and finite (natural log)');
    }
  }
  const meanNll = -logProbs.reduce((a, b) => a + b, 0) / logProbs.length;
  return Math.exp(meanNll);
}

/**
 * Multiple-choice accuracy: fraction of items where prediction
 * equals target. Predictions and targets are typically integer
 * choice indices (A/B/C/D → 0/1/2/3).
 */
export function accuracy(
  predictions: readonly number[],
  targets: readonly number[],
): number {
  if (predictions.length !== targets.length) {
    throw new Error('predictions and targets must be the same length');
  }
  if (predictions.length === 0) return 0;
  let hits = 0;
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] === targets[i]) hits++;
  }
  return hits / predictions.length;
}

/**
 * Pass@k for code generation. For each task, you have n samples
 * and c of them pass. The unbiased estimator (Chen et al.,
 * HumanEval, 2021) for "probability that at least one of any k
 * samples passes":
 *
 *   pass@k = 1 - C(n - c, k) / C(n, k)
 *
 * Returns the mean across all tasks. Throws if k > n for any
 * task.
 *
 * @param passResults One row per task; each row is a list of
 *        booleans (one per sample, true = passes tests).
 * @param k How many samples we "try."
 */
export function passAtK(
  passResults: ReadonlyArray<readonly boolean[]>,
  k: number,
): number {
  if (k < 1 || !Number.isInteger(k)) {
    throw new Error('k must be a positive integer');
  }
  if (passResults.length === 0) return 0;

  let sum = 0;
  for (const row of passResults) {
    const n = row.length;
    if (k > n) {
      throw new Error(`k=${k} exceeds samples per task (n=${n})`);
    }
    const c = row.filter((p) => p).length;
    // 1 - C(n-c, k) / C(n, k); avoid overflow by computing the
    // ratio incrementally.
    if (n - c < k) {
      // All k-subsets contain at least one passing sample.
      sum += 1;
      continue;
    }
    // ratio = product_{i=0..k-1} (n-c-i) / (n-i)
    let ratio = 1;
    for (let i = 0; i < k; i++) {
      ratio *= (n - c - i) / (n - i);
    }
    sum += 1 - ratio;
  }
  return sum / passResults.length;
}

/**
 * Inter-model agreement: fraction of items where two models'
 * predictions match. Used as a (rough) signal for benchmark
 * contamination — unrelated models shouldn't agree at random-
 * chance + a lot.
 */
export function agreement(
  modelA: readonly number[],
  modelB: readonly number[],
): number {
  if (modelA.length !== modelB.length) {
    throw new Error('modelA and modelB must be the same length');
  }
  if (modelA.length === 0) return 0;
  let same = 0;
  for (let i = 0; i < modelA.length; i++) {
    if (modelA[i] === modelB[i]) same++;
  }
  return same / modelA.length;
}
