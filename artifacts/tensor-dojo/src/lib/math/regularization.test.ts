import { describe, it, expect } from 'vitest';
import { adamwDecay, l2PolyFit, shrinkageStep } from './regularization';
import { evalPolyVector, evalPoly, mse, polyFit, syntheticRegression } from './polynomial-fit';

describe('l2PolyFit', () => {
  it('λ = 0 matches the unregularized fit', () => {
    const { xs, ys } = syntheticRegression(20, 0);
    const deg = 5;
    const w0 = polyFit(xs, ys, deg);
    const wL2 = l2PolyFit(xs, ys, deg, 0);
    expect(w0).not.toBeNull();
    expect(wL2).not.toBeNull();
    for (let i = 0; i < w0!.length; i += 1) {
      expect(wL2![i]!).toBeCloseTo(w0![i]!, 8);
    }
  });

  it('very large λ drives the higher-order coefficients toward 0', () => {
    // 20 points, degree-15 fit, huge λ. The first 5 non-bias
    // coefficients (w_1..w_5) should dominate; the rest should
    // be near 0.
    const { xs, ys } = syntheticRegression(20, 0);
    const w = l2PolyFit(xs, ys, 15, 1e6);
    expect(w).not.toBeNull();
    for (let i = 6; i < w!.length; i += 1) {
      expect(Math.abs(w![i]!)).toBeLessThan(1e-3);
    }
  });

  it('with large λ, the higher-order coefficients are pulled toward 0', () => {
    // 20 points, degree 5. With a large λ, the non-bias
    // coefficients (w[1]..w[5]) should shrink — but the bias
    // is *not* regularized, so w[0] is left alone. The bias
    // will shift a bit to absorb the change, but the magnitude
    // of the higher-order coefficients should be small.
    const { xs, ys } = syntheticRegression(20, 0);
    const w = l2PolyFit(xs, ys, 5, 1e3);
    expect(w).not.toBeNull();
    // Sum of squares of non-bias coefficients is small.
    const ww = w as number[];
    let sumSq = 0;
    for (let i = 1; i < ww.length; i += 1) {
      sumSq += ww[i]! * ww[i]!;
    }
    expect(sumSq).toBeLessThan(1e-2);
  });

  it('reduces overfitting on a held-out split (test MSE improves with right-sized λ)', () => {
    // 20 noisy points, polynomial fit at degree 7 (high but
    // still less than n/2 so the system is well-conditioned).
    // With a small λ the test MSE is high (overfit); with a
    // moderate λ the test MSE is lower; with a huge λ both
    // train and test MSE are high (underfit). We check the
    // second of these — that a sensible λ beats λ = 0 on the
    // held-out half.
    const { xs, ys } = syntheticRegression(20, 7);
    const half = Math.floor(xs.length / 2);
    const xsTrain = xs.slice(0, half);
    const ysTrain = ys.slice(0, half);
    const xsTest = xs.slice(half);
    const ysTest = ys.slice(half);
    const wUnreg = polyFit(xsTrain, ysTrain, 7);
    const wL2 = l2PolyFit(xsTrain, ysTrain, 7, 0.01);
    expect(wUnreg).not.toBeNull();
    expect(wL2).not.toBeNull();
    const predU = evalPolyVector(wUnreg!, xsTest);
    const predL = evalPolyVector(wL2!, xsTest);
    const mseU = mse(ysTest, predU);
    const mseL = mse(ysTest, predL);
    // A small ridge is enough to beat the unregularized high-degree
    // fit on the held-out half. The test isn't comparing specific
    // magnitudes — only that the L2 form does *something* positive.
    expect(mseL).toBeLessThan(mseU);
  });

  it('returns null on a singular unregularized system (e.g. all x equal, λ=0)', () => {
    const xs = [1, 1, 1, 1];
    const ys = [0, 1, 2, 3];
    // No variance in x → XᵀX is rank 1, but degree=1 → 2 cols,
    // still singular.
    const w = l2PolyFit(xs, ys, 1, 0);
    expect(w).toBeNull();
  });
});

describe('adamwDecay', () => {
  it('with λ=0 matches plain SGD step (w ← w − η g)', () => {
    const w = [0.5, 1.0, -0.2, 0.0];
    const g = [0.1, -0.3, 0.05, 0.4];
    const lr = 0.1;
    const out = adamwDecay(w, g, lr, 0);
    for (let i = 0; i < w.length; i += 1) {
      expect(out[i]!).toBeCloseTo(w[i]! - lr * g[i]!, 10);
    }
  });

  it('bias is excluded by default; with regularizeBias:true it is included', () => {
    const w = [0.5, 1.0, -0.2];
    const g = [0.0, 0.0, 0.0];
    const lr = 0.1;
    const lambda = 1;
    const def = adamwDecay(w, g, lr, lambda);
    const incl = adamwDecay(w, g, lr, lambda, { regularizeBias: true });
    // Default: w[0] unchanged (no decay on bias).
    expect(def[0]!).toBeCloseTo(0.5, 10);
    // With regularizeBias:true: w[0] shrunk.
    expect(incl[0]!).toBeCloseTo(0.5 - 0.1 * 1 * 0.5, 10);
    // Higher-order coefficients are shrunk in both cases.
    for (let i = 1; i < w.length; i += 1) {
      expect(def[i]!).toBeCloseTo(w[i]! - lr * lambda * w[i]!, 10);
      expect(incl[i]!).toBeCloseTo(def[i]!, 10);
    }
  });

  it('decoupled decay shrinks zero-gradient weights (classic L2 would not)', () => {
    // Classic L2 in the loss: d/dw (L + λ‖w‖²) = g + λ w; if g = 0
    //   the gradient is λ w. Combined with Adam's denominator,
    //   large |g|-history weights get a smaller effective decay.
    // Decoupled: w ← w − η (g + λ w) = w − η λ w when g=0.
    //   So a zero-gradient weight shrinks by a fixed factor
    //   (1 − η λ) per step.
    // The bias (i=0) is exempt by convention; use w[1] to test
    // the decayed weight.
    let w = [0.0, 1.0];
    const lr = 0.1;
    const lambda = 0.5;
    for (let t = 0; t < 100; t += 1) {
      w = adamwDecay(w, [0, 0], lr, lambda);
    }
    // After 100 steps: w[1] ≈ 1 * (1 − η λ)^100 = 0.95^100 ≈ 0.006.
    expect(w[1]!).toBeLessThan(0.01);
    expect(w[1]!).toBeGreaterThan(0);
  });
});

describe('shrinkageStep', () => {
  it('is the closed form of one AdamW step with zero gradient', () => {
    // With g=0, adamwDecay reduces to w ← w − η λ w.
    // shrinkageStep is the explicit form: w ← w − η g − η λ w.
    expect(shrinkageStep(1, 0, 0.1, 0.5)).toBeCloseTo(1 - 0.05, 10);
    expect(shrinkageStep(2, 0.1, 0.1, 0.5)).toBeCloseTo(2 - 0.01 - 0.1, 10);
  });
});
