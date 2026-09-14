/**
 * KV cache — the inference-time optimization that makes
 * autoregressive generation feasible. At decode step t, the keys
 * and values for tokens 1..t-1 do not change; only the query for
 * token t is new. Caching K and V turns a per-step cost of
 * O(t·d² + t²·d) (recompute all K, V, attention) into O(d² + t·d)
 * (compute one new column of K and V, attend to the cache).
 *
 * Pedagogical scope: this file models FLOP *counts*, not real
 * tensor arithmetic. The sims render colored cells, not real
 * matmuls. The lesson is the asymptotic shape (n² cached vs n³
 * naive), not numerical precision.
 *
 * Formulas are for one attention head in one layer, ignoring
 * softmax and biases (which are O(t) and dominated). Multi-head
 * and multi-layer scale these by constant factors that don't
 * change the asymptotic story.
 */

/** Per-step FLOP counts for a generation run. */
export interface GenerationCost {
  /** FLOPs spent on step t (1-indexed). */
  readonly perStepFLOPs: readonly number[];
  /** Sum of all per-step costs. */
  readonly total: number;
}

/**
 * Naive generation: at every step, recompute K, V, and Q for the
 * entire prefix from scratch, then run full attention. Per step t:
 *   K = X @ W_k     → t · d² FLOPs
 *   V = X @ W_v     → t · d² FLOPs
 *   Q = X @ W_q     → t · d² FLOPs
 *   scores = Q @ K^T → t² · d FLOPs
 *   out = scores @ V → t² · d FLOPs
 * Total per step: 3·t·d² + 2·t²·d.
 */
export function generateNaive(seqLen: number, dModel: number): GenerationCost {
  if (seqLen < 1) throw new Error('seqLen must be ≥ 1');
  if (dModel < 1) throw new Error('dModel must be ≥ 1');
  const perStepFLOPs: number[] = [];
  let total = 0;
  for (let t = 1; t <= seqLen; t++) {
    const step = 3 * t * dModel * dModel + 2 * t * t * dModel;
    perStepFLOPs.push(step);
    total += step;
  }
  return { perStepFLOPs, total };
}

/**
 * Cached generation: K and V from prior steps are kept in memory.
 * Per step t:
 *   K_new = x_t @ W_k → d² FLOPs (one row)
 *   V_new = x_t @ W_v → d² FLOPs
 *   Q_new = x_t @ W_q → d² FLOPs
 *   scores = Q_new @ K_cache^T → t · d FLOPs
 *   out = scores @ V_cache → t · d FLOPs
 * Total per step: 3·d² + 2·t·d.
 */
export function generateWithCache(seqLen: number, dModel: number): GenerationCost {
  if (seqLen < 1) throw new Error('seqLen must be ≥ 1');
  if (dModel < 1) throw new Error('dModel must be ≥ 1');
  const perStepFLOPs: number[] = [];
  let total = 0;
  for (let t = 1; t <= seqLen; t++) {
    const step = 3 * dModel * dModel + 2 * t * dModel;
    perStepFLOPs.push(step);
    total += step;
  }
  return { perStepFLOPs, total };
}

/**
 * Memory footprint of the cache after `seqLen` tokens, in bytes.
 * One K matrix + one V matrix per layer, each of shape (seqLen × d),
 * stored at `bytesPerElement` per element (2 = fp16/bf16, 4 = fp32).
 */
export function cacheBytes(
  seqLen: number,
  dModel: number,
  nLayers: number,
  bytesPerElement: number,
): number {
  if (seqLen < 0 || dModel < 1 || nLayers < 1 || bytesPerElement < 1) {
    throw new Error('all arguments must be positive (seqLen may be 0)');
  }
  return 2 * seqLen * dModel * nLayers * bytesPerElement;
}
