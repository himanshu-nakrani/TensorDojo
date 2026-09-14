import { describe, it, expect } from 'vitest';
import { trainSequential } from './forgetting';
import { syntheticClassification } from './training';

describe('trainSequential', () => {
  it('sequential + high LR collapses task-A accuracy in phase B', () => {
    const dataA = syntheticClassification(0);
    const dataB = syntheticClassification(1); // different seed → different swirl
    const taskA = dataA.slice(0, 100);
    const taskATest = dataA.slice(100, 164);
    const taskB = dataB.slice(0, 100);
    const taskBTest = dataB.slice(100, 164);

    const result = trainSequential({
      taskA,
      taskATest,
      taskB,
      taskBTest,
      stepsA: 200,
      stepsB: 200,
      lrA: 0.05,
      lrB: 2.0, // phase B uses 40x LR → chaotic forgetting
      interleave: false,
      seed: 0,
    });

    const endOfPhaseA_accA = result.accAOverTime[200]!;
    const endOfPhaseB_accA = result.accAOverTime[400]!;

    expect(endOfPhaseA_accA).toBeGreaterThan(0.5); // phase A trained well
    expect(endOfPhaseB_accA).toBeLessThan(endOfPhaseA_accA - 0.15); // dropped ≥15pp
  });

  it('interleaved phase B keeps task-A accuracy stable', () => {
    const dataA = syntheticClassification(0);
    const dataB = syntheticClassification(1);
    const taskA = dataA.slice(0, 100);
    const taskATest = dataA.slice(100, 164);
    const taskB = dataB.slice(0, 100);
    const taskBTest = dataB.slice(100, 164);

    const result = trainSequential({
      taskA,
      taskATest,
      taskB,
      taskBTest,
      stepsA: 200,
      stepsB: 200,
      lrA: 0.05,
      lrB: 0.05, // moderate LR
      interleave: true,
      seed: 0,
    });

    const endOfPhaseA_accA = result.accAOverTime[200]!;
    const endOfPhaseB_accA = result.accAOverTime[400]!;

    expect(endOfPhaseA_accA).toBeGreaterThan(0.5);
    // Interleaving should retain task-A accuracy within a small margin
    expect(endOfPhaseB_accA).toBeGreaterThan(endOfPhaseA_accA - 0.10);
  });

  it('arrays have length stepsA + stepsB + 1', () => {
    const data = syntheticClassification(0);
    const result = trainSequential({
      taskA: data.slice(0, 50),
      taskATest: data.slice(50, 70),
      taskB: data.slice(70, 120),
      taskBTest: data.slice(120, 140),
      stepsA: 10,
      stepsB: 10,
      lrA: 0.05,
      lrB: 0.05,
      interleave: false,
      seed: 0,
    });
    expect(result.accAOverTime).toHaveLength(21);
    expect(result.accBOverTime).toHaveLength(21);
  });

  it('determinism: same seed produces same result', () => {
    const data = syntheticClassification(0);
    const cfg = {
      taskA: data.slice(0, 50),
      taskATest: data.slice(50, 70),
      taskB: data.slice(70, 120),
      taskBTest: data.slice(120, 140),
      stepsA: 10,
      stepsB: 10,
      lrA: 0.05,
      lrB: 0.05,
      interleave: false,
      seed: 42,
    };
    const a = trainSequential(cfg);
    const b = trainSequential(cfg);
    expect(a.accAOverTime).toEqual(b.accAOverTime);
    expect(a.accBOverTime).toEqual(b.accBOverTime);
  });
});
