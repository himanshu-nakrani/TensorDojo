import { describe, expect, it } from 'vitest';
import {
  crossEntropy,
  distillStep,
  distillationGrad,
  distillationLoss,
  softmaxT,
} from './distillation';

describe('softmaxT', () => {
  it('matches plain softmax at T=1', () => {
    const out = softmaxT([1, 2, 3]);
    const expected = [0.0900, 0.2447, 0.6652];
    for (let i = 0; i < out.length; i += 1) {
      expect(out[i]).toBeCloseTo(expected[i] as number, 3);
    }
    expect(out.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
  });

  it('flattens at high T', () => {
    const out = softmaxT([0, 5, 10], 100);
    // With T=100, the spread is small; distribution is near uniform.
    for (const v of out) {
      expect(v).toBeGreaterThan(0.2);
      expect(v).toBeLessThan(0.45);
    }
  });
});

describe('distillationLoss', () => {
  it('matches teacher exactly: soft loss = teacher entropy * T^2', () => {
    const teacher = [2, 1, 4, 0.5];
    const T = 4;
    const pT = softmaxT(teacher, T);
    const expectedSoft = crossEntropy(pT, pT) * T * T;
    const { soft } = distillationLoss(teacher, teacher, 2, T, 1);
    expect(soft).toBeCloseTo(expectedSoft, 4);
  });

  it('alpha=0 zeros out the soft term', () => {
    const { total, hard } = distillationLoss([1, 2, 3], [5, 5, 5], 1, 4, 0);
    expect(total).toBeCloseTo(hard, 6);
  });

  it('alpha=1 zeros out the hard term', () => {
    const { total, soft } = distillationLoss([1, 2, 3], [5, 5, 5], 0, 4, 1);
    expect(total).toBeCloseTo(soft, 6);
  });
});

describe('distillStep', () => {
  it('drives student toward teacher distribution at alpha=1', () => {
    const teacher = [1, 5, 1, 1];
    const T = 4;
    let student = [0, 0, 0, 0];
    const before = distillationLoss(student, teacher, 1, T, 1).total;
    for (let i = 0; i < 200; i += 1) {
      student = distillStep(student, teacher, 1, T, 1, 0.1);
    }
    const after = distillationLoss(student, teacher, 1, T, 1).total;
    expect(after).toBeLessThan(before);
    // Student soft distribution should now be very close to teacher soft.
    const pS = softmaxT(student, T);
    const pT = softmaxT(teacher, T);
    for (let i = 0; i < 4; i += 1) {
      expect(pS[i]).toBeCloseTo(pT[i] as number, 2);
    }
  });

  it('drives student toward one-hot label at alpha=0', () => {
    let student = [0, 0, 0, 0];
    const teacher = [0, 0, 0, 0];
    for (let i = 0; i < 200; i += 1) {
      student = distillStep(student, teacher, 2, 1, 0, 0.1);
    }
    const pS = softmaxT(student, 1);
    expect(pS[2]).toBeGreaterThan(0.9);
  });
});

describe('distillationGrad', () => {
  it('gradient is zero when student already matches under pure soft loss', () => {
    const teacher = [1, 2, 3, 0.5];
    const T = 3;
    const g = distillationGrad(teacher, teacher, 1, T, 1);
    for (const v of g) {
      expect(Math.abs(v)).toBeLessThan(1e-9);
    }
  });
});
