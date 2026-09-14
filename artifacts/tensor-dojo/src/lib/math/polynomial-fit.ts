/**
 * Closed-form polynomial regression via the normal equations.
 *
 * The reader lands here from the overfitting lesson. The story:
 * "with enough parameters, you can fit any set of n points exactly
 * — but the fit may not generalize." This module is the *fit* part.
 * The lesson's centerpiece calls `polyFit` once for each polynomial
 * degree it sweeps, so the math must be deterministic and exact at
 * the boundary case `n === degree + 1` (the function should reproduce
 * the points verbatim).
 *
 *   X is the design matrix of shape (n, degree+1). Row i is
 *     [1, x_i, x_i², ..., x_i^degree].
 *   w is the coefficient vector [w_0, w_1, ..., w_degree].
 *   y is the target vector.
 *
 * The fit solves  Xᵀ X w = Xᵀ y  with no L2. Regularization is
 * a separate function in `lib/math/regularization.ts`.
 *
 *   w = (Xᵀ X)⁻¹ Xᵀ y        (left-inverse on the (degree+1) grid)
 *   w = (Xᵀ X)⁻¹ Xᵀ y        for the n ≥ degree+1 over-determined case
 *
 * We use a small Gaussian elimination rather than pulling in a
 * linear-algebra library; (Xᵀ X) is at most (degree+1) × (degree+1)
 * for the lesson's degree ≤ 15 case, so 16×16 is trivial.
 */

/** Number of coefficients (degree + 1, including the constant). */
export function numCoefs(degree: number): number {
  return degree + 1;
}

/** Build the (n, degree+1) design matrix of monomial evaluations. */
export function designMatrix(xs: readonly number[], degree: number): number[][] {
  const n = xs.length;
  const cols = numCoefs(degree);
  const X: number[][] = Array.from({ length: n }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < n; i += 1) {
    const x = xs[i] ?? 0;
    for (let j = 0; j < cols; j += 1) {
      X[i]![j] = Math.pow(x, j);
    }
  }
  return X;
}

/** Evaluate a polynomial with coefficients `w` at a single x. */
export function evalPoly(w: readonly number[], x: number): number {
  // Horner's method — numerically stable, O(degree).
  let acc = 0;
  for (let i = w.length - 1; i >= 0; i -= 1) {
    acc = acc * x + (w[i] ?? 0);
  }
  return acc;
}

/** Evaluate a polynomial at a vector of x values. */
export function evalPolyVector(w: readonly number[], xs: readonly number[]): number[] {
  return xs.map((x) => evalPoly(w, x));
}

/**
 * Solve A x = b for a small square matrix A via Gaussian elimination
 * with partial pivoting. Returns null if A is singular. `A` is
 * mutated in place (columns of zeros avoided) for the elimination,
 * but a copy is taken first so callers' matrices stay intact.
 */
function solveLinear(A: readonly number[][], b: readonly number[]): number[] | null {
  const n = A.length;
  if (n === 0) return [];
  // Augmented copy.
  const M: number[][] = Array.from({ length: n }, (_, i) => {
    const row = A[i]!.slice();
    row.push(b[i] ?? 0);
    return row;
  });
  // Forward elimination with partial pivoting.
  for (let k = 0; k < n; k += 1) {
    // Find the row with the largest |M[i][k]| for i >= k.
    let pivot = k;
    let best = Math.abs(M[k]![k]!);
    for (let i = k + 1; i < n; i += 1) {
      const v = Math.abs(M[i]![k]!);
      if (v > best) {
        best = v;
        pivot = i;
      }
    }
    if (best < 1e-12) return null; // singular
    if (pivot !== k) {
      const tmp = M[k]!;
      M[k] = M[pivot]!;
      M[pivot] = tmp;
    }
    // Eliminate below.
    const pivotRow = M[k]!;
    const pivotVal = pivotRow[k]!;
    for (let i = k + 1; i < n; i += 1) {
      const factor = M[i]![k]! / pivotVal;
      for (let j = k; j <= n; j += 1) {
        M[i]![j] = M[i]![j]! - factor * pivotRow[j]!;
      }
    }
  }
  // Back-substitution.
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = M[i]![n]!;
    for (let j = i + 1; j < n; j += 1) s -= M[i]![j]! * x[j]!;
    const diag = M[i]![i]!;
    if (Math.abs(diag) < 1e-12) return null;
    x[i] = s / diag;
  }
  return x;
}

/**
 * Closed-form polynomial fit (no regularization).
 *
 *   w = (Xᵀ X)⁻¹ Xᵀ y
 *
 * For n = degree + 1 this is exact (interpolates the points
 * verbatim). For n > degree + 1 it minimizes squared error in
 * the standard least-squares sense.
 *
 * Returns `null` if XᵀX is singular (e.g. all x's equal, or
 * degree ≥ n with collinear columns).
 */
export function polyFit(
  xs: readonly number[],
  ys: readonly number[],
  degree: number,
): number[] | null {
  if (xs.length !== ys.length) {
    throw new Error(
      `polyFit: xs and ys must have the same length (got ${xs.length} vs ${ys.length})`,
    );
  }
  if (degree < 0) {
    throw new Error(`polyFit: degree must be non-negative (got ${degree})`);
  }
  if (xs.length === 0) return [];
  const X = designMatrix(xs, degree);
  const cols = numCoefs(degree);
  // Xᵀ X (cols × cols).
  const XTX: number[][] = Array.from({ length: cols }, () =>
    new Array<number>(cols).fill(0),
  );
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      let s = 0;
      for (let k = 0; k < xs.length; k += 1) {
        s += X[k]![i]! * X[k]![j]!;
      }
      XTX[i]![j] = s;
    }
  }
  // Xᵀ y (cols).
  const XTy = new Array<number>(cols).fill(0);
  for (let i = 0; i < cols; i += 1) {
    let s = 0;
    for (let k = 0; k < xs.length; k += 1) {
      s += X[k]![i]! * (ys[k] ?? 0);
    }
    XTy[i] = s;
  }
  return solveLinear(XTX, XTy);
}

/**
 * Mean squared error between predictions and targets.
 */
export function mse(ys: readonly number[], yhats: readonly number[]): number {
  if (ys.length !== yhats.length) {
    throw new Error(
      `mse: length mismatch (${ys.length} vs ${yhats.length})`,
    );
  }
  if (ys.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < ys.length; i += 1) {
    const d = (yhats[i] ?? 0) - (ys[i] ?? 0);
    s += d * d;
  }
  return s / ys.length;
}

/**
 * A fixed deterministic 1D regression dataset. 20 points on [-1, 1]
 * with sin(2x) target + deterministic noise. Used by the overfitting
 * and weight-decay lessons' centerpieces.
 */
export function syntheticRegression(n = 20, seed = 0): { xs: number[]; ys: number[]; clean: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  const clean: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const x = -1 + (2 * i) / Math.max(1, n - 1);
    const c = Math.sin(2 * x);
    // Deterministic noise: hash(i + seed) into [-0.15, 0.15].
    const h = Math.sin((i + 1) * 2654435761 * 0.5 + seed * 0.13) * 0.5 + 0.5;
    const eps = (h - 0.5) * 0.3;
    xs.push(x);
    clean.push(c);
    ys.push(c + eps);
  }
  return { xs, ys, clean };
}
