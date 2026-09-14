/**
 * Sliding-window attention mask helpers.
 *
 * A causal sliding-window mask: token i may attend to keys j where
 *   max(0, i - w) <= j <= i.
 * Window size w of "infinity" reduces to the full causal mask.
 */

export type MaskKind = 'full' | 'sliding';

export interface MaskCell {
  i: number;
  j: number;
  attended: boolean;
}

/** True if (i, j) is attended under the given mask kind and window. */
export function isAttended(
  i: number,
  j: number,
  kind: MaskKind,
  w: number,
): boolean {
  if (j > i) return false;
  if (kind === 'full') return true;
  return j >= i - w;
}

/** Count attended pairs in an n × n mask. */
export function attendedCount(n: number, kind: MaskKind, w: number): number {
  if (kind === 'full') {
    return (n * (n + 1)) / 2;
  }
  // For each row i, the number of columns is min(i + 1, w + 1).
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    total += Math.min(i + 1, w + 1);
  }
  return total;
}

/**
 * Effective receptive field of a token after L stacked sliding-window
 * layers with window w. Each layer extends reach by w, capped at the
 * total context length.
 */
export function effectiveReceptiveField(
  L: number,
  w: number,
  n: number,
): number {
  return Math.min(L * w + 1, n);
}
