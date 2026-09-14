/**
 * Simulate fp32 / bf16 / fp16 quantization on JavaScript numbers.
 *
 * We rely on JS's native fp64 for the "input" and approximate the
 * three target formats by rounding to the nearest representable
 * value, clamping at the format's max, and flushing-to-zero below
 * the smallest normal. Subnormals (denormals) are not modelled —
 * the underflow boundary uses the smallest *normal* value, which
 * is the boundary that bites in real training.
 */

export type Format = 'fp32' | 'bf16' | 'fp16';

interface Spec {
  /** number of mantissa bits (excludes implicit leading 1) */
  mantissaBits: number;
  /** smallest representable positive normal value */
  minNormal: number;
  /** largest finite value */
  maxFinite: number;
}

const SPECS: Record<Format, Spec> = {
  fp32: {
    mantissaBits: 23,
    minNormal: 1.175e-38,
    maxFinite: 3.4028235e38,
  },
  bf16: {
    mantissaBits: 7,
    minNormal: 1.175e-38, // same as fp32
    maxFinite: 3.389e38,
  },
  fp16: {
    mantissaBits: 10,
    minNormal: 6.103515625e-5,
    maxFinite: 65504,
  },
};

/**
 * Round x to the nearest value representable by `format`. If x is
 * outside the format's normal range, return 0 (underflow) or
 * ±Infinity (overflow).
 */
export function castTo(x: number, format: Format): number {
  if (x === 0) return 0;
  if (!isFinite(x)) return x;
  const spec = SPECS[format];
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  if (ax > spec.maxFinite) return sign * Infinity;
  if (ax < spec.minNormal) return 0; // flush-to-zero
  // Decompose into mantissa and binary exponent.
  const exp = Math.floor(Math.log2(ax));
  const significand = ax / Math.pow(2, exp); // in [1, 2)
  const step = Math.pow(2, -spec.mantissaBits);
  const quantized = Math.round(significand / step) * step;
  const out = quantized * Math.pow(2, exp);
  // After rounding the significand may have ticked into [2, 2 + step].
  return sign * Math.min(out, spec.maxFinite);
}

/**
 * The ULP (unit in the last place) at value x for the given format.
 * This is the gap between adjacent representable values around x.
 */
export function ulp(x: number, format: Format): number {
  if (x === 0) return SPECS[format].minNormal;
  if (!isFinite(x)) return Infinity;
  const spec = SPECS[format];
  const ax = Math.abs(x);
  if (ax < spec.minNormal) return 0;
  if (ax > spec.maxFinite) return Infinity;
  const exp = Math.floor(Math.log2(ax));
  return Math.pow(2, exp - spec.mantissaBits);
}

/** Relative error of casting x to format, as a fraction. */
export function relativeError(x: number, format: Format): number {
  if (x === 0) return 0;
  const c = castTo(x, format);
  if (!isFinite(c)) return 1;
  if (c === 0) return 1;
  return Math.abs(c - x) / Math.abs(x);
}

export type Status = 'ok' | 'rounded' | 'underflow' | 'overflow';

export function statusOf(x: number, format: Format): Status {
  if (x === 0) return 'ok';
  const c = castTo(x, format);
  if (!isFinite(c)) return 'overflow';
  if (c === 0) return 'underflow';
  if (c === x) return 'ok';
  return 'rounded';
}

/** Limits exposed for the sim. */
export function formatLimits(format: Format): { minNormal: number; maxFinite: number } {
  const s = SPECS[format];
  return { minNormal: s.minNormal, maxFinite: s.maxFinite };
}
