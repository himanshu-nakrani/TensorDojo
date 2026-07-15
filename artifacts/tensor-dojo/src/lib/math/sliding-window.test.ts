import { describe, expect, it } from 'vitest';
import {
  attendedCount,
  effectiveReceptiveField,
  isAttended,
} from './sliding-window';

describe('isAttended', () => {
  it('full causal masks the upper triangle', () => {
    expect(isAttended(3, 5, 'full', 8)).toBe(false);
    expect(isAttended(3, 3, 'full', 8)).toBe(true);
    expect(isAttended(5, 0, 'full', 8)).toBe(true);
  });

  it('sliding window masks beyond w', () => {
    expect(isAttended(10, 0, 'sliding', 4)).toBe(false);
    expect(isAttended(10, 6, 'sliding', 4)).toBe(true);
    expect(isAttended(10, 10, 'sliding', 4)).toBe(true);
    expect(isAttended(10, 11, 'sliding', 4)).toBe(false);
  });
});

describe('attendedCount', () => {
  it('full causal = n(n+1)/2', () => {
    expect(attendedCount(8, 'full', 0)).toBe((8 * 9) / 2);
    expect(attendedCount(100, 'full', 0)).toBe((100 * 101) / 2);
  });

  it('sliding with w >= n-1 matches full causal', () => {
    expect(attendedCount(8, 'sliding', 7)).toBe(attendedCount(8, 'full', 0));
  });

  it('sliding with small w grows linearly in n', () => {
    const a = attendedCount(64, 'sliding', 4);
    const b = attendedCount(128, 'sliding', 4);
    // Doubling n at fixed w should roughly double the count (within
    // the small warm-up region where i < w).
    expect(b / a).toBeGreaterThan(1.8);
    expect(b / a).toBeLessThan(2.2);
  });
});

describe('effectiveReceptiveField', () => {
  it('grows linearly with L', () => {
    expect(effectiveReceptiveField(1, 4, 1000)).toBe(5);
    expect(effectiveReceptiveField(2, 4, 1000)).toBe(9);
    expect(effectiveReceptiveField(8, 4, 1000)).toBe(33);
  });

  it('saturates at n', () => {
    expect(effectiveReceptiveField(100, 4, 10)).toBe(10);
  });
});
