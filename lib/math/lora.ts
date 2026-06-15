/**
 * Low-rank factorization tools for lesson 30.
 * compose multiplies the factors.
 * svdLowRankApprox finds the best rank-r approximation via power iteration.
 * fitLowRank fits the factors via gradient descent.
 */

import { mulberry32 } from '@/lib/math/random';

// ---------------------------------------------------------------------------
// Internal vector / matrix helpers (self-contained — no external linalg import)
// ---------------------------------------------------------------------------

/** Dot product of two vectors. */
function vecDot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) s += a[i]! * b[i]!;
  return s;
}

/** L2 norm of a vector. */
function vecNorm(a: readonly number[]): number {
  return Math.sqrt(vecDot(a, a));
}

/** Scale each element of a vector by `s`. */
function vecScale(a: readonly number[], s: number): number[] {
  return a.map((x) => x * s);
}

/** Element-wise subtract: a - b. */
function vecSub(a: readonly number[], b: readonly number[]): number[] {
  return a.map((x, i) => x - b[i]!);
}

/** Matrix–vector product: (m×n) · (n,) → (m,). */
function matVec(M: readonly (readonly number[])[], v: readonly number[]): number[] {
  const m = M.length;
  const out = new Array<number>(m).fill(0);
  for (let i = 0; i < m; i += 1) out[i] = vecDot(M[i]!, v);
  return out;
}

/** Transpose-matrix × vector: M^T · v, where M is m×n → result is (n,). */
function matTVec(M: readonly (readonly number[])[], v: readonly number[]): number[] {
  const m = M.length;
  const n = M[0]!.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) out[j] = (out[j] ?? 0) + M[i]![j]! * v[i]!;
  }
  return out;
}

/**
 * Outer product u · v^T → m×n matrix,
 * scaled by `sigma` so the result is sigma * u * v^T.
 */
function outerScaled(
  u: readonly number[],
  v: readonly number[],
  sigma: number,
): number[][] {
  const m = u.length;
  const n = v.length;
  const out: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) {
      out[i]![j] = sigma * u[i]! * v[j]!;
    }
  }
  return out;
}

/** Deep-copy a matrix (array of arrays). */
function matCopy(M: readonly (readonly number[])[]): number[][] {
  return M.map((row) => row.slice() as number[]);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Multiply two matrices: A (m×r) · B (r×n) → m×n.
 * Throws if the inner dimensions don't match.
 */
export function compose(
  A: readonly (readonly number[])[],
  B: readonly (readonly number[])[],
): number[][] {
  const m = A.length;
  if (m === 0) return [];
  const r = A[0]!.length;
  if (B.length !== r) {
    throw new Error(
      `compose: inner dimension mismatch — A has ${r} columns but B has ${B.length} rows`,
    );
  }
  const n = B[0]!.length;
  const C: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < m; i += 1) {
    for (let k = 0; k < r; k += 1) {
      const aik = A[i]![k]!;
      for (let j = 0; j < n; j += 1) {
        C[i]![j] = (C[i]![j] ?? 0) + aik * B[k]![j]!;
      }
    }
  }
  return C;
}

/**
 * Number of parameters in the LoRA factorization: (m + n) · r.
 * This counts the entries of A (m×r) plus the entries of B (r×n).
 */
export function paramCount(m: number, n: number, r: number): number {
  return (m + n) * r;
}

/**
 * Frobenius distance between two matrices: sqrt(Σ (W[i][j] - W_hat[i][j])²).
 */
export function frobeniusError(
  W: readonly (readonly number[])[],
  W_hat: readonly (readonly number[])[],
): number {
  let sum = 0;
  for (let i = 0; i < W.length; i += 1) {
    const row = W[i]!;
    const rowHat = W_hat[i]!;
    for (let j = 0; j < row.length; j += 1) {
      const d = row[j]! - rowHat[j]!;
      sum += d * d;
    }
  }
  return Math.sqrt(sum);
}

/**
 * Best rank-r approximation of W via truncated SVD (power iteration + deflation).
 * Returns A (m×r) and B (r×n) such that A·B ≈ W.
 *
 * Algorithm for each rank k = 0..r-1:
 *   1. Initialize a random unit-norm right singular vector v_k.
 *   2. Power-iterate on W^T·W to refine v_k (200 iterations).
 *   3. Compute σ_k = ‖W v_k‖, u_k = W v_k / σ_k.
 *   4. Deflate: W ← W - σ_k u_k v_k^T.
 * Factors split σ symmetrically: A[i][k] = u_k[i]·√σ_k, B[k][j] = √σ_k·v_k[j].
 */
