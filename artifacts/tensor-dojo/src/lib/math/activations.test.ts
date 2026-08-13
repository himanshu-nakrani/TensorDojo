import { describe, expect, it } from 'vitest';
import {
  gelu,
  geluDeriv,
  relu,
  reluDeriv,
  silu,
  siluDeriv,
  swiglu,
} from './activations';

describe('relu', () => {
  it('clamps negative values and preserves positive values', () => {
    expect(relu(-3)).toBe(0);
    expect(relu(0)).toBe(0);
    expect(relu(2.5)).toBe(2.5);
  });

  it('uses the documented derivative convention at zero', () => {
    expect(reluDeriv(-1)).toBe(0);
    expect(reluDeriv(0)).toBe(0);
    expect(reluDeriv(1)).toBe(1);
  });
});

describe('silu and swiglu', () => {
  it('returns zero at zero and approaches ReLU behavior for large positive inputs', () => {
    expect(silu(0)).toBe(0);
    expect(silu(20)).toBeCloseTo(20, 7);
    expect(silu(-20)).toBeCloseTo(0, 7);
  });

  it('implements the gated product identity', () => {
    expect(swiglu(2, 3)).toBeCloseTo(silu(2) * 3, 12);
    expect(swiglu(-2, 0)).toBe(0);
  });

  it('has the expected derivative at zero', () => {
    expect(siluDeriv(0)).toBeCloseTo(0.5, 12);
  });
});

describe('gelu', () => {
  it('is approximately zero at zero and approaches identity for large positive inputs', () => {
    expect(gelu(0)).toBeCloseTo(0, 12);
    expect(gelu(20)).toBeCloseTo(20, 8);
    expect(gelu(-20)).toBeCloseTo(0, 8);
  });

  it('has a derivative near one at large positive input and near zero at large negative input', () => {
    expect(geluDeriv(20)).toBeCloseTo(1, 8);
    expect(geluDeriv(-20)).toBeCloseTo(0, 8);
  });

  it('matches a central finite difference at representative points', () => {
    const h = 1e-5;
    for (const x of [-2, -0.5, 0.5, 2]) {
      const numerical = (gelu(x + h) - gelu(x - h)) / (2 * h);
      expect(geluDeriv(x)).toBeCloseTo(numerical, 4);
    }
  });
});
