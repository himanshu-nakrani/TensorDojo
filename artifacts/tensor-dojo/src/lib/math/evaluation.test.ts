import { describe, expect, it } from 'vitest';
import { accuracy, agreement, passAtK, perplexity } from './evaluation';

describe('perplexity', () => {
  it('rejects empty input', () => {
    expect(() => perplexity([])).toThrow();
  });

  it('rejects positive or non-finite log-probs', () => {
    expect(() => perplexity([0, 1])).toThrow();
    expect(() => perplexity([-Infinity])).toThrow();
    expect(() => perplexity([NaN])).toThrow();
  });

  it('perfect model (log-prob 0 = probability 1) has perplexity 1', () => {
    expect(perplexity([0, 0, 0, 0])).toBeCloseTo(1, 12);
  });

  it('uniform over V tokens has perplexity V', () => {
    // log(1/V) per token; perplexity = exp(log V) = V.
    const V = 32;
    const lp = Array.from({ length: 10 }, () => -Math.log(V));
    expect(perplexity(lp)).toBeCloseTo(V, 9);
  });

  it('matches the canonical "perplexity 2 means binary uncertainty" identity', () => {
    // log(1/2) per token → perplexity 2.
    expect(perplexity([-Math.log(2), -Math.log(2)])).toBeCloseTo(2, 12);
  });
});

describe('accuracy', () => {
  it('returns 0 for empty input', () => {
    expect(accuracy([], [])).toBe(0);
  });

  it('throws on length mismatch', () => {
    expect(() => accuracy([0, 1], [0, 1, 2])).toThrow();
  });

  it('all correct = 1.0', () => {
    expect(accuracy([0, 1, 2, 3], [0, 1, 2, 3])).toBe(1);
  });

  it('all wrong = 0.0', () => {
    expect(accuracy([0, 0, 0, 0], [1, 1, 1, 1])).toBe(0);
  });

  it('half correct = 0.5', () => {
    expect(accuracy([0, 1, 0, 1], [0, 0, 0, 0])).toBe(0.5);
  });
});

describe('passAtK', () => {
  it('rejects k < 1 or non-integer k', () => {
    expect(() => passAtK([[true, false]], 0)).toThrow();
    expect(() => passAtK([[true, false]], 1.5)).toThrow();
  });

  it('rejects k > samples per task', () => {
    expect(() => passAtK([[true, false]], 3)).toThrow();
  });

  it('returns 0 for empty input', () => {
    expect(passAtK([], 1)).toBe(0);
  });

  it('all samples pass → pass@k = 1', () => {
    const tasks = [
      [true, true, true],
      [true, true, true],
    ];
    expect(passAtK(tasks, 1)).toBe(1);
    expect(passAtK(tasks, 3)).toBe(1);
  });

  it('no samples pass → pass@k = 0', () => {
    const tasks = [
      [false, false, false],
      [false, false, false],
    ];
    expect(passAtK(tasks, 1)).toBe(0);
    expect(passAtK(tasks, 3)).toBe(0);
  });

  it('matches the hand-derived value: 1/2 pass, k=1', () => {
    // One task, 2 samples, 1 passes. pass@1 = 1 - C(1,1)/C(2,1) = 0.5.
    expect(passAtK([[true, false]], 1)).toBeCloseTo(0.5, 12);
  });

  it('pass@k grows monotonically with k', () => {
    // 10 samples per task, 2 pass.
    const tasks = [[true, true, false, false, false, false, false, false, false, false]];
    const p1 = passAtK(tasks, 1);
    const p3 = passAtK(tasks, 3);
    const p10 = passAtK(tasks, 10);
    expect(p3).toBeGreaterThan(p1);
    expect(p10).toBeGreaterThan(p3);
    expect(p10).toBe(1); // 10/10 samples → guaranteed to include a pass
  });

  it('averages across tasks', () => {
    // Two tasks: one all-pass, one all-fail. Expected pass@1 = 0.5.
    const tasks = [
      [true, true, true],
      [false, false, false],
    ];
    expect(passAtK(tasks, 1)).toBeCloseTo(0.5, 12);
  });
});

describe('agreement', () => {
  it('returns 0 for empty input', () => {
    expect(agreement([], [])).toBe(0);
  });

  it('throws on length mismatch', () => {
    expect(() => agreement([0], [0, 1])).toThrow();
  });

  it('identical predictions → agreement 1', () => {
    expect(agreement([0, 1, 2, 3], [0, 1, 2, 3])).toBe(1);
  });

  it('completely disjoint predictions → agreement 0', () => {
    expect(agreement([0, 0, 0, 0], [1, 1, 1, 1])).toBe(0);
  });

  it('agreement 0.5 detected', () => {
    expect(agreement([0, 1, 0, 1], [0, 1, 1, 0])).toBe(0.5);
  });
});
