import { describe, it, expect } from 'vitest';
import { PRETRAINED_PARAMS, generatePretrainedParams } from './pretrain-init';
import { N_PARAMS } from './training';

describe('PRETRAINED_PARAMS', () => {
  it('has length N_PARAMS', () => {
    expect(PRETRAINED_PARAMS.length).toBe(N_PARAMS);
  });

  it('is non-trivial (not all zero, not all the same)', () => {
    const set = new Set(PRETRAINED_PARAMS.map((v) => v.toFixed(6)));
    expect(set.size).toBeGreaterThan(20);
    const anyNonZero = PRETRAINED_PARAMS.some((v) => Math.abs(v) > 1e-3);
    expect(anyNonZero).toBe(true);
  });

  it('values are finite', () => {
    for (const v of PRETRAINED_PARAMS) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('generatePretrainedParams', () => {
  it('is deterministic for a fixed seed', () => {
    const a = generatePretrainedParams(42);
    const b = generatePretrainedParams(42);
    expect(a).toEqual(b);
  });

  it('different seeds produce different params', () => {
    const a = generatePretrainedParams(42);
    const b = generatePretrainedParams(99);
    expect(a).not.toEqual(b);
  });
});
