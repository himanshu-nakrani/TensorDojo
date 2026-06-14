import { describe, expect, it } from 'vitest';
import {
  constant,
  cosineDecay,
  linearDecay,
  sampleSchedule,
  warmupCosine,
} from './schedules';

describe('constant', () => {
  it('returns peak for all t in [0, total)', () => {
    expect(constant(0, 100, 0.5)).toBe(0.5);
    expect(constant(50, 100, 0.5)).toBe(0.5);
    expect(constant(99, 100, 0.5)).toBe(0.5);
  });
  it('returns 0 at and beyond t=total', () => {
    expect(constant(100, 100, 0.5)).toBe(0);
    expect(constant(200, 100, 0.5)).toBe(0);
  });
  it('throws on malformed inputs', () => {
    expect(() => constant(-1, 100, 0.5)).toThrow();
    expect(() => constant(0, 0, 0.5)).toThrow();
    expect(() => constant(0, 100, -0.5)).toThrow();
  });
});

describe('linearDecay', () => {
  it('starts at peak and reaches 0 at t=total', () => {
    expect(linearDecay(0, 100, 0.5)).toBeCloseTo(0.5, 10);
    expect(linearDecay(50, 100, 0.5)).toBeCloseTo(0.25, 10);
    expect(linearDecay(100, 100, 0.5)).toBe(0);
  });
  it('is monotonically non-increasing', () => {
    let prev = linearDecay(0, 100, 0.5);
    for (let t = 1; t <= 100; t += 1) {
      const cur = linearDecay(t, 100, 0.5);
      expect(cur).toBeLessThanOrEqual(prev + 1e-12);
      prev = cur;
    }
  });
});

describe('cosineDecay', () => {
  it('starts at peak and reaches 0 at t=total', () => {
    expect(cosineDecay(0, 100, 0.5)).toBeCloseTo(0.5, 10);
    expect(cosineDecay(100, 100, 0.5)).toBeCloseTo(0, 10);
  });
  it('at t=total/2, lr is half the peak (cos(π/2)=0)', () => {
    expect(cosineDecay(50, 100, 0.5)).toBeCloseTo(0.25, 10);
  });
  it('is monotonically non-increasing', () => {
    let prev = cosineDecay(0, 100, 0.5);
    for (let t = 1; t <= 100; t += 1) {
      const cur = cosineDecay(t, 100, 0.5);
      expect(cur).toBeLessThanOrEqual(prev + 1e-12);
      prev = cur;
    }
  });
  it('with a positive η_min, ends at η_min (not 0)', () => {
    // Exact form: η_t = η_min + (η_max − η_min) · ½(1 + cos(π · t / T))
    expect(cosineDecay(0, 100, 0.5, 0.05)).toBeCloseTo(0.5, 10);
    expect(cosineDecay(100, 100, 0.5, 0.05)).toBeCloseTo(0, 10);
    expect(cosineDecay(100, 100, 0.5, 0.05)).toBeCloseTo(0, 10);
    // At t = total, the function clamps to 0 regardless of η_min
    // (this is the "step is past the end of training" convention).
    const atHalf = cosineDecay(50, 100, 0.5, 0.05);
    expect(atHalf).toBeCloseTo(0.05 + (0.5 - 0.05) * 0.5, 10);
  });
  it('throws when η_min > η_max', () => {
    expect(() => cosineDecay(0, 100, 0.1, 0.5)).toThrow();
  });
});

describe('warmupCosine', () => {
  it('warmup is monotonically increasing in the warmup phase', () => {
    let prev = warmupCosine(0, 100, 0.5, 10);
    for (let t = 1; t < 10; t += 1) {
      const cur = warmupCosine(t, 100, 0.5, 10);
      expect(cur).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = cur;
    }
  });
  it('cosine reaches 0 at t=total', () => {
    expect(warmupCosine(100, 100, 0.5, 10)).toBeCloseTo(0, 10);
  });
  it('at t=warmup, lr equals peak', () => {
    expect(warmupCosine(10, 100, 0.5, 10)).toBeCloseTo(0.5, 10);
  });
  it('peak is reached exactly at the end of warmup (no overshoot)', () => {
    const peak = 0.5;
    for (const warmup of [5, 10, 20, 50]) {
      const total = 100;
      expect(warmupCosine(warmup, total, peak, warmup)).toBeCloseTo(peak, 10);
    }
  });
  it('warmup=0 reduces to cosineDecay', () => {
    const peak = 0.5;
    const total = 100;
    for (const t of [0, 10, 25, 50, 75, 100]) {
      expect(warmupCosine(t, total, peak, 0)).toBeCloseTo(cosineDecay(t, total, peak), 10);
    }
  });
  it('post-warmup is monotonically non-increasing', () => {
    const peak = 0.5;
    const total = 100;
    const warmup = 10;
    let prev = warmupCosine(warmup, total, peak, warmup);
    for (let t = warmup + 1; t <= total; t += 1) {
      const cur = warmupCosine(t, total, peak, warmup);
      expect(cur).toBeLessThanOrEqual(prev + 1e-12);
      prev = cur;
    }
  });
  it('throws on malformed inputs', () => {
    expect(() => warmupCosine(-1, 100, 0.5, 10)).toThrow();
    expect(() => warmupCosine(0, 0, 0.5, 0)).toThrow();
    expect(() => warmupCosine(0, 100, -0.5, 0)).toThrow();
    expect(() => warmupCosine(0, 100, 0.5, 200)).toThrow();
  });
});

describe('sampleSchedule', () => {
  it('returns the right number of (step, lr) pairs', () => {
    const r = sampleSchedule((t) => cosineDecay(t, 100, 0.5), 100, 21);
    expect(r.steps.length).toBe(21);
    expect(r.lrs.length).toBe(21);
  });
  it('first and last samples are at t=0 and t=total', () => {
    const r = sampleSchedule((t) => linearDecay(t, 100, 0.5), 100, 11);
    expect(r.steps[0]).toBe(0);
    expect(r.steps[10]).toBe(100);
  });
  it('values match the underlying schedule at the sampled steps', () => {
    const fn = (t: number) => warmupCosine(t, 100, 0.5, 10);
    const r = sampleSchedule(fn, 100, 5);
    for (let i = 0; i < 5; i += 1) {
      expect(r.lrs[i]).toBeCloseTo(fn(r.steps[i]!), 10);
    }
  });
});
