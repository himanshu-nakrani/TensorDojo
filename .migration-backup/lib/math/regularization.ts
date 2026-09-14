/**
 * L2-regularized polynomial fit + AdamW-style decoupled weight decay.
 *
 * The weight-decay lesson uses both forms:
 *
 *   1. `l2PolyFit` — closed-form L2-regularized least squares.
 *      The regularized normal equations are
 *        (Xᵀ X + λ I) w = Xᵀ y
 *      which keeps the system well-conditioned for high-degree
 *      polynomials. This is the "L2 in the loss" form, equivalent
 *      to a Gaussian prior on the weights.
 *
 *   2. `adamwDecay` — the decoupled weight decay step used by
 *      AdamW (Loshchilov & Hutter 2019). The update is
 *        w ← w − η (g + λ w)
 *      which is *not* the same as adding λ‖w‖² to the loss
 *      (classic L2). The decoupled form shrinks every weight
 *      by a factor (1 − η λ) per step, regardless of the
 *      gradient magnitude, so weights that are already small
 *      stay small even when their gradient is zero. The lesson
 *      mentions both and notes AdamW is the standard modern form.
 */

/**
 * Closed-form L2-regularized polynomial fit.
 *
 *   (Xᵀ X + λ I) w = Xᵀ y
 *
 * The bias term (w[0]) is *not* regularized — the convention
 * used by every modern regularizer. The test file asserts
 * this explicitly.
 *
 * Returns the coefficient vector, or null if the system is
 * still singular (only possible if all x's are equal AND λ=0;
 * with any λ > 0 the diagonal ridge makes XᵀX + λI PD).
 */
export function l2PolyFit(
  xs: readonly number[],
  ys: readonly number[],
  degree: number,
  lambda: number,
  options?: { regularizeBias?: boolean },
): number[] | null {
  if (xs.length !== ys.length) {
    throw new Error(
      `l2PolyFit: xs and ys must have the same length (got ${xs.length} vs ${ys.length})`,
    );
  }
  if (degree < 0) {
    throw new Error(`l2PolyFit: degree must be non-negative (got ${degree})`);
  }
  if (lambda < 0) {
    throw new Error(`l2PolyFit: lambda must be non-negative (got ${lambda})`);
  }
  if (xs.length === 0) return [];
  const cols = degree + 1;
  // Build XᵀX and Xᵀy.
  const XTX: number[][] = Array.from({ length: cols }, () =>
    new Array<number>(cols).fill(0),
  );
  const XTy = new Array<number>(cols).fill(0);
  for (let i = 0; i < xs.length; i += 1) {
    const x = xs[i] ?? 0;
    const y = ys[i] ?? 0;
    for (let j = 0; j < cols; j += 1) {
      XTy[j] = (XTy[j] ?? 0) + Math.pow(x, j) * y;
      for (let k = 0; k < cols; k += 1) {
        XTX[j]![k] = (XTX[j]![k] ?? 0) + Math.pow(x, j) * Math.pow(x, k);
      }
    }
  }
  const regularizeBias = options?.regularizeBias ?? false;
  // Add the ridge λI (skipping the bias row/col by default).
  for (let i = regularizeBias ? 0 : 1; i < cols; i += 1) {
    XTX[i]![i] = (XTX[i]![i] ?? 0) + lambda;
  }
  // Reuse the same Gaussian elimination as the unregularized fit.
  return solveLinearRidge(XTX, XTy);
}

function solveLinearRidge(A: readonly number[][], b: readonly number[]): number[] | null {
  const n = A.length;
  if (n === 0) return [];
  const M: number[][] = Array.from({ length: n }, (_, i) => {
    const row = A[i]!.slice();
    row.push(b[i] ?? 0);
    return row;
  });
  for (let k = 0; k < n; k += 1) {
    let pivot = k;
    let best = Math.abs(M[k]![k]!);
    for (let i = k + 1; i < n; i += 1) {
      const v = Math.abs(M[i]![k]!);
      if (v > best) {
        best = v;
        pivot = i;
      }
    }
    if (best < 1e-12) return null;
    if (pivot !== k) {
      const tmp = M[k]!;
      M[k] = M[pivot]!;
      M[pivot] = tmp;
    }
    const pivotRow = M[k]!;
    const pivotVal = pivotRow[k]!;
    for (let i = k + 1; i < n; i += 1) {
      const factor = M[i]![k]! / pivotVal;
      for (let j = k; j <= n; j += 1) {
        M[i]![j] = M[i]![j]! - factor * pivotRow[j]!;
      }
    }
  }
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
 * AdamW-style decoupled weight decay step.
 *
 *   w ← w − η (g + λ w)
 *
 * Unlike classic Adam+L2 (which adds λ‖w‖² to the loss, and so
 * couples the decay to the Adam adaptive denominator), the
 * decoupled form shrinks every weight by a factor
 * (1 − η λ) per step, regardless of the gradient. The bias
 * term is excluded by convention.
 */
export function adamwDecay(
  w: readonly number[],
  g: readonly number[],
  lr: number,
  lambda: number,
  options?: { regularizeBias?: boolean },
): number[] {
  if (w.length !== g.length) {
    throw new Error(
      `adamwDecay: w and g must have the same length (got ${w.length} vs ${g.length})`,
    );
  }
  const regularizeBias = options?.regularizeBias ?? false;
  const out = new Array<number>(w.length);
  for (let i = 0; i < w.length; i += 1) {
    const decay = regularizeBias || i > 0 ? lambda * (w[i] ?? 0) : 0;
    out[i] = (w[i] ?? 0) - lr * ((g[i] ?? 0) + decay);
  }
  return out;
}

/**
 * Sweep a single SGD step with AdamW-style weight decay. This is
 * a tiny convenience for the lesson's secondary view: it shows
 * how the parameter shrinks at each step independent of the
 * gradient magnitude.
 *
 *   w_{t+1} = (1 − η λ) w_t − η g_t
 */
export function shrinkageStep(
  w: number,
  g: number,
  lr: number,
  lambda: number,
): number {
  return w - lr * g - lr * lambda * w;
}
