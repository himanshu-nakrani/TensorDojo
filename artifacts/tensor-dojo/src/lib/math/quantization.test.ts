import { describe, expect, it } from 'vitest';
import {
  dequantize,
  quantizationError,
  quantize,
  representableLevels,
  weightBytes,
} from './quantization';

function makeWeights(n: number, seed = 1): number[] {
  // Deterministic mixture: mostly-Gaussian-ish around 0 with a
  // few heavy-tail samples. Approximates the shape of real LLM
  // weights closely enough for testing.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.max(1e-9, rand());
    const u2 = rand();
    const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    out.push(g * 0.1); // tighten the spread; LLM weights live near 0
  }
  // Sprinkle a few outliers.
  out[3] = 1.2;
  out[17] = -0.9;
  return out;
}

describe('quantize / dequantize', () => {
  it('rejects bits outside {2..8}', () => {
    expect(() => quantize([0.1, 0.2], 0)).toThrow();
    expect(() => quantize([0.1, 0.2], 9)).toThrow();
    expect(() => quantize([0.1, 0.2], 16)).toThrow();
  });

  it('handles empty input', () => {
    const q = quantize([], 4);
    expect(q.codes.length).toBe(0);
    expect(dequantize(q)).toEqual([]);
  });

  it('handles all-zero input (scale defaults to 1, no NaN)', () => {
    const q = quantize([0, 0, 0, 0], 4);
    expect(q.scale).toBeGreaterThan(0);
    const r = dequantize(q);
    expect(r).toEqual([0, 0, 0, 0]);
  });

  it('symmetric round-trip preserves the sign of large weights', () => {
    const w = [-1, -0.5, 0, 0.5, 1];
    const q = quantize(w, 8, 'symmetric');
    const r = dequantize(q);
    for (let i = 0; i < w.length; i++) {
      expect(Math.sign(r[i]!)).toBe(Math.sign(w[i]!));
    }
  });

  it('reconstructed values land on the level grid', () => {
    const w = makeWeights(64, 42);
    for (const bits of [2, 4, 6, 8] as const) {
      const q = quantize(w, bits, 'symmetric');
      const r = dequantize(q);
      const levels = new Set(representableLevels(q).map((v) => v.toFixed(12)));
      for (const v of r) {
        expect(levels.has(v.toFixed(12))).toBe(true);
      }
    }
  });

  it('rms error decreases monotonically as bits grows', () => {
    const w = makeWeights(256, 7);
    let prev = Infinity;
    for (const bits of [2, 3, 4, 6, 8] as const) {
      const q = quantize(w, bits, 'symmetric');
      const r = dequantize(q);
      const { rms } = quantizationError(w, r);
      expect(rms).toBeLessThan(prev);
      prev = rms;
    }
  });

  it('affine mode reproduces the min and max exactly (to within scale)', () => {
    // Affine bins span the full data range, so the extremes should
    // be within one scale step.
    const w = [-0.2, 0.1, 0.4, 0.9, 1.5];
    const q = quantize(w, 4, 'affine');
    const r = dequantize(q);
    const wMin = Math.min(...w);
    const wMax = Math.max(...w);
    const rMin = Math.min(...r);
    const rMax = Math.max(...r);
    expect(Math.abs(rMin - wMin)).toBeLessThanOrEqual(q.scale);
    expect(Math.abs(rMax - wMax)).toBeLessThanOrEqual(q.scale);
  });
});

describe('weightBytes', () => {
  it('matches the formula nParams · bits / 8', () => {
    expect(weightBytes(1024, 4)).toBe(512);
    expect(weightBytes(1024, 8)).toBe(1024);
    expect(weightBytes(1024, 16)).toBe(2048);
  });

  it('7B at fp16 is ≈ 14 GB', () => {
    const bytes = weightBytes(7e9, 16);
    const gb = bytes / 1024 ** 3;
    expect(gb).toBeGreaterThan(13);
    expect(gb).toBeLessThan(14); // 7e9 * 2 = 14e9 bytes ≈ 13.04 GB
  });

  it('7B at 4-bit is ≈ 3.5 GB (4× smaller than fp16)', () => {
    const fp16 = weightBytes(7e9, 16);
    const q4 = weightBytes(7e9, 4);
    expect(fp16 / q4).toBe(4);
    const gb = q4 / 1024 ** 3;
    expect(gb).toBeGreaterThan(3);
    expect(gb).toBeLessThan(4);
  });

  it('70B at 4-bit fits in 40 GB (the consumer-GPU threshold)', () => {
    const gb = weightBytes(70e9, 4) / 1024 ** 3;
    expect(gb).toBeLessThan(40);
    expect(gb).toBeGreaterThan(30);
  });

  it('rejects negative nParams or bits < 1', () => {
    expect(() => weightBytes(-1, 4)).toThrow();
    expect(() => weightBytes(1024, 0)).toThrow();
  });
});

describe('quantizationError', () => {
  it('throws on length mismatch', () => {
    expect(() => quantizationError([1, 2], [1, 2, 3])).toThrow();
  });

  it('returns zero for identical inputs', () => {
    const w = [0.1, -0.2, 0.05];
    expect(quantizationError(w, w)).toEqual({ rms: 0, maxAbs: 0 });
  });

  it('handles empty input', () => {
    expect(quantizationError([], [])).toEqual({ rms: 0, maxAbs: 0 });
  });
});

describe('representableLevels', () => {
  it('returns exactly 2^bits levels for any mode', () => {
    const w = makeWeights(32, 5);
    for (const bits of [2, 4, 6, 8] as const) {
      for (const mode of ['symmetric', 'affine'] as const) {
        const q = quantize(w, bits, mode);
        expect(representableLevels(q).length).toBe(1 << bits);
      }
    }
  });

  it('symmetric levels are evenly spaced and centered around zero', () => {
    const q = quantize([-1, 0, 1], 3, 'symmetric'); // 8 levels
    const levels = representableLevels(q).sort((a, b) => a - b);
    const gaps = levels
      .slice(1)
      .map((v, i) => Math.abs(v - levels[i]!));
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]!).toBeCloseTo(gaps[0]!, 12);
    }
    // Symmetric quantization with 8 levels (codes -4..3) is *not*
    // perfectly centered (code 0 is offset half-a-step), but the
    // spread should be roughly balanced.
    expect(Math.min(...levels)).toBeLessThan(0);
    expect(Math.max(...levels)).toBeGreaterThan(0);
  });
});
