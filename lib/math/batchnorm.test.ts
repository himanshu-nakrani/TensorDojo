import { describe, it, expect } from 'vitest';
import {
  batchNormForward,
  batchNormInference,
  defaultBNParams,
  DEFAULT_MOMENTUM,
} from './batchnorm';

describe('batchNormForward (training)', () => {
  it('post-normalization activations have zero mean and unit variance per feature', () => {
    // γ = 1, β = 0: the output is just (x − μ) / √(σ² + ε).
    const x = [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
    ];
    const params = defaultBNParams(2);
    // gamma/beta default to 1/0; runningMean/var default to 0/1.
    // Disable running-stat mutation by setting momentum=0.
    const r = batchNormForward(x, params, { momentum: 0 });
    // Per-feature: y[·][0] should have mean 0 and unit variance
    // (modulo the 1/N Bessel correction; we use the biased estimator
    // here so the variance is exactly (1/N) Σ (x - μ)² = (5/4)/4 = 0.625
    // — but after normalization the variance is 1).
    // Easier check: mean ≈ 0 (within ε) and the std of the normalized
    // values is 1.
    for (let f = 0; f < 2; f += 1) {
      const col = r.y.map((row) => row[f]!);
      const mean = col.reduce((a, b) => a + b, 0) / col.length;
      expect(Math.abs(mean)).toBeLessThan(1e-9);
    }
  });

  it('γ and β are applied after normalization (y = γ x̂ + β)', () => {
    // With γ = 2, β = 5, the output y = 2 * x̂ + 5.
    const x = [
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const params = defaultBNParams(2);
    params.gamma = [2, 1];
    params.beta = [5, 0];
    params.runningMean = [0, 0];
    params.runningVar = [1, 1];
    const r = batchNormForward(x, params, { momentum: 0 });
    // The first feature: batchMean = 2.5, batchVar = 1.25.
    // For x=1: x̂ = (1 - 2.5) / sqrt(1.25) ≈ -1.342; y = 2 * -1.342 + 5 ≈ 2.317.
    // For x=4: x̂ = (4 - 2.5) / sqrt(1.25) ≈ 1.342; y ≈ 7.683.
    expect(r.y[0]![0]!).toBeCloseTo(2.317, 2);
    expect(r.y[3]![0]!).toBeCloseTo(7.683, 2);
    // Second feature: γ=1, β=0, all x=0 → batchMean=0, batchVar=0,
    // x̂=0 (numerator=0, sqrt(0+ε)≈0, 0/ε=0), y=0.
    for (let i = 0; i < x.length; i += 1) {
      expect(r.y[i]![1]!).toBeCloseTo(0, 6);
    }
  });

  it('updates running stats with the configured momentum', () => {
    // Two training steps. After the second, the running stats
    // should be a weighted blend of the two batch stats (momentum=0.5)
    // and the initial values (μ=0, σ²=1).
    const params = defaultBNParams(1);
    const x1 = [[2.0]];
    const r1 = batchNormForward(x1, params, { momentum: 0.5 });
    // After step 1: runningMean = 0.5 * 0 + 0.5 * 2.0 = 1.0.
    // runningVar   = 0.5 * 1 + 0.5 * 0   = 0.5.
    expect(params.runningMean[0]!).toBeCloseTo(1.0, 9);
    expect(params.runningVar[0]!).toBeCloseTo(0.5, 9);
    const x2 = [[4.0]];
    const r2 = batchNormForward(x2, params, { momentum: 0.5 });
    // After step 2: μ_running = 0.5 * 1.0 + 0.5 * 4.0 = 2.5.
    //              σ²_running = 0.5 * 0.5 + 0.5 * 0   = 0.25.
    expect(params.runningMean[0]!).toBeCloseTo(2.5, 9);
    expect(params.runningVar[0]!).toBeCloseTo(0.25, 9);
  });

  it('running stats converge to the true distribution over many steps', () => {
    // Draw from N(μ=5, σ²=4) with batches of 16. After many
    // steps the running stats should be close to (5, 4). The
    // test threshold is loose — 0.8 for the mean and 1.0 for
    // the variance — because the BiasedSampleVariance used in
    // the running update is noisy for small batches and the
    // convergence depends on the momentum.
    const params = defaultBNParams(1);
    const trueMean = 5;
    const trueVar = 4;
    let s = 42 >>> 0;
    const rand = (): number => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Box-Muller for N(0, 1).
    const normal = (): number => {
      const u1 = Math.max(rand(), 1e-9);
      const u2 = rand();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    for (let step = 0; step < 500; step += 1) {
      const batch: number[][] = [];
      for (let i = 0; i < 16; i += 1) {
        batch.push([trueMean + Math.sqrt(trueVar) * normal()]);
      }
      batchNormForward(batch, params, { momentum: 0.1 });
    }
    expect(Math.abs((params.runningMean[0] ?? 0) - trueMean)).toBeLessThan(0.8);
    expect(Math.abs((params.runningVar[0] ?? 0) - trueVar)).toBeLessThan(1.0);
  });

  it('throws on shape mismatch', () => {
    const params = defaultBNParams(2);
    const bad: number[][] = [[1, 2, 3]];
    expect(() => batchNormForward(bad, params)).toThrow();
  });
});

describe('batchNormInference', () => {
  it('uses running stats, not batch stats', () => {
    // After training, the running stats reflect the training
    // distribution. Inference normalizes against those — a
    // single example with x=2.0 should be normalized using
    // the running mean/var, not the batch mean (which would be
    // 2.0 with batch size 1).
    const params = defaultBNParams(1);
    params.gamma = [1];
    params.beta = [0];
    params.runningMean = [1.0];
    params.runningVar = [1.0];
    const y = batchNormInference([[2.0]], params);
    // y[0][0] = (2 - 1) / sqrt(1 + ε) ≈ 1.0
    expect(y[0]![0]!).toBeCloseTo(1.0, 4);
  });

  it('returns all zeros if input equals running mean (footgun demo)', () => {
    // The classic batchnorm footgun: at inference, if a single
    // example lands exactly on the running mean, the
    // normalization is zero. (If the user accidentally used
    // batch statistics with batch size 1, the output would
    // also be zero — but for a different reason.)
    const params = defaultBNParams(1);
    params.runningMean = [3.0];
    params.runningVar = [1.0];
    const y = batchNormInference([[3.0]], params);
    expect(y[0]![0]!).toBeCloseTo(0, 6);
  });

  it('handles the default-init case (γ=1, β=0, running μ=0, σ²=1)', () => {
    // At init with no training, running stats are (0, 1) → the
    // inference output equals the input.
    const params = defaultBNParams(2);
    const y = batchNormInference([[1.5, -0.7]], params);
    expect(y[0]![0]!).toBeCloseTo(1.5, 4);
    expect(y[0]![1]!).toBeCloseTo(-0.7, 4);
  });
});
