/**
 * Grouped-query attention (GQA) — Ainslie et al., 2023. Sits
 * between vanilla multi-head attention (every head has its own K
 * and V) and multi-query attention (one shared K/V across all
 * heads). Production LLMs almost universally use GQA: LLaMA-2 70B
 * (8-way), Mistral 7B (8-way), Qwen, DeepSeek, etc.
 *
 * The architectural change is local: keep `nQueryHeads` query
 * heads as in vanilla MHA, but only store `nKvHeads` key and
 * value heads (where `nKvHeads | nQueryHeads`). The KV cache
 * footprint scales with `nKvHeads`, not `nQueryHeads`, which is
 * the whole point.
 *
 * Pedagogical scope: this file models cache cost and the index
 * mapping query-head → kv-head. No actual attention math.
 */

/**
 * Per-token, per-layer cache cost in bytes for one transformer
 * layer with the given GQA config. K + V are stored once per
 * KV head, with `dHead` floats each at `bytesPerElement` per
 * float.
 *
 * Total per-request cache cost is this number times sequence
 * length times number of layers; for the cross-layer total see
 * `cacheBytesTotal`.
 */
export function cacheBytesPerToken(
  dHead: number,
  nKvHeads: number,
  bytesPerElement: number,
): number {
  if (dHead < 1 || nKvHeads < 1 || bytesPerElement < 1) {
    throw new Error('all arguments must be positive');
  }
  // Factor of 2: one matrix for K, one for V.
  return 2 * dHead * nKvHeads * bytesPerElement;
}

/**
 * Convenience: total cache bytes for a full generation run with
 * `seqLen` tokens across `nLayers` layers. Matches the kv-cache
 * lesson's `cacheBytes` formula when `nKvHeads == nQueryHeads`.
 */
export function cacheBytesTotal(
  seqLen: number,
  dHead: number,
  nKvHeads: number,
  nLayers: number,
  bytesPerElement: number,
): number {
  if (seqLen < 0) throw new Error('seqLen must be ≥ 0');
  if (nLayers < 1) throw new Error('nLayers must be ≥ 1');
  return seqLen * nLayers * cacheBytesPerToken(dHead, nKvHeads, bytesPerElement);
}

/**
 * Throws if (nQueryHeads, nKvHeads) is not a legal GQA config.
 * GQA requires nKvHeads to divide nQueryHeads (so query heads
 * partition cleanly into groups, each sharing one KV head).
 */
export function validateGroupConfig(nQueryHeads: number, nKvHeads: number): void {
  if (!Number.isInteger(nQueryHeads) || nQueryHeads < 1) {
    throw new Error('nQueryHeads must be a positive integer');
  }
  if (!Number.isInteger(nKvHeads) || nKvHeads < 1) {
    throw new Error('nKvHeads must be a positive integer');
  }
  if (nQueryHeads % nKvHeads !== 0) {
    throw new Error(
      `nKvHeads (${nKvHeads}) must divide nQueryHeads (${nQueryHeads})`,
    );
  }
}

/**
 * Map a query-head index to its shared KV-head index, given the
 * group factor `nQueryHeads / nKvHeads`. Query heads 0..(G-1)
 * share KV head 0; G..(2G-1) share KV head 1; and so on.
 */
export function kvHeadFor(
  queryHeadIdx: number,
  nQueryHeads: number,
  nKvHeads: number,
): number {
  validateGroupConfig(nQueryHeads, nKvHeads);
  if (queryHeadIdx < 0 || queryHeadIdx >= nQueryHeads) {
    throw new Error(`queryHeadIdx ${queryHeadIdx} out of range`);
  }
  const groupSize = nQueryHeads / nKvHeads;
  return Math.floor(queryHeadIdx / groupSize);
}

/**
 * Given a (nKvHeads × dHead) matrix, repeat each row
 * `nQueryHeads / nKvHeads` times to produce the per-query-head
 * matrix attention actually consumes. Pure data transform; no
 * allocation guarantees beyond "returns a fresh array."
 */
export function expandKvForGroup(
  kv: ReadonlyArray<readonly number[]>,
  nQueryHeads: number,
  nKvHeads: number,
): number[][] {
  validateGroupConfig(nQueryHeads, nKvHeads);
  if (kv.length !== nKvHeads) {
    throw new Error(
      `kv has ${kv.length} rows; expected nKvHeads = ${nKvHeads}`,
    );
  }
  const groupSize = nQueryHeads / nKvHeads;
  const out: number[][] = [];
  for (let h = 0; h < nKvHeads; h++) {
    const row = kv[h]!;
    for (let g = 0; g < groupSize; g++) {
      out.push(row.slice());
    }
  }
  return out;
}
