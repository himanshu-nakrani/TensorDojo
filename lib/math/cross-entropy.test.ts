import { describe, expect, it } from 'vitest';
import {
  crossEntropy,
  crossEntropyCurve,
  crossEntropyFromLogits,
} from './cross-entropy';

describe('crossEntropy', () => {
  it('returns 0 when the model puts all mass on the true token', () => {
    const probs = [0, 1, 0, 0];
    expect(crossEntropy(probs, 1)).toBeCloseTo(0, 10);
  });

  it('returns +Infinity when the model puts zero mass on the true token', () => {
    const probs = [1, 0, 0, 0];
    expect(crossEntropy(probs, 1)).toBe(Number.POSITIVE_INFINITY);
    expect(crossEntropy(probs, 2)).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns -log(p) for partial probabilities', () => {
    const probs = [0.5, 0.25, 0.25, 0];
    expect(crossEntropy(probs, 0)).toBeCloseTo(-Math.log(0.5), 10);
    expect(crossEntropy(probs, 1)).toBeCloseTo(-Math.log(0.25), 10);
  });

  it('punishes confident wrong answers more than uncertain ones', () => {
    // The "true" token is index 0. The model is "confidently
    // wrong" when p[0] is tiny; "uncertain" when p[0] is moderate.
    const confidentWrong = crossEntropy([0.001, 0.999, 0], 0);
    const uncertain = crossEntropy([0.3, 0.3, 0.4], 0);
    expect(confidentWrong).toBeGreaterThan(uncertain);
    expect(confidentWrong).toBeGreaterThan(6);
    expect(uncertain).toBeLessThan(1.5);
  });

  it('throws on out-of-range trueIndex', () => {
    expect(() => crossEntropy([0.5, 0.5], -1)).toThrow();
    expect(() => crossEntropy([0.5, 0.5], 2)).toThrow();
    expect(() => crossEntropy([0.5, 0.5], 1.5)).toThrow();
  });

  it('throws on negative probs', () => {
    expect(() => crossEntropy([0.5, -0.5], 0)).toThrow();
  });

  it('throws on empty probs', () => {
    expect(() => crossEntropy([], 0)).toThrow();
  });

  it('matches scipy reference values', () => {
    // Cross-entropy = -log(p). For p = 0.7, -log(0.7) ≈ 0.3567
    // (matches scipy: -np.log(0.7))
    expect(crossEntropy([0.3, 0.7], 1)).toBeCloseTo(0.35667494, 7);
    // For p = 0.1, -log(0.1) ≈ 2.3026
    expect(crossEntropy([0.9, 0.1], 1)).toBeCloseTo(2.30258509, 7);
  });
});

describe('crossEntropyFromLogits', () => {
  it('matches crossEntropy via softmax for the same input', () => {
    const logits = [1.0, 2.0, 3.0, 4.0];
    // Manually compute softmax, then cross-entropy.
    const max = Math.max(...logits);
    const exps = logits.map((v) => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map((e) => e / sum);
    const direct = crossEntropy(probs, 3);
    const fromLogits = crossEntropyFromLogits(logits, 3);
    expect(fromLogits).toBeCloseTo(direct, 10);
  });

  it('is invariant to additive constant in the logits', () => {
    // softmax(x + c) = softmax(x) — same probs, same loss.
    const logits = [1.0, 2.0, 3.0];
    const a = crossEntropyFromLogits(logits, 0);
    const b = crossEntropyFromLogits(logits.map((v) => v + 1000), 0);
    const c = crossEntropyFromLogits(logits.map((v) => v - 50), 0);
    expect(b).toBeCloseTo(a, 10);
    expect(c).toBeCloseTo(a, 10);
  });

  it('returns 0 when the true logit dominates', () => {
    const logits = [0, 0, 0, 100];
    // softmax([0, 0, 0, 100]) ≈ [0, 0, 0, 1] → loss ≈ 0
    expect(crossEntropyFromLogits(logits, 3)).toBeCloseTo(0, 6);
  });

  it('handles large logits without overflow (log-sum-exp)', () => {
    // With raw logits, naive exp would overflow. The
    // log-sum-exp stable form gives the same answer.
    const logits = [1000, 1001, 999];
    // Mathematically: -1000 + log(e^0 + e^1 + e^-1) ≈ 1 + log(1 + e + 1/e) ≈ 1 + 1.541 = 2.541
    const v = crossEntropyFromLogits(logits, 0);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(5);
  });
});

describe('crossEntropyCurve', () => {
  it('matches -log(p)', () => {
    for (const p of [0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999]) {
      expect(crossEntropyCurve(p)).toBeCloseTo(-Math.log(p), 10);
    }
  });

  it('returns +∞ at p=0', () => {
    expect(crossEntropyCurve(0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns 0 at p=1', () => {
    expect(crossEntropyCurve(1)).toBe(0);
  });

  it('throws on out-of-range p', () => {
    expect(() => crossEntropyCurve(-0.1)).toThrow();
    expect(() => crossEntropyCurve(1.1)).toThrow();
  });
});
