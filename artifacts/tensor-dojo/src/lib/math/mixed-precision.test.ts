import { describe, expect, it } from 'vitest';
import {
  castTo,
  formatLimits,
  relativeError,
  statusOf,
  ulp,
} from './mixed-precision';

describe('castTo', () => {
  it('represents 1.0 exactly in every format', () => {
    expect(castTo(1, 'fp32')).toBe(1);
    expect(castTo(1, 'bf16')).toBe(1);
    expect(castTo(1, 'fp16')).toBe(1);
  });

  it('fp16 underflows at 1e-7', () => {
    expect(castTo(1e-7, 'fp16')).toBe(0);
  });

  it('bf16 and fp32 represent 1e-7 with no underflow', () => {
    expect(castTo(1e-7, 'bf16')).toBeGreaterThan(0);
    expect(castTo(1e-7, 'fp32')).toBeGreaterThan(0);
  });

  it('fp16 overflows at 1e5', () => {
    expect(castTo(1e5, 'fp16')).toBe(Infinity);
  });

  it('bf16 keeps fp32-range numbers finite', () => {
    expect(isFinite(castTo(1e30, 'bf16'))).toBe(true);
    expect(isFinite(castTo(1e30, 'fp32'))).toBe(true);
  });

  it('zero stays zero', () => {
    expect(castTo(0, 'fp16')).toBe(0);
    expect(castTo(0, 'bf16')).toBe(0);
  });

  it('preserves sign', () => {
    expect(castTo(-1.5, 'bf16')).toBeLessThan(0);
  });
});

describe('ulp', () => {
  it('bf16 ULP at 1.0 is 2^-7', () => {
    expect(ulp(1, 'bf16')).toBeCloseTo(Math.pow(2, -7), 10);
  });

  it('fp16 ULP at 1.0 is 2^-10', () => {
    expect(ulp(1, 'fp16')).toBeCloseTo(Math.pow(2, -10), 10);
  });

  it('fp32 ULP is smaller than bf16 at the same value', () => {
    expect(ulp(1, 'fp32')).toBeLessThan(ulp(1, 'bf16'));
  });
});

describe('statusOf', () => {
  it('reports underflow when fp16 sees 1e-6', () => {
    expect(statusOf(1e-6, 'fp16')).toBe('underflow');
  });

  it('reports overflow when fp16 sees 1e5', () => {
    expect(statusOf(1e5, 'fp16')).toBe('overflow');
  });

  it('reports rounded for inexact representations', () => {
    expect(statusOf(0.1, 'bf16')).toBe('rounded');
  });

  it('reports ok for exact representations', () => {
    expect(statusOf(1, 'fp32')).toBe('ok');
    expect(statusOf(0, 'bf16')).toBe('ok');
  });
});

describe('relativeError', () => {
  it('is roughly bounded by ULP / 2', () => {
    const x = 1.234;
    const err = relativeError(x, 'bf16');
    expect(err).toBeLessThan(Math.pow(2, -7));
  });

  it('returns 1 when the value underflows', () => {
    expect(relativeError(1e-7, 'fp16')).toBe(1);
  });
});

describe('formatLimits', () => {
  it('exposes fp16 limits', () => {
    const { minNormal, maxFinite } = formatLimits('fp16');
    expect(minNormal).toBeCloseTo(6.1e-5, 4);
    expect(maxFinite).toBe(65504);
  });
});
