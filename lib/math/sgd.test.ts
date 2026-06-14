import { describe, expect, it } from 'vitest';
import {
  SYNTHETIC_SIZE,
  batchGradient,
  batchLoss,
  gradientEmpiricalStats,
  predict,
  runSgd,
  sampleBatch,
  sgdStepModel,
  syntheticDataset,
  trueGradient,
  type ToyModel,
} from './sgd';

const M0: ToyModel = { a: 0, b: 0, c: 0 };

describe('synthetic dataset', () => {
  it('is deterministic and has 30 examples', () => {
    const a = syntheticDataset();
    const b = syntheticDataset();
    expect(a.length).toBe(SYNTHETIC_SIZE);
    expect(b.length).toBe(SYNTHETIC_SIZE);
    for (let i = 0; i < a.length; i += 1) {
      expect(a[i]!.x).toBe(b[i]!.x);
      expect(a[i]!.y).toBe(b[i]!.y);
      expect(a[i]!.target).toBe(b[i]!.target);
    }
  });
  it('x and y span [-1.5, 1.5]', () => {
    const d = syntheticDataset();
    for (const e of d) {
      expect(e.x).toBeGreaterThanOrEqual(-1.5);
      expect(e.x).toBeLessThanOrEqual(1.5);
      expect(e.y).toBeGreaterThanOrEqual(-1.5);
      expect(e.y).toBeLessThanOrEqual(1.5);
    }
  });
});

describe('predict and batchLoss', () => {
  it('predict is ax + by + c', () => {
    const m: ToyModel = { a: 1, b: 2, c: 3 };
    expect(predict(m, { x: 0.5, y: -0.4, target: 0 })).toBeCloseTo(0.5 - 0.8 + 3, 10);
  });
  it('batchLoss is mean of ½(ŷ − t)² over the batch', () => {
    const m: ToyModel = { a: 0, b: 0, c: 0 };
    const ds = syntheticDataset();
    // With m=0, loss per example = ½ t²; mean = ½ mean(t²).
    const meanTSq = ds.reduce((s, e) => s + e.target * e.target, 0) / ds.length;
    expect(batchLoss(m, ds)).toBeCloseTo(meanTSq / 2, 10);
  });
  it('batchLoss throws on empty batch', () => {
    expect(() => batchLoss(M0, [])).toThrow();
  });
});

describe('batchGradient', () => {
  it('matches a hand-derivation on a 2-example batch', () => {
    // Two examples, m=0:
    //   dL/da = mean(r·x), r = ŷ − t = -t
    //   dL/db = mean(r·y)
    //   dL/dc = mean(r)
    const batch = [
      { x: 1, y: 0, target: 1 },
      { x: 0, y: 1, target: -1 },
    ];
    const g = batchGradient(M0, batch);
    // r = [-1, +1]; dL/da = mean(r·x) = mean([-1·1, +1·0]) = -0.5
    // dL/db = mean(r·y) = mean([-1·0, +1·1]) = +0.5
    // dL/dc = mean(r) = 0
    expect(g.a).toBeCloseTo(-0.5, 10);
    expect(g.b).toBeCloseTo(0.5, 10);
    expect(g.c).toBeCloseTo(0, 10);
  });
  it('throws on empty batch', () => {
    expect(() => batchGradient(M0, [])).toThrow();
  });
});

describe('sgdStepModel', () => {
  it('moves the model in the negative gradient direction', () => {
    const m: ToyModel = { a: 1, b: 0, c: 0 };
    const g = { a: 2, b: -3, c: 4 };
    const eta = 0.1;
    const next = sgdStepModel(m, g, eta);
    expect(next.a).toBeCloseTo(1 - 0.2, 10);
    expect(next.b).toBeCloseTo(0 + 0.3, 10);
    expect(next.c).toBeCloseTo(0 - 0.4, 10);
  });
  it('throws on negative eta', () => {
    expect(() => sgdStepModel(M0, { a: 0, b: 0, c: 0 }, -0.1)).toThrow();
  });
});

