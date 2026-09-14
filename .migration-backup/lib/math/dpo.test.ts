import { describe, expect, it } from 'vitest';
import {
  DPO_BASELINE_LOSS,
  dpoGrad,
  dpoLoss,
  negLogSigmoid,
  rewardMargin,
} from './dpo';

describe('negLogSigmoid', () => {
  it('matches the closed form at 0', () => {
    expect(negLogSigmoid(0)).toBeCloseTo(Math.log(2), 8);
  });

  it('approaches 0 for large positive x', () => {
    expect(negLogSigmoid(20)).toBeLessThan(1e-8);
  });

  it('approaches x for large negative x', () => {
    expect(negLogSigmoid(-20)).toBeCloseTo(20, 6);
  });
});

describe('dpoLoss', () => {
  it('= log 2 when chosen == rejected', () => {
    expect(dpoLoss({ rChosen: 0.3, rRejected: 0.3, beta: 0.1 })).toBeCloseTo(
      DPO_BASELINE_LOSS,
      6,
    );
  });

  it('drops below log 2 when chosen > rejected', () => {
    const l = dpoLoss({ rChosen: 0.5, rRejected: -0.5, beta: 0.5 });
    expect(l).toBeLessThan(DPO_BASELINE_LOSS);
    expect(l).toBeGreaterThan(0);
  });

  it('climbs above log 2 when rejected > chosen', () => {
    const l = dpoLoss({ rChosen: -0.5, rRejected: 0.5, beta: 0.5 });
    expect(l).toBeGreaterThan(DPO_BASELINE_LOSS);
  });

  it('scales with beta', () => {
    const lLow = dpoLoss({ rChosen: 1, rRejected: -1, beta: 0.1 });
    const lHigh = dpoLoss({ rChosen: 1, rRejected: -1, beta: 1.0 });
    // Higher beta rewards the same gap more aggressively → lower loss.
    expect(lHigh).toBeLessThan(lLow);
  });
});

describe('rewardMargin', () => {
  it('= beta · (rChosen - rRejected)', () => {
    expect(
      rewardMargin({ rChosen: 1.5, rRejected: 0.5, beta: 0.2 }),
    ).toBeCloseTo(0.2, 6);
  });
});

describe('dpoGrad', () => {
  it('chosen gradient is negative when loss is improving', () => {
    // At positive margin (winner is winning), grad should push chosen up
    // and rejected down — so dChosen < 0, dRejected > 0.
    const g = dpoGrad({ rChosen: 1, rRejected: -1, beta: 0.5 });
    expect(g.dChosen).toBeLessThan(0);
    expect(g.dRejected).toBeGreaterThan(0);
  });

  it('partials are equal in magnitude, opposite in sign', () => {
    const g = dpoGrad({ rChosen: 0.7, rRejected: -0.2, beta: 0.3 });
    expect(g.dChosen).toBeCloseTo(-g.dRejected, 8);
  });

  it('grad magnitude vanishes as margin grows', () => {
    const small = dpoGrad({ rChosen: 0.5, rRejected: -0.5, beta: 0.5 });
    const large = dpoGrad({ rChosen: 10, rRejected: -10, beta: 0.5 });
    expect(Math.abs(large.dChosen)).toBeLessThan(Math.abs(small.dChosen));
  });
});
