import { describe, expect, it } from 'vitest';
import {
  activationVariancePerLayer,
  stdForScheme,
} from './weight-init';

describe('stdForScheme', () => {
  it('Kaiming uses sqrt(2/d)', () => {
    expect(stdForScheme('kaiming', 256)).toBeCloseTo(Math.sqrt(2 / 256), 6);
  });
  it('Xavier uses sqrt(1/d)', () => {
    expect(stdForScheme('xavier', 256)).toBeCloseTo(Math.sqrt(1 / 256), 6);
  });
  it('small/large are constants', () => {
    expect(stdForScheme('small', 999)).toBe(0.01);
    expect(stdForScheme('large', 999)).toBe(0.5);
  });
});

describe('activationVariancePerLayer', () => {
  it('Kaiming keeps variance roughly bounded after 12 layers', () => {
    const v = activationVariancePerLayer({
      scheme: 'kaiming',
      d: 256,
      depth: 12,
      seed: 42,
    });
    expect(v).toHaveLength(13);
    const last = v[v.length - 1] as number;
    // With Kaiming on ReLU at d=256, depth=12, variance should stay
    // O(1) — well within [1e-2, 1e2].
    expect(last).toBeGreaterThan(0.01);
    expect(last).toBeLessThan(100);
  });

  it('Small init collapses variance through depth', () => {
    const v = activationVariancePerLayer({
      scheme: 'small',
      d: 256,
      depth: 12,
      seed: 42,
    });
    const last = v[v.length - 1] as number;
    // Variance should be effectively zero — many orders of magnitude
    // below 1.
    expect(last).toBeLessThan(1e-10);
  });

  it('Large init explodes (or saturates) variance through depth', () => {
    const v = activationVariancePerLayer({
      scheme: 'large',
      d: 64,
      depth: 8,
      seed: 1,
    });
    const last = v[v.length - 1] as number;
    expect(last).toBeGreaterThan(100);
  });

  it('is deterministic given the seed', () => {
    const a = activationVariancePerLayer({
      scheme: 'kaiming',
      d: 128,
      depth: 6,
      seed: 7,
    });
    const b = activationVariancePerLayer({
      scheme: 'kaiming',
      d: 128,
      depth: 6,
      seed: 7,
    });
    expect(a).toEqual(b);
  });
});