describe('sampleBatch', () => {
  it('returns the requested number of examples', () => {
    const ds = syntheticDataset();
    for (const k of [1, 4, 16, ds.length]) {
      const b = sampleBatch(ds, k, 0);
      expect(b.length).toBe(k);
    }
  });
  it('is deterministic for the same seed', () => {
    const ds = syntheticDataset();
    const a = sampleBatch(ds, 4, 123).map((e) => e.x);
    const b = sampleBatch(ds, 4, 123).map((e) => e.x);
    expect(a).toEqual(b);
  });
  it('returns full dataset when batchSize === size', () => {
    const ds = syntheticDataset();
    const b = sampleBatch(ds, ds.length, 0);
    expect(b.length).toBe(ds.length);
  });
  it('throws on out-of-range batchSize', () => {
    const ds = syntheticDataset();
    expect(() => sampleBatch(ds, 0, 0)).toThrow();
    expect(() => sampleBatch(ds, ds.length + 1, 0)).toThrow();
  });
});

describe('runSgd: the centerpiece', () => {
  it('full-batch converges (smooth, slow)', () => {
    const ds = syntheticDataset();
    // Start from a non-zero model. The synthetic dataset
    // (a 6x5 grid in [-1.5, 1.5]²) is symmetric about the
    // origin, so the gradient at M0 is essentially zero —
    // SGD just sits there. Starting from (0.5, 0.5, 0.5)
    // puts the loss on a non-flat region and η=0.1 is the
    // right step size.
    const start: ToyModel = { a: 0.5, b: 0.5, c: 0.5 };
    const r = runSgd(start, ds, ds.length, 0.1, 50, 0);
    // Full-batch, eta=0.1, 50 steps. The model should land on
    // something reasonable. The exact value depends on the
    // dataset shape; just check the loss has decreased
    // substantially.
    expect(r.losses[r.losses.length - 1]!).toBeLessThan(r.losses[0]! / 4);
  });
  it('one-sample is noisier than full-batch (variance sanity check)', () => {
    const ds = syntheticDataset();
    const m: ToyModel = { a: 0.5, b: -0.2, c: 0.1 };
    const statsFull = gradientEmpiricalStats(m, ds, ds.length, 50, 0);
    const statsOne = gradientEmpiricalStats(m, ds, 1, 50, 0);
    // Per-coordinate variance must be strictly larger at batch=1
    // (in expectation). Sample a coordinate.
    expect(statsOne.variance.a).toBeGreaterThan(statsFull.variance.a);
    expect(statsOne.variance.b).toBeGreaterThan(statsFull.variance.b);
    expect(statsOne.variance.c).toBeGreaterThan(statsFull.variance.c);
  });
  it('variance shrinks with batch size', () => {
    const ds = syntheticDataset();
    const m: ToyModel = { a: 0.5, b: -0.2, c: 0.1 };
    const v4 = gradientEmpiricalStats(m, ds, 4, 200, 0).variance;
    const v16 = gradientEmpiricalStats(m, ds, 16, 200, 0).variance;
    expect(v16.a).toBeLessThan(v4.a);
    expect(v16.b).toBeLessThan(v4.b);
    expect(v16.c).toBeLessThan(v4.c);
  });
  it('empirical mean approaches the true full-batch gradient as batch → full', () => {
    const ds = syntheticDataset();
    const m: ToyModel = { a: 0.5, b: -0.2, c: 0.1 };
    const trueG = trueGradient(m, ds);
    // Full-batch gradients: the empirical mean *is* the true gradient.
    const stats = gradientEmpiricalStats(m, ds, ds.length, 10, 0);
    expect(stats.mean.a).toBeCloseTo(trueG.a, 10);
    expect(stats.mean.b).toBeCloseTo(trueG.b, 10);
    expect(stats.mean.c).toBeCloseTo(trueG.c, 10);
  });
  it('throws on negative numSteps', () => {
    expect(() => runSgd(M0, syntheticDataset(), 4, 0.1, -1, 0)).toThrow();
  });
});
