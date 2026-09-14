/**
 * GELU (Gaussian Error Linear Unit) activation.
 *
 *   gelu(x) = 0.5 * x * (1 + erf(x / sqrt(2)))
 *
 * Used in the feed-forward sublayer of a transformer block. The
 * `erf` function is approximated with the Abramowitz & Stegun 7.1.26
 * rational approximation, max error ~1.5e-7. TS's lib types do not
 * include `Math.erf`; a 30-line local implementation is cheaper than
 * depending on a polyfill.
 *
 * GELU differs from ReLU in that it lets a small negative signal
 * through (gelu(-2) ≈ -0.046, not 0). This makes the FFN's
 * "thinking" step differentiable at zero.
 */
function erf(x: number): number {
  // Constants for the rational approximation.
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Exact GELU activation. */
export function gelu(x: number): number {
  return 0.5 * x * (1 + erf(x / Math.SQRT2));
}

/** ReLU activation, for the σ = ReLU vs GELU comparison in the lesson. */
export function relu(x: number): number {
  return Math.max(0, x);
}
