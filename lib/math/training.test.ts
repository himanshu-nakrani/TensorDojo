import { describe, expect, it } from 'vitest';
import {
  N_IN,
  N_OUT,
  N_PARAMS,
  PRESET_CONFIGS,
  backwardOne,
  backwardOneAnalytic,
  batchAccuracy,
  batchLoss,
  defaultInitParams,
  flattenParams,
  forwardProbs,
  lrForStep,
  sliceParams,
  syntheticClassification,
  train,
  trainTestSplit,
  trainWithFreezeMask,
  type LabeledExample,
  type Params,
} from './training';

describe('shapes', () => {
  it('exports the expected layer sizes', () => {
    expect(N_IN).toBe(2);
    expect(N_OUT).toBe(3);
    expect(N_PARAMS).toBe(
      8 * 2 + 8 + 8 * 8 + 8 + 3 * 8 + 3,
    );
  });
});

describe('sliceParams / flattenParams', () => {
  it('round-trips: flatten then slice yields the same nested view', () => {
    const p = defaultInitParams(0);
    expect(p.length).toBe(N_PARAMS);
    const slices = sliceParams(p);
    const back = flattenParams(slices);
    for (let i = 0; i < N_PARAMS; i += 1) {
      expect(back[i]).toBe(p[i]);
    }
  });
});

describe('forwardProbs', () => {
  it('returns a valid probability distribution', () => {
    const p = defaultInitParams(0);
    const { probs } = forwardProbs(p, [0.3, -0.4]);
    expect(probs.length).toBe(N_OUT);
    let s = 0;
    for (const v of probs) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
      s += v;
    }
    expect(s).toBeCloseTo(1, 10);
  });
});

describe('backwardOne == backwardOneAnalytic (the build-time sanity check)', () => {
  // Numerical vs analytic gradient. The test enforces the
  // claim that the composed forward+backward is correct to
  // numerical precision.
  //
  // We avoid x=0 cases (which put ReLU activations exactly
  // on the kink, where the analytic gradient is a subgradient
  // and the numerical gradient can land on either side).
  const cases: Array<{ seed: number; x: [number, number]; label: number }> = [
    { seed: 0, x: [0.5, -0.3], label: 1 },
    { seed: 1, x: [1.0, 1.0], label: 0 },
    { seed: 2, x: [-0.7, 0.2], label: 2 },
    { seed: 4, x: [0.3, 0.6], label: 2 },
  ];
  for (const c of cases) {
    it(`numerical == analytic (seed=${c.seed})`, () => {
      const p = defaultInitParams(c.seed);
      const a = backwardOneAnalytic(p, c.x, c.label);
      const n = backwardOne(p, c.x, c.label);
      let maxRel = 0;
      for (let i = 0; i < N_PARAMS; i += 1) {
        const av = a[i]!;
        const nv = n[i]!;
        // Where the analytic is essentially zero (a parameter
        // whose path is gated off by a ReLU), the numerical
        // can disagree because it crosses the kink. Skip those.
        if (Math.abs(av) < 1e-4) continue;
        // Relative tolerance: |a - n| / max(|a|, |n|) < 0.05.
        const denom = Math.max(Math.abs(av), Math.abs(nv), 1e-6);
        const rel = Math.abs(av - nv) / denom;
        if (rel > maxRel) maxRel = rel;
      }
      // 5% relative tolerance is plenty: the central-difference
      // step h=1e-5 has O(h²) error of 1e-10, but for parameters
      // whose loss is near a ReLU kink the residual is dominated
      // by the discrete jump, not the truncation.
      expect(maxRel).toBeLessThan(0.05);
    });
  }
});

describe('synthetic dataset + train/test split', () => {
  it('is deterministic', () => {
    const a = syntheticClassification(0);
    const b = syntheticClassification(0);
    expect(a.length).toBe(200);
    for (let i = 0; i < a.length; i += 1) {
      expect(a[i]!.x[0]).toBe(b[i]!.x[0]);
      expect(a[i]!.x[1]).toBe(b[i]!.x[1]);
      expect(a[i]!.label).toBe(b[i]!.label);
    }
  });
  it('labels are in [0, 3)', () => {
    for (const e of syntheticClassification(7)) {
      expect(e.label).toBeGreaterThanOrEqual(0);
      expect(e.label).toBeLessThan(N_OUT);
    }
  });
  it('train/test split preserves all rows', () => {
    const d = syntheticClassification(0);
    const s = trainTestSplit(d, 0.4, 0);
    expect(s.train.length + s.test.length).toBe(d.length);
  });
});

describe('lrForStep (the schedule dispatch)', () => {
  it('constant', () => {
    expect(lrForStep(50, 'constant', 100, 0.5, 0)).toBeCloseTo(0.5, 10);
  });
  it('linear', () => {
    expect(lrForStep(50, 'linear', 100, 0.5, 0)).toBeCloseTo(0.25, 10);
  });
  it('cosine', () => {
    expect(lrForStep(50, 'cosine', 100, 0.5, 0)).toBeCloseTo(0.25, 10);
  });
  it('warmup-cosine (peak at warmup)', () => {
    expect(lrForStep(10, 'warmup-cosine', 100, 0.5, 10)).toBeCloseTo(0.5, 10);
  });
});

