/**
 * Weight quantization — store each weight in 4 or 8 bits instead
 * of 16 or 32. The reason a 70B-param model can run on a Mac
 * Mini: at 4 bits per weight you need 35 GB instead of 140 GB,
 * which is the difference between "doesn't fit" and "does."
 *
 * Two modes:
 *   - symmetric (zeroPoint = 0): levels evenly spaced around 0.
 *     Cheap and standard for weights.
 *   - affine (zeroPoint ≠ 0): levels evenly spaced from min to max.
 *     Better dynamic range when the distribution is skewed; the
 *     standard choice for activations.
 *
 * Pedagogical scope: this file models the round-trip for one
 * "group" of weights (a contiguous block sharing one scale and
 * one zero point). Production uses per-group scales of 64 or 128
 * weights — that just means calling this function once per group.
 * No kernel work; no GPTQ/AWQ/bitsandbytes specifics.
 */

export interface QuantizedBlock {
  /**
   * One integer per input weight, each in [0, 2^bits − 1] for
   * affine or [-(2^(bits-1)), 2^(bits-1) − 1] for symmetric.
   * Int16Array is comfortably large for bits ≤ 8 and is what real
   * code uses to hold packed-int outputs before bit-packing.
   */
  readonly codes: Int16Array;
  /** Per-group scale; the float "step" between adjacent levels. */
  readonly scale: number;
  /** Per-group integer offset. 0 for symmetric quantization. */
  readonly zeroPoint: number;
  /** Bit width the codes are packed into (2 ≤ bits ≤ 8). */
  readonly bits: number;
  /** Quantization mode. */
  readonly mode: 'symmetric' | 'affine';
}

const VALID_BITS = new Set([2, 3, 4, 5, 6, 7, 8]);

function validateBits(bits: number): void {
  if (!VALID_BITS.has(bits)) {
    throw new Error(`bits must be one of {2..8}; got ${bits}`);
  }
}

/**
 * Quantize one group of weights to `bits`-bit integer codes.
 *
 * Symmetric: levels span [-r, r] where r = max(|w|). Code range
 * is [-(2^(b-1)), 2^(b-1) - 1]; zeroPoint = 0.
 *
 * Affine: levels span [wMin, wMax]. Code range is [0, 2^b - 1];
 * zeroPoint = round(-wMin / scale), so the float 0 lands on an
 * exact code (important for things like padding tokens).
 */
export function quantize(
  weights: readonly number[],
  bits: number,
  mode: 'symmetric' | 'affine' = 'symmetric',
): QuantizedBlock {
  validateBits(bits);
  if (weights.length === 0) {
    return {
      codes: new Int16Array(0),
      scale: 1,
      zeroPoint: 0,
      bits,
      mode,
    };
  }

  if (mode === 'symmetric') {
    const r = weights.reduce((m, w) => Math.max(m, Math.abs(w)), 0);
    const qMax = (1 << (bits - 1)) - 1; // e.g. 4-bit → 7
    const qMin = -(1 << (bits - 1));    // e.g. 4-bit → -8
    const scale = r === 0 ? 1 : r / qMax;
    const codes = new Int16Array(weights.length);
    for (let i = 0; i < weights.length; i++) {
      const c = Math.round(weights[i]! / scale);
      codes[i] = Math.max(qMin, Math.min(qMax, c));
    }
    return { codes, scale, zeroPoint: 0, bits, mode };
  }

  // affine
  let wMin = Infinity;
  let wMax = -Infinity;
  for (const w of weights) {
    if (w < wMin) wMin = w;
    if (w > wMax) wMax = w;
  }
  const qMax = (1 << bits) - 1; // e.g. 4-bit → 15
  const range = wMax - wMin;
  const scale = range === 0 ? 1 : range / qMax;
  const zeroPoint = Math.round(-wMin / scale);
  const codes = new Int16Array(weights.length);
  for (let i = 0; i < weights.length; i++) {
    const c = Math.round(weights[i]! / scale) + zeroPoint;
    codes[i] = Math.max(0, Math.min(qMax, c));
  }
  return { codes, scale, zeroPoint, bits, mode };
}

/**
 * Reconstruct the weights from a quantized block. Reconstructed
 * values are snapped to one of 2^bits levels; the difference from
 * the originals is the quantization error.
 */
export function dequantize(q: QuantizedBlock): number[] {
  const out = new Array<number>(q.codes.length);
  for (let i = 0; i < q.codes.length; i++) {
    out[i] = (q.codes[i]! - q.zeroPoint) * q.scale;
  }
  return out;
}

/**
 * Total weight memory in bytes for `nParams` parameters stored at
 * `bits` per weight. Closed-form, ignores the (tiny) per-group
 * scale overhead.
 */
export function weightBytes(nParams: number, bits: number): number {
  if (nParams < 0) throw new Error('nParams must be ≥ 0');
  if (bits < 1 || !Number.isFinite(bits)) {
    throw new Error('bits must be ≥ 1');
  }
  return (nParams * bits) / 8;
}

/** RMS and max-abs error between original and reconstructed weights. */
export function quantizationError(
  original: readonly number[],
  reconstructed: readonly number[],
): { rms: number; maxAbs: number } {
  if (original.length !== reconstructed.length) {
    throw new Error('length mismatch');
  }
  if (original.length === 0) return { rms: 0, maxAbs: 0 };
  let sumSq = 0;
  let maxAbs = 0;
  for (let i = 0; i < original.length; i++) {
    const e = original[i]! - reconstructed[i]!;
    sumSq += e * e;
    const a = Math.abs(e);
    if (a > maxAbs) maxAbs = a;
  }
  return { rms: Math.sqrt(sumSq / original.length), maxAbs };
}

/**
 * The 2^bits values an affine block can represent, as floats.
 * Surfaced for the "QuantizationLevels" sim to draw tick marks.
 */
export function representableLevels(q: QuantizedBlock): number[] {
  const nLevels =
    q.mode === 'symmetric'
      ? (1 << q.bits)       // [-2^(b-1), 2^(b-1) - 1] is 2^b values
      : (1 << q.bits);      // [0, 2^b - 1] is 2^b values
  const out = new Array<number>(nLevels);
  if (q.mode === 'symmetric') {
    const qMin = -(1 << (q.bits - 1));
    for (let i = 0; i < nLevels; i++) {
      out[i] = (qMin + i) * q.scale;
    }
  } else {
    for (let i = 0; i < nLevels; i++) {
      out[i] = (i - q.zeroPoint) * q.scale;
    }
  }
  return out;
}
