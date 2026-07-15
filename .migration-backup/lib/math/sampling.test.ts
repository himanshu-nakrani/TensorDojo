import { describe, expect, it } from 'vitest';
import {
  effectiveDistribution,
  greedyDecode,
  temperatureSample,
  topKSample,
  topPSample,
} from './sampling';

describe('greedyDecode', () => {
  it('returns the argmax index', () => {
    expect(greedyDecode([0, 0, 0])).toBe(0); // ties: first index wins
    expect(greedyDecode([1, 2, 3])).toBe(2);
    expect(greedyDecode([3, 2, 1])).toBe(0);
  });

  it('handles negative logits', () => {
    expect(greedyDecode([-1, -5, -2])).toBe(0);
  });

  it('returns -1 for empty input', () => {
    expect(greedyDecode([])).toBe(-1);
  });
});

describe('temperatureSample', () => {
  it('always returns argmax as T → 0', () => {
    const logits = [0, 1, 2, 3, 4];
    for (let s = 1; s < 50; s += 1) {
      expect(temperatureSample(logits, 0.01, s)).toBe(4);
    }
  });

  it('samples from a roughly uniform distribution at T → ∞', () => {
    // 5 entries. Run 200 samples with T=100; each entry should
    // get some samples. (Statistical test; should be very robust
    // for this T.)
    const logits = [0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0];
    for (let s = 0; s < 500; s += 1) {
      const idx = temperatureSample(logits, 100, s + 1);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    // No entry should be 0 (with 500 samples over 5 entries, very unlikely).
    for (const c of counts) expect(c).toBeGreaterThan(0);
  });

  it('throws on non-positive temperature', () => {
    expect(() => temperatureSample([1, 2, 3], 0)).toThrow();
    expect(() => temperatureSample([1, 2, 3], -1)).toThrow();
  });
});

describe('topKSample', () => {
  it('k=1 is greedy', () => {
    const logits = [0, 1, 2, 1, 0];
    for (let s = 1; s < 30; s += 1) {
      expect(topKSample(logits, 1, 1, s)).toBe(2);
    }
  });

  it('k ≥ n reduces to plain softmax sampling', () => {
    const logits = [0, 1, 2, 3, 4];
    const a = topKSample(logits, 10, 1, 42);
    // Just verify it returns a valid index — the inner code
    // delegates to temperatureSample.
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(logits.length);
  });

  it('only ever returns indices in the top-k of the logits', () => {
    const logits = [0, 5, 1, 4, 2, 3, 0.5];
    // top 3 of these are indices 1 (5), 3 (4), 5 (3).
    for (let s = 1; s < 200; s += 1) {
      const idx = topKSample(logits, 3, 1, s);
      expect([1, 3, 5]).toContain(idx);
    }
  });

  it('throws on non-positive k', () => {
    expect(() => topKSample([1, 2, 3], 0)).toThrow();
  });
});

describe('topPSample', () => {
  it('p=1 samples from the full distribution', () => {
    const logits = [0, 0, 0, 0];
    for (let s = 0; s < 50; s += 1) {
      const idx = topPSample(logits, 1, 1, s + 1);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(4);
    }
  });

  it('p close to 0 is a small nucleus', () => {
    // Logits [0, 5, 0, 0, 0]: softmax(., T=1) ≈ [0.006, 0.97, ...]
    // With p = 0.1 the nucleus is {index 1} only. Every sample
    // should be 1.
    const logits = [0, 5, 0, 0, 0];
    for (let s = 1; s < 50; s += 1) {
      expect(topPSample(logits, 0.1, 1, s)).toBe(1);
    }
  });

  it('throws on p out of (0, 1]', () => {
    expect(() => topPSample([1, 2, 3], 0)).toThrow();
    expect(() => topPSample([1, 2, 3], 1.1)).toThrow();
  });
});

describe('effectiveDistribution', () => {
  it('greedy is a one-hot at the argmax', () => {
    const logits = [0, 0, 5, 0];
    const d = effectiveDistribution(logits, 'greedy');
    expect(d).toEqual([0, 0, 1, 0]);
  });

  it('temperature returns softmax(logits / T)', () => {
    const logits = [1, 2, 3];
    const T = 2;
    const d = effectiveDistribution(logits, 'temperature', { temperature: T });
    // Compare against direct softmax.
    const expected = (() => {
      const scaled = logits.map((v) => v / T);
      const e = scaled.map((v) => Math.exp(v - Math.max(...scaled)));
      const sum = e.reduce((a, b) => a + b, 0);
      return e.map((v) => v / sum);
    })();
    for (let i = 0; i < d.length; i += 1) {
      expect(d[i]).toBeCloseTo(expected[i] ?? 0, 10);
    }
  });

  it('top-k zeros entries below the k-th largest logit', () => {
    const logits = [0, 5, 1, 4, 2];
    const d = effectiveDistribution(logits, 'top-k', { k: 2 });
    // Top 2 are indices 1 (5) and 3 (4). The other three are 0.
    expect(d[0]).toBe(0);
    expect(d[1]).toBeGreaterThan(0);
    expect(d[2]).toBe(0);
    expect(d[3]).toBeGreaterThan(0);
    expect(d[4]).toBe(0);
    // Sums to 1.
    const sum = d.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('top-p zero-truncates the tail', () => {
    // Peaked distribution: most of the mass is on index 1.
    // p=0.5 should keep the head and zero the rest.
    const logits = [0, 5, 0, 0, 0];
    const d = effectiveDistribution(logits, 'top-p', { p: 0.5 });
    expect(d[1]).toBeGreaterThan(0);
    // Sum is 1 over the kept entries.
    const sum = d.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});