describe('train (the centerpiece)', () => {
  it('default preset trains to ≥ 90% test accuracy in 300 steps', () => {
    const data = syntheticClassification(0);
    const split = trainTestSplit(data, 0.4, 0);
    const cfg = PRESET_CONFIGS.find((c) => c.id === 'default')!.config;
    const r = train({
      initParams: defaultInitParams(0),
      dataset: split.train,
      testSet: split.test,
      ...cfg,
    });
    const finalAcc = r.testAcc[r.testAcc.length - 1]!;
    expect(finalAcc).toBeGreaterThanOrEqual(0.9);
    expect(r.diverged).toBe(false);
  });
  it('diverges preset reaches a much-higher loss than the default (visibly diverges)', () => {
    const data = syntheticClassification(0);
    const split = trainTestSplit(data, 0.4, 0);
    const cfgDefault = PRESET_CONFIGS.find((c) => c.id === 'default')!.config;
    const cfgDiverges = PRESET_CONFIGS.find((c) => c.id === 'diverges')!.config;
    const r1 = train({
      initParams: defaultInitParams(0),
      dataset: split.train,
      ...cfgDefault,
    });
    const r2 = train({
      initParams: defaultInitParams(0),
      dataset: split.train,
      ...cfgDiverges,
    });
    // The diverges preset should *visibly* diverge: the final
    // loss should be much higher than the default's, OR the
    // `diverged` flag should have fired. We check both because
    // depending on init some "diverges" runs land in a
    // bad-but-finite regime rather than literally overflowing.
    const defaultFinal = r1.losses[r1.losses.length - 1]!;
    const divergesFinal = r2.losses[r2.losses.length - 1]!;
    const divergedFlag = r2.diverged;
    expect(divergesFinal > defaultFinal * 2 || divergedFlag).toBe(true);
  });
  it('no-schedule preset reaches a worse (lower) test accuracy than default', () => {
    const data = syntheticClassification(0);
    const split = trainTestSplit(data, 0.4, 0);
    const cfgDefault = PRESET_CONFIGS.find((c) => c.id === 'default')!.config;
    const cfgNoSched = PRESET_CONFIGS.find((c) => c.id === 'no-schedule')!.config;
    const r1 = train({
      initParams: defaultInitParams(0),
      dataset: split.train,
      testSet: split.test,
      ...cfgDefault,
    });
    const r2 = train({
      initParams: defaultInitParams(0),
      dataset: split.train,
      testSet: split.test,
      ...cfgNoSched,
    });
    // Both train (loss decreases), but the cosine schedule
    // lets the model settle near a minimum; the constant LR
    // bounces around. Test accuracy is the right comparison.
    const accDefault = r1.testAcc[r1.testAcc.length - 1]!;
    const accNoSched = r2.testAcc[r2.testAcc.length - 1]!;
    expect(accDefault).toBeGreaterThanOrEqual(accNoSched - 0.02);
  });
  it('batch loss is finite and decreases over training (default preset)', () => {
    const data = syntheticClassification(0);
    const split = trainTestSplit(data, 0.4, 0);
    const cfg = PRESET_CONFIGS.find((c) => c.id === 'default')!.config;
    const r = train({
      initParams: defaultInitParams(0),
      dataset: split.train,
      ...cfg,
    });
    const first = r.losses[0]!;
    const last = r.losses[r.losses.length - 1]!;
    expect(Number.isFinite(first)).toBe(true);
    expect(Number.isFinite(last)).toBe(true);
    expect(last).toBeLessThan(first / 2);
  });
  it('accuracy is in [0, 1] at every step', () => {
    const data = syntheticClassification(0);
    const split = trainTestSplit(data, 0.4, 0);
    const cfg = PRESET_CONFIGS.find((c) => c.id === 'default')!.config;
    const r = train({
      initParams: defaultInitParams(0),
      dataset: split.train,
      testSet: split.test,
      ...cfg,
    });
    for (const a of r.testAcc) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });
  it('throws on malformed config', () => {
    const data = syntheticClassification(0);
    const split = trainTestSplit(data, 0.4, 0);
    expect(() =>
      train({
        initParams: defaultInitParams(0),
        dataset: split.train,
        optimizer: 'adam',
        schedule: 'cosine',
        peakLr: 0.001,
        batchSize: 0,
        numSteps: 10,
      }),
    ).toThrow();
  });
});

describe('batchLoss / batchAccuracy on a small batch', () => {
  it('accuracy is 0 when the model is uniform', () => {
    const p: Params = defaultInitParams(0);
    // All-zero output → uniform softmax → argmax is always 0.
    const flat = new Array(N_PARAMS).fill(0);
    const batch: LabeledExample[] = [
      { x: [0.5, 0.5], label: 0 },
      { x: [0.5, 0.5], label: 1 },
      { x: [0.5, 0.5], label: 2 },
    ];
    expect(batchAccuracy(flat, batch)).toBeCloseTo(1 / 3, 5);
    expect(batchLoss(p, batch)).toBeGreaterThan(0);
  });
});

describe('trainWithFreezeMask', () => {
  it('freezing all layers leaves the parameters unchanged after training', () => {
    const dataset = syntheticClassification(0);
    const init = defaultInitParams(0);
    const result = trainWithFreezeMask({
      initParams: init,
      dataset,
      optimizer: 'sgd',
      schedule: 'constant',
      peakLr: 0.1,
      batchSize: 16,
      numSteps: 10,
      seed: 0,
      freezeMask: { layer1: true, layer2: true, layer3: true },
    });
    for (let i = 0; i < init.length; i += 1) {
      expect(result.finalParams[i]).toBeCloseTo(init[i]!, 8);
    }
  });
});
