import { describe, it, expect } from 'vitest';
import {
  finalize,
  makeEarlyStopper,
  observe,
  type EarlyStopper,
} from './early-stopping';

function fresh(patience: number): EarlyStopper {
  return makeEarlyStopper(patience);
}

describe('makeEarlyStopper', () => {
  it('throws on negative patience', () => {
    expect(() => makeEarlyStopper(-1)).toThrow();
  });
  it('throws on negative minDelta', () => {
    expect(() => makeEarlyStopper(0, -0.1)).toThrow();
  });
  it('initializes with no best, no bad steps, not stopped', () => {
    const s = fresh(5);
    expect(s.bestLoss).toBeNull();
    expect(s.bestStep).toBe(-1);
    expect(s.badSteps).toBe(0);
    expect(s.stopped).toBe(false);
  });
});

describe('observe', () => {
  it('the first observation sets the best and reports improved', () => {
    const s = fresh(5);
    const r = observe(s, 0, 1.0, { weights: [1] });
    expect(r.improved).toBe(true);
    expect(s.bestLoss).toBeCloseTo(1.0, 10);
    expect(s.bestStep).toBe(0);
    expect(s.badSteps).toBe(0);
    expect(s.stopped).toBe(false);
  });

  it('a strictly better loss resets badSteps and updates best', () => {
    const s = fresh(3);
    observe(s, 0, 1.0, 'p0');
    observe(s, 1, 0.9, 'p1');
    expect(s.badSteps).toBe(0);
    expect(s.bestLoss).toBeCloseTo(0.9, 10);
    expect(s.bestStep).toBe(1);
  });

  it('best loss is monotone non-increasing across observations', () => {
    const s = fresh(10);
    let lastBest = Infinity;
    for (let i = 0; i < 20; i += 1) {
      const loss = 1.0 - 0.05 * i + 0.1 * Math.sin(i);
      observe(s, i, loss, `p${i}`);
      if (s.bestLoss !== null) {
        expect(s.bestLoss).toBeLessThanOrEqual(lastBest + 1e-12);
        lastBest = s.bestLoss;
      }
    }
  });

  it('patience=0 stops on the first non-improvement', () => {
    const s = fresh(0);
    observe(s, 0, 1.0, 'p0');
    expect(s.stopped).toBe(false);
    observe(s, 1, 1.0, 'p1'); // not better
    // patience=0: stop when badSteps (1) > patience (0).
    expect(s.stopped).toBe(true);
  });

  it('patience=N allows N non-improving steps, stops on step N+1', () => {
    const s = fresh(2);
    observe(s, 0, 1.0, 'p0');
    observe(s, 1, 1.0, 'p1');
    observe(s, 2, 1.0, 'p2');
    expect(s.stopped).toBe(false); // badSteps=2, patience=2 → not yet
    observe(s, 3, 1.0, 'p3');
    expect(s.stopped).toBe(true); // badSteps=3 > 2
  });

  it('a single improvement resets the patience counter', () => {
    const s = fresh(2);
    observe(s, 0, 1.0, 'p0');
    observe(s, 1, 1.0, 'p1');
    observe(s, 2, 0.5, 'p2'); // improves → badSteps reset to 0
    expect(s.badSteps).toBe(0);
    expect(s.stopped).toBe(false);
    observe(s, 3, 0.5, 'p3');
    observe(s, 4, 0.5, 'p4');
    expect(s.stopped).toBe(false); // badSteps=2, patience=2
    observe(s, 5, 0.5, 'p5');
    expect(s.stopped).toBe(true);
  });

  it('minDelta ignores tiny improvements', () => {
    const s = makeEarlyStopper(2, 0.1);
    observe(s, 0, 1.0, 'p0');
    observe(s, 1, 0.95, 'p1'); // improvement of 0.05, not >= 0.1
    expect(s.bestLoss).toBeCloseTo(1.0, 10); // unchanged
    expect(s.badSteps).toBe(1);
  });

  it('non-finite losses count as a non-improving step (no update to best)', () => {
    const s = fresh(3);
    observe(s, 0, 1.0, 'p0');
    observe(s, 1, Number.NaN, 'p1');
    expect(s.bestLoss).toBeCloseTo(1.0, 10); // unchanged
    expect(s.badSteps).toBe(1);
    expect(s.bestParams).toBe('p0');
  });
});

describe('finalize', () => {
  it('sets stopped=true after a non-improving step exhausts patience', () => {
    const s = fresh(1);
    observe(s, 0, 1.0, 'p0');
    expect(s.stopped).toBe(false);
    // First non-improving step: badSteps becomes 1, still within
    // patience=1 (1 ≤ 1, not strictly greater), so not stopped.
    observe(s, 1, 1.0, 'p1');
    expect(s.stopped).toBe(false);
    // Second non-improving step: badSteps becomes 2 > 1 → stopped.
    observe(s, 2, 1.0, 'p2');
    expect(s.stopped).toBe(true);
  });
});
