/**
 * Small vector and matrix helpers for lessons. Intentionally limited to
 * what the lessons need: 2D and n-D dot product, vector magnitude, cosine
 * similarity, projection, normalisation, 2D matrix math. No linear
 * algebra system — anything richer reaches for numpy / a real lab.
 */

/** Dot product of two equal-length vectors. Throws on length mismatch. */
export function dot(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `dot: length mismatch (${a.length} vs ${b.length})`,
    );
  }
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += (a[i] as number) * (b[i] as number);
  }
  return s;
}

/** Euclidean magnitude (L2 norm) of a vector. */
export function magnitude(a: readonly number[]): number {
  return Math.sqrt(dot(a, a));
}

/**
 * Cosine of the angle between two non-zero vectors.
 * Returns 1 for identical directions, -1 for opposite, 0 for orthogonal.
 * Undefined for zero vectors — we return 0 as a safe default.
 */
export function cosTheta(a: readonly number[], b: readonly number[]): number {
  const ma = magnitude(a);
  const mb = magnitude(b);
  if (ma === 0 || mb === 0) return 0;
  return dot(a, b) / (ma * mb);
}

/** Angle in radians between two non-zero vectors, in [0, π]. */
export function angleBetween(a: readonly number[], b: readonly number[]): number {
  const c = Math.max(-1, Math.min(1, cosTheta(a, b)));
  return Math.acos(c);
}

/**
 * Length-1 vector in the same direction. Returns a zero vector if `a`
 * is zero (the convention is that the unit vector at the origin is
 * undefined, but the safe thing for the lessons is to return a zero
 * vector and let the caller skip the operation).
 */
export function normalize(a: readonly number[]): number[] {
  const m = magnitude(a);
  if (m === 0) return a.map(() => 0);
  return a.map((x) => x / m);
}

/**
 * Projection of `a` onto `b`. The result is the vector along `b` such
 * that `a − proj_b a` is perpendicular to `b`. If `b` is the zero
 * vector, the projection is undefined; we return the zero vector.
 */
export function projection(
  a: readonly number[],
  b: readonly number[],
): number[] {
  const bb = dot(b, b);
  if (bb === 0) return a.map(() => 0);
  const scale = dot(a, b) / bb;
  return b.map((x) => x * scale);
}

/** Residual of `a` after projecting onto `b`: a − proj_b a. */
export function residual(
  a: readonly number[],
  b: readonly number[],
): number[] {
  const proj = projection(a, b);
  return a.map((x, i) => x - (proj[i] as number));
}

/** Dot product scaled by 1/√d_k — the score formula in scaled attention. */
export function scaledDot(
  q: readonly number[],
  k: readonly number[],
  dK: number,
): number {
  if (dK <= 0) {
    throw new Error(`scaledDot: d_k must be positive (got ${dK})`);
  }
  return dot(q, k) / Math.sqrt(dK);
}

/**
 * 2D matrix product of `a` (rows×k) by `b` (k×cols). Standard O(rows·k·cols).
 * Throws on dimension mismatch.
 */
export function matMul(
  a: readonly (readonly number[])[],
  b: readonly (readonly number[])[],
): number[][] {
  const rows = a.length;
  if (rows === 0) return [];
  const k = a[0]!.length;
  if (b.length !== k) {
    throw new Error(`matMul: inner dim mismatch (${k} vs ${b.length})`);
  }
  const cols = b[0]!.length;
  const out: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let kk = 0; kk < k; kk++) {
        s += (a[i] as readonly number[])[kk]! * (b[kk] as readonly number[])[j]!;
      }
      out[i]![j] = s;
    }
  }
  return out;
}

/** Transpose an n×m matrix to m×n. */
export function transpose(
  a: readonly (readonly number[])[],
): number[][] {
  if (a.length === 0) return [];
  const cols = a[0]!.length;
  const out: number[][] = Array.from({ length: cols }, () =>
    new Array<number>(a.length).fill(0),
  );
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < cols; j++) {
      out[j]![i] = (a[i] as readonly number[])[j]!;
    }
  }
  return out;
}