export function svdLowRankApprox(
  W: readonly (readonly number[])[],
  r: number,
): { A: number[][]; B: number[][] } {
  const m = W.length;
  const n = W[0]!.length;

  // Clamp r to the numerical rank limit
  const rClamped = Math.min(r, m, n);

  const A: number[][] = Array.from({ length: m }, () => new Array<number>(rClamped).fill(0));
  const B: number[][] = Array.from({ length: rClamped }, () => new Array<number>(n).fill(0));

  // Work on a mutable copy so deflation doesn't mutate the caller's matrix
  const Ww = matCopy(W);

  // Deterministic seed derived from matrix dimensions only
  const rand = mulberry32(0xdeadbeef ^ (m * 1000003) ^ (n * 999983));

  for (let k = 0; k < rClamped; k += 1) {
    // --- Step 1: random unit-norm initial vector v (length n) ---
    let v = new Array<number>(n);
    for (let j = 0; j < n; j += 1) v[j] = rand() - 0.5;
    const vn = vecNorm(v);
    v = vecScale(v, 1 / (vn === 0 ? 1 : vn));

    // --- Step 2: power iteration on W^T W ---
    for (let iter = 0; iter < 200; iter += 1) {
      // v ← W^T (W v), then normalize
      let wv = matVec(Ww, v);     // m-vector
      let wtWv = matTVec(Ww, wv); // n-vector
      const norm = vecNorm(wtWv);
      if (norm < 1e-15) break;    // degenerate direction (zero singular value)
      v = vecScale(wtWv, 1 / norm);
    }

    // --- Step 3: compute σ and u ---
    const Wv = matVec(Ww, v);    // m-vector = σ·u
    const sigma = vecNorm(Wv);
    if (sigma < 1e-15) {
      // Remaining singular values are all zero; leave the rest of A, B as zero
      break;
    }
    const u = vecScale(Wv, 1 / sigma);

    // Split: A col k = u·√σ, B row k = v·√σ
    const sqrtSigma = Math.sqrt(sigma);
    for (let i = 0; i < m; i += 1) A[i]![k] = u[i]! * sqrtSigma;
    for (let j = 0; j < n; j += 1) B[k]![j] = v[j]! * sqrtSigma;

    // --- Step 4: deflate W ← W - σ·u·v^T ---
    const rank1 = outerScaled(u, v, sigma);
    for (let i = 0; i < m; i += 1) {
      for (let j = 0; j < n; j += 1) {
        Ww[i]![j] = (Ww[i]![j] ?? 0) - rank1[i]![j]!;
      }
    }
  }

  return { A, B };
}

/**
 * Fit A and B to minimize ‖A·B - target‖²_F via gradient descent.
 * Returns the final factors and the loss trajectory.
 *
 * Gradients:
 *   ∂L/∂A = 2 · (A·B - target) · B^T
 *   ∂L/∂B = 2 · A^T · (A·B - target)
 * Loss recorded before each update.
 */
export function fitLowRank(
  target: readonly (readonly number[])[],
  r: number,
  steps: number,
  lr: number,
): { A: number[][]; B: number[][]; losses: number[] } {
  const m = target.length;
  const n = target[0]!.length;

  // Initialise A and B with small random values in [-0.1, 0.1]
  const rand = mulberry32(42);
  const A: number[][] = Array.from({ length: m }, () =>
    Array.from({ length: r }, () => (rand() - 0.5) * 0.2),
  );
  const B: number[][] = Array.from({ length: r }, () =>
    Array.from({ length: n }, () => (rand() - 0.5) * 0.2),
  );

  const losses: number[] = [];

  for (let step = 0; step < steps; step += 1) {
    // Residual: E = A·B - target  (m×n)
    const AB = compose(A, B);
    const E: number[][] = Array.from({ length: m }, (_, i) =>
      Array.from({ length: n }, (_, j) => AB[i]![j]! - (target[i]![j] ?? 0)),
    );

    // Loss = ‖E‖²_F (record before update)
    let loss = 0;
    for (let i = 0; i < m; i += 1) for (let j = 0; j < n; j += 1) loss += E[i]![j]! ** 2;
    losses.push(loss);

    // ∂L/∂A = 2 · E · B^T  (m×r)
    // ∂L/∂B = 2 · A^T · E  (r×n)
    const gradA: number[][] = Array.from({ length: m }, () => new Array<number>(r).fill(0));
    const gradB: number[][] = Array.from({ length: r }, () => new Array<number>(n).fill(0));

    for (let i = 0; i < m; i += 1) {
      for (let k = 0; k < r; k += 1) {
        let s = 0;
        for (let j = 0; j < n; j += 1) s += E[i]![j]! * B[k]![j]!;
        gradA[i]![k] = 2 * s;
      }
    }

    for (let k = 0; k < r; k += 1) {
      for (let j = 0; j < n; j += 1) {
        let s = 0;
        for (let i = 0; i < m; i += 1) s += A[i]![k]! * E[i]![j]!;
        gradB[k]![j] = 2 * s;
      }
    }

    // Update
    for (let i = 0; i < m; i += 1)
      for (let k = 0; k < r; k += 1)
        A[i]![k] = (A[i]![k] ?? 0) - lr * gradA[i]![k]!;

    for (let k = 0; k < r; k += 1)
      for (let j = 0; j < n; j += 1)
        B[k]![j] = (B[k]![j] ?? 0) - lr * gradB[k]![j]!;
  }

  return { A, B, losses };
}
