/**
 * Rotary positional encoding (RoPE) — Su et al., 2021 (RoFormer).
 * Replaces the sinusoidal "add a position vector to embeddings"
 * scheme with "rotate Q and K by a position-dependent angle." The
 * defining property: the dot product of two rotated vectors
 * depends only on the *difference* of their positions.
 *
 * Used by LLaMA, Mistral, Qwen, GPT-NeoX, DeepSeek, and almost
 * every modern decoder-only LLM. The original transformer used
 * the additive sinusoidal scheme covered in the previous lesson.
 *
 * Pedagogical reference implementation; not optimized.
 */

/** Default frequency base. RoFormer and LLaMA both use 10000. */
export const ROPE_BASE_DEFAULT = 10000;

/**
 * Rotate a 2D coordinate by `theta` radians.
 * Returns [x', y'] = [x cos θ − y sin θ, x sin θ + y cos θ].
 */
export function rotatePair(
  pair: readonly [number, number],
  theta: number,
): [number, number] {
  const [x, y] = pair;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [x * c - y * s, x * s + y * c];
}

/**
 * Apply RoPE to a vector at the given position. Walks the vector
 * in (even, odd) pairs; pair index k is rotated by
 *   theta_k = pos · base^(-2k/d)
 * Returns a new vector of the same length.
 *
 * Throws if `vec.length` is odd — RoPE requires pairs.
 */
export function applyRope(
  vec: readonly number[],
  pos: number,
  base: number = ROPE_BASE_DEFAULT,
): number[] {
  if (vec.length % 2 !== 0) {
    throw new Error('applyRope requires an even-length vector (pairs of dims)');
  }
  const d = vec.length;
  const out = new Array<number>(d);
  for (let k = 0; k < d / 2; k++) {
    const theta = pos * Math.pow(base, (-2 * k) / d);
    const x0 = vec[2 * k]!;
    const x1 = vec[2 * k + 1]!;
    const [r0, r1] = rotatePair([x0, x1], theta);
    out[2 * k] = r0;
    out[2 * k + 1] = r1;
  }
  return out;
}

/**
 * The rotation angle applied to pair `k` of a vector of dimension
 * `d` at position `pos`. Surfaced for visualization and for tests
 * to cross-check `applyRope`.
 */
export function ropeAngle(
  pos: number,
  k: number,
  d: number,
  base: number = ROPE_BASE_DEFAULT,
): number {
  if (d % 2 !== 0) throw new Error('d must be even');
  if (k < 0 || k >= d / 2) throw new Error('k out of range');
  return pos * Math.pow(base, (-2 * k) / d);
}

/**
 * Dot product helper, kept local to avoid pulling linalg into the
 * RoPE module.
 */
export function dot(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error('length mismatch');
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}
