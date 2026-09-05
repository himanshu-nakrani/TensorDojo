/**
 * Sinusoidal positional encoding (Vaswani et al., 2017).
 *
 * PE(pos, 2i)     = sin(pos / 10000^(2i / d))
 * PE(pos, 2i + 1) = cos(pos / 10000^(2i / d))
 *
 * The wavelengths form a geometric progression from 2π (i=0) to
 * 10000 · 2π (i = d/2 − 1). The lower dimensions encode nearby
 * positions; the higher dimensions encode far-apart positions.
 */

/** The shared base used in the exponent. */
const PE_BASE = 10000;

/**
 * Compute the full positional encoding matrix for positions [0, maxPos).
 * Shape: [maxPos][d]. Each row is a position's d-dimensional vector.
 */
export function sinusoidalPE(maxPos: number, d: number): number[][] {
  if (maxPos <= 0) return [];
  if (d <= 0 || d % 2 !== 0) {
    throw new Error(`sinusoidalPE: d must be a positive even integer (got ${d})`);
  }
  const out: number[][] = Array.from({ length: maxPos }, () =>
    new Array<number>(d).fill(0),
  );
  const halfD = d / 2;
  for (let pos = 0; pos < maxPos; pos += 1) {
    for (let i = 0; i < halfD; i += 1) {
      // PE(pos, 2i)   = sin(pos / PE_BASE^(i / halfD))
      // PE(pos, 2i+1) = cos(pos / PE_BASE^(i / halfD))
      // The exponent i / halfD equals 2i / d in dim space, matching the
      // Vaswani formula. The resulting wavelength per component is
      // 2π · PE_BASE^(i / halfD) — what the sim labels.
      const denom = Math.pow(PE_BASE, i / halfD);
      const angle = pos / denom;
      const row = out[pos]!;
      row[2 * i] = Math.sin(angle);
      row[2 * i + 1] = Math.cos(angle);
    }
  }
  return out;
}

/**
 * Compute the PE for a single position in O(d) time, avoiding the O(pos * d)
 * matrix allocation of the full `sinusoidalPE(pos + 1, d)` call.
 */
export function sinusoidalPE1D(pos: number, d: number): number[] {
  if (d <= 0 || d % 2 !== 0) {
    throw new Error(`sinusoidalPE: d must be a positive even integer (got ${d})`);
  }
  const row = new Array<number>(d);
  const halfD = d / 2;
  for (let i = 0; i < halfD; i += 1) {
    const denom = Math.pow(PE_BASE, i / halfD);
    const angle = pos / denom;
    row[2 * i] = Math.sin(angle);
    row[2 * i + 1] = Math.cos(angle);
  }
  return row;
}

/** One PE component: PE(pos, dim) without allocating the full d-vector. */
export function sinusoidalPEComponent(pos: number, dim: number, d: number): number {
  if (d <= 0 || d % 2 !== 0) {
    throw new Error(`sinusoidalPE: d must be a positive even integer (got ${d})`);
  }
  if (dim < 0 || dim >= d) return 0;
  const i = Math.floor(dim / 2);
  const denom = Math.pow(PE_BASE, i / (d / 2));
  const angle = pos / denom;
  return dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
}
