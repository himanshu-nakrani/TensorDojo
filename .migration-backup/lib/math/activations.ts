/**
 * Activation functions used by the transformer FFN sublayer.
 *
 *   relu(x)     = max(0, x)
 *   gelu(x)     = 0.5 * x * (1 + erf(x / sqrt(2)))
 *   silu(x)     = x * sigmoid(x)        (a.k.a. Swish)
 *   swiglu(a,b) = silu(a) * b           (two-channel gated variant)
 *
 * Derivatives are exposed for the lesson's "derivative overlay" so
 * readers can see *why* ReLU is dead below zero and the others are
 * not.
 *
 * GELU re-uses the `gelu` implementation in `./gelu.ts`; we keep
 * that file as-is so its callers and tests remain untouched and
 * just re-export from here.
 */

import { gelu as _gelu, relu as _relu } from './gelu';

export const relu = _relu;
export const gelu = _gelu;

/** Sigmoid, in [0, 1]. */
function sigmoid(x: number): number {
  // Numerically stable sigmoid.
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

/** SiLU (a.k.a. Swish): smooth ReLU, used inside SwiGLU. */
export function silu(x: number): number {
  return x * sigmoid(x);
}

/** Two-channel gated SwiGLU: `silu(a) * b`. */
export function swiglu(a: number, b: number): number {
  return silu(a) * b;
}

// ---------------------------------------------------------------
// Derivatives — used for the "show derivative" overlay in the
// ActivationLab sim. Closed forms below.

/** d/dx relu(x). Undefined at 0; convention is 0. */
export function reluDeriv(x: number): number {
  return x > 0 ? 1 : 0;
}

/**
 * d/dx gelu(x) via the exact form:
 *
 *   gelu'(x) = 0.5 * (1 + erf(x/sqrt(2))) + x * phi(x)
 *
 * where phi is the standard normal pdf. We reconstruct erf from
 * the existing gelu: erf(x/sqrt(2)) = 2*gelu(x)/x - 1 for x != 0,
 * which would be brittle. Closed-form via the gaussian pdf instead.
 */
export function geluDeriv(x: number): number {
  const sqrt2 = Math.SQRT2;
  // erf(x / sqrt(2)) reconstructed from a fresh series isn't great;
  // re-use a private helper. Reproduce the same A&S 7.1.26 approx
  // used inside `./gelu.ts` for consistency.
  const ax = Math.abs(x) / sqrt2;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const erfAbs =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-ax * ax);
  const erfVal = x < 0 ? -erfAbs : erfAbs;
  const phi = Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
  return 0.5 * (1 + erfVal) + x * phi;
}

/** d/dx silu(x) = sigmoid(x) + x * sigmoid(x) * (1 - sigmoid(x)). */
export function siluDeriv(x: number): number {
  const s = sigmoid(x);
  return s + x * s * (1 - s);
}
