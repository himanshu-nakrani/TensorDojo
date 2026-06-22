/**
 * Gradient-checkpointing memory / compute model.
 *
 * Inputs: layer count N, anchor count K (1..N).
 * Outputs:
 *   - peak activation memory units (one unit = one layer's activation)
 *   - total forward FLOPs (baseline forward = N units; checkpointing
 *     adds re-computation of each chunk during backward).
 *
 * The model is intentionally simple: every layer costs the same to
 * forward and to store an activation for. Real systems vary by layer
 * type but the scaling story (memory vs compute trade) is captured.
 */

export interface CheckpointStats {
  /** Anchors saved during the forward pass (chunk boundaries + endpoints). */
  anchorMem: number;
  /** Peak working memory inside a chunk during recomputation on backward. */
  chunkMem: number;
  /** Total peak memory observed during a training step. */
  peakMem: number;
  /** Forward FLOPs (in units of "one layer forward"). */
  fwdFlops: number;
  /** Backward + recomputed-forward FLOPs (units of "one layer forward"). */
  bwdFlops: number;
  /** Total FLOPs per training step. */
  totalFlops: number;
}

export function checkpointStats(
  N: number,
  K: number,
): CheckpointStats {
  if (N <= 0) {
    return {
      anchorMem: 0,
      chunkMem: 0,
      peakMem: 0,
      fwdFlops: 0,
      bwdFlops: 0,
      totalFlops: 0,
    };
  }
  // Clamp K to [1, N].
  const anchors = Math.max(1, Math.min(N, Math.round(K)));
  const chunkSize = Math.ceil(N / anchors);

  // Memory during forward: we keep `anchors + 1` checkpoints (input + one
  // per chunk endpoint). Conceptually the input counts as the first anchor.
  const anchorMem = anchors + 1;
  // During backward inside a chunk we need to re-materialize up to
  // chunkSize activations on top of the anchor itself.
  const chunkMem = chunkSize;
  const peakMem = anchorMem + chunkMem;

  // Forward FLOPs: N layers, one pass.
  const fwdFlops = N;
  // Backward: textbook backward is ~2x forward for the gradient
  // computation itself. With checkpointing, we additionally re-run the
  // forward for every chunk, which is another N layers of forward.
  const recomputeFlops = anchors < N ? N : 0;
  const bwdFlops = 2 * N + recomputeFlops;
  const totalFlops = fwdFlops + bwdFlops;
  return {
    anchorMem,
    chunkMem,
    peakMem,
    fwdFlops,
    bwdFlops,
    totalFlops,
  };
}

/** Number of anchors that minimises peak memory (sqrt-N rule). */
export function sqrtNAnchors(N: number): number {
  return Math.max(1, Math.round(Math.sqrt(N)));
}
