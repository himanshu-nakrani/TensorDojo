/**
 * Flash attention — Dao et al., 2022. The kernel-level
 * optimization that made long-context attention practical on
 * existing hardware. The trick is not algorithmic: flash
 * computes the same softmax-attention output as the textbook
 * formula, bit-for-bit. What it changes is the *memory access
 * pattern*: never materialize the n×n score matrix in HBM
 * (slow, far from the SMs), instead tile Q, K, V into blocks
 * that fit in SRAM (fast, on-chip) and compute attention
 * block-by-block with a running softmax.
 *
 * The reason this matters: HBM bandwidth, not FLOPs, is the
 * binding constraint for attention at long context. A modern
 * H100 has ~3 TB/s HBM but ~3 PF/s of FLOPS — the FLOPs are
 * idle waiting for memory most of the time. Flash attention
 * reduces HBM traffic by roughly the block factor B, which is
 * what makes 32k-context inference tractable.
 *
 * Pedagogical scope: this file models *memory traffic counts*
 * in bytes (or "ops" — we use bytes for concreteness; flash
 * papers use I/Os). Bytes are at fp16 = 2 bytes per element.
 * The actual attention math is unchanged.
 */

const BYTES_PER_EL = 2; // fp16/bf16
const SRAM_BUDGET_BYTES = 100 * 1024; // ~100 KB SRAM per SM (A100/H100 ballpark)

export interface AttentionMemoryStats {
  /** HBM reads in bytes. */
  readonly hbmReads: number;
  /** HBM writes in bytes. */
  readonly hbmWrites: number;
  /** Sum of reads and writes. */
  readonly hbmTotal: number;
  /** Peak SRAM working-set in bytes (a fixed-cost-per-SM measure). */
  readonly sramPeak: number;
  /** Whether the peak SRAM fits in the SRAM budget. */
  readonly fitsInSram: boolean;
}

/**
 * Naive (textbook) attention memory profile.
 *
 * Read Q, K, V from HBM (3·n·d bytes). Compute S = QK^T (no
 * HBM traffic for the multiplication, but the n×n result is
 * too large for SRAM so it gets *written back* to HBM:
 * n²·BYTES_PER_EL bytes write, then read again for the softmax
 * + reduction). Then compute P = softmax(S) and O = PV; O
 * is written to HBM (n·d bytes).
 *
 * Dominant term: 2·n²·BYTES_PER_EL (write+read the score
 * matrix). For n=4096 this is 64 MB — much larger than the
 * inputs themselves at this dimension.
 */
export function attentionMemoryNaive(
  seqLen: number,
  dHead: number,
): AttentionMemoryStats {
  if (seqLen < 1 || dHead < 1) {
    throw new Error('seqLen and dHead must be ≥ 1');
  }
  const n = seqLen;
  const d = dHead;
  const inputBytes = 3 * n * d * BYTES_PER_EL; // Q, K, V
  const scoreBytes = n * n * BYTES_PER_EL;     // S = QK^T
  const outputBytes = n * d * BYTES_PER_EL;    // O

  // Reads: Q, K, V once + S once (read back for softmax) + V again for O (but V is small; the
  // dominant read is S). For pedagogical clarity we keep just the dominant terms.
  const hbmReads = inputBytes + scoreBytes;
  // Writes: S (large) + O.
  const hbmWrites = scoreBytes + outputBytes;
  const hbmTotal = hbmReads + hbmWrites;
  // Peak SRAM: the score matrix has to live somewhere; in naive attention it doesn't fit.
  const sramPeak = scoreBytes;
  const fitsInSram = sramPeak <= SRAM_BUDGET_BYTES;

  return { hbmReads, hbmWrites, hbmTotal, sramPeak, fitsInSram };
}

/**
 * Flash attention memory profile.
 *
 * Tile Q, K, V into blocks of size B × d. Compute attention
 * block-by-block in SRAM with an online (running) softmax.
 * Never write the full score matrix to HBM.
 *
 * Pedagogical simplification: the actual algorithm has small
 * Q-block re-streaming traffic of order n²·d/B (smaller than
 * naive's n² because the n²-dominated score matrix is gone,
 * but not zero). The headline story most explainers use —
 * "flash HBM is O(n·d), naive HBM is O(n²)" — drops that
 * sub-leading term. This model follows the explainer story:
 * flash HBM = O(n·d) plus a small block-streaming overhead.
 * Real implementations land between the two; ours overstates
 * the win by roughly the Q-block re-streaming factor.
 *
 * Reads: Q once, K once, V once, plus a small streaming term
 * for the K/V tile re-loads inside the inner loop.
 * Writes: O once.
 */
export function attentionMemoryFlash(
  seqLen: number,
  dHead: number,
  blockSize: number = 64,
): AttentionMemoryStats {
  if (seqLen < 1 || dHead < 1 || blockSize < 1) {
    throw new Error('all args must be ≥ 1');
  }
  const n = seqLen;
  const d = dHead;
  const B = Math.min(blockSize, n);

  // Q, K, V each read once from HBM (kept in SRAM during the
  // per-tile computation, with the outer loop arranged so the
  // re-streaming is at most a small multiplicative overhead).
  const qReads = n * d * BYTES_PER_EL;
  const kReads = n * d * BYTES_PER_EL;
  const vReads = n * d * BYTES_PER_EL;
  // Small overhead from the block-streaming: a factor of
  // (n/B) on the K/V side because each Q-block iteration
  // streams the prior K/V tiles. We model this as a single
  // 2·(n/B)·B·d = 2·n·d term — i.e., one extra K/V pass.
  // This is intentionally generous to flash; the goal is to
  // make the qualitative O(n·d) vs O(n²) story crisp.
  const streamingOverhead = 2 * n * d * BYTES_PER_EL;
  const hbmReads = qReads + kReads + vReads + streamingOverhead;
  // Output: written once. Plus a tiny per-query log-sum-exp
  // statistic (n bytes), negligible.
  const hbmWrites = n * d * BYTES_PER_EL;
  const hbmTotal = hbmReads + hbmWrites;
  // Peak SRAM: one Q block + one K block + one V block + the
  // per-block score tile (B × B). All fit in ~100 KB for B=64.
  const sramPeak = (3 * B * d + B * B) * BYTES_PER_EL;
  const fitsInSram = sramPeak <= SRAM_BUDGET_BYTES;

  return { hbmReads, hbmWrites, hbmTotal, sramPeak, fitsInSram };
}

/**
 * Ratio naive / flash for total HBM traffic. Higher is better;
 * a real H100 sees 5–10× speedups on long contexts because HBM
 * bandwidth is the binding constraint at those sequence lengths.
 */
export function speedupRatio(
  seqLen: number,
  dHead: number,
  blockSize: number = 64,
): number {
  const naive = attentionMemoryNaive(seqLen, dHead).hbmTotal;
  const flash = attentionMemoryFlash(seqLen, dHead, blockSize).hbmTotal;
  return naive / flash;
}

export { SRAM_BUDGET_BYTES };
