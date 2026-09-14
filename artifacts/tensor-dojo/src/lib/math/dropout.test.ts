import { describe, it, expect } from 'vitest';
import {
  dropoutMask,
  dropoutSample,
  expectedActivation,
  invertedDropout,
  preservesExpectation,
} from './dropout';

describe('dropoutSample', () => {
  it('at p=0 the mask is identity (no zeros, no scaling)', () => {
    expect(dropoutSample(1.5, 0, 0.5, false)).toBe(1.5);
    expect(dropoutSample(1.5, 0, 0.5, true)).toBe(1.5);
  });

  it('at p>0 with rand < p the activation is zeroed', () => {
    expect(dropoutSample(2.0, 0.3, 0.1, false)).toBe(0);
    expect(dropoutSample(2.0, 0.3, 0.1, true)).toBe(0);
  });

  it('inverted form divides by (1-p) when the activation is kept', () => {
    expect(dropoutSample(1.0, 0.5, 0.6, true)).toBeCloseTo(1 / 0.5, 10);
    expect(dropoutSample(1.0, 0.5, 0.6, false)).toBeCloseTo(1.0, 10);
  });
});

describe('dropoutMask / invertedDropout', () => {
  it('at p=0 returns a copy of the input', () => {
    const x = [0.1, 0.5, -0.2];
    const out = dropoutMask(x, 0, [0.5, 0.5, 0.5], true);
    expect(out).toEqual(x);
    expect(out).not.toBe(x);
  });

  it('throws on p out of range', () => {
    expect(() => dropoutMask([1, 2], -0.1, [0.1, 0.2], true)).toThrow();
    expect(() => dropoutMask([1, 2], 1, [0.1, 0.2], true)).toThrow();
  });

  it('throws if rand length does not match x length', () => {
    expect(() => dropoutMask([1, 2, 3], 0.3, [0.1, 0.2], true)).toThrow();
  });

  it('expected value over many masks matches the input under inverted dropout', () => {
    // For a fixed input, the empirical mean over many random
    // masks should approach the input value (i.e. the inversion
    // preserves expectation).
    const x = [0.4, 1.0, -0.2];
    const p = 0.3;
    const N = 5000;
    const sums = [0, 0, 0];
    // Deterministic PRNG (mulberry32) so the test is reproducible.
    let s = 1234567 >>> 0;
    const rand = (): number => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let k = 0; k < N; k += 1) {
      const noise = [rand(), rand(), rand()];
      const out = invertedDropout(x, p, noise);
      for (let i = 0; i < x.length; i += 1) sums[i] = (sums[i] ?? 0) + (out[i] ?? 0);
    }
    for (let i = 0; i < x.length; i += 1) {
      const mean = (sums[i] ?? 0) / N;
      // Should be within 5% of the input value (or tighter — this
      // is a smoke test, not a tight bound).
      expect(Math.abs(mean - (x[i] ?? 0))).toBeLessThan(0.05);
    }
  });

  it('non-inverted form does NOT preserve expectation', () => {
    // The naive (non-inverted) form has E[y] = (1-p) x; for
    // x=1, p=0.3 the mean over many samples is 0.7, not 1.
    const x = [1.0];
    const p = 0.3;
    const N = 5000;
    let sum = 0;
    let s = 7654321 >>> 0;
    const rand = (): number => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let k = 0; k < N; k += 1) {
      const out = dropoutMask(x, p, [rand()], false);
      sum += out[0]!;
    }
    const mean = sum / N;
    expect(Math.abs(mean - 0.7)).toBeLessThan(0.05);
    expect(Math.abs(mean - 1.0)).toBeGreaterThan(0.1); // not preserving
  });
});

describe('expectedActivation', () => {
  it('non-inverted: (1-p) x', () => {
    expect(expectedActivation(1.0, 0.3, false)).toBeCloseTo(0.7, 10);
  });
  it('inverted: x', () => {
    expect(expectedActivation(1.0, 0.3, true)).toBeCloseTo(1.0, 10);
  });
});

describe('preservesExpectation', () => {
  it('only the inverted form does', () => {
    expect(preservesExpectation(0.3, true)).toBe(true);
    expect(preservesExpectation(0.3, false)).toBe(false);
  });
});
