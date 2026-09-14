import { describe, expect, it } from 'vitest';
import { applyRope, dot, ropeAngle, rotatePair } from './rope';

const EPS = 1e-9;

function magnitude(v: readonly number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

describe('rotatePair', () => {
  it('rotates by 0 = identity', () => {
    const [x, y] = rotatePair([1, 0], 0);
    expect(x).toBeCloseTo(1, 12);
    expect(y).toBeCloseTo(0, 12);
  });

  it('rotates [1, 0] by π/2 to [0, 1]', () => {
    const [x, y] = rotatePair([1, 0], Math.PI / 2);
    expect(x).toBeCloseTo(0, 12);
    expect(y).toBeCloseTo(1, 12);
  });

  it('preserves magnitude for arbitrary angles', () => {
    const v: [number, number] = [3, 4];
    for (const t of [0.1, 1, 2.5, -1.3, 100]) {
      const r = rotatePair(v, t);
      expect(Math.hypot(r[0], r[1])).toBeCloseTo(5, 12);
    }
  });
});

describe('applyRope', () => {
  it('throws on odd-length vector', () => {
    expect(() => applyRope([1, 2, 3], 0)).toThrow();
  });

  it('identity at pos=0', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8];
    const r = applyRope(v, 0);
    for (let i = 0; i < v.length; i++) {
      expect(r[i]!).toBeCloseTo(v[i]!, 12);
    }
  });

  it('preserves magnitude', () => {
    const v = [0.3, -1.1, 0.7, 2.0, -0.5, 0.9, 1.4, -0.2];
    const m0 = magnitude(v);
    for (const pos of [1, 7, 50, 1000]) {
      const r = applyRope(v, pos);
      expect(magnitude(r)).toBeCloseTo(m0, 9);
    }
  });
});

describe('relative-position property', () => {
  // The defining property of RoPE: the dot product of two rotated
  // vectors depends only on the difference of their positions.
  // I.e. applyRope(q, m) · applyRope(k, n) is a function of m - n
  // alone (for fixed q and k).
  it('rope(q, m) · rope(k, n) is constant when m - n is constant', () => {
    const q = [1.0, 0.5, -0.3, 0.8, 0.2, -0.6, 0.9, 0.1];
    const k = [0.4, -0.2, 0.7, -0.5, 0.3, 0.1, -0.8, 0.6];
    const offset = 5;
    const refs = [
      [0, -offset],
      [5, 0],
      [10, 5],
      [37, 32],
      [-3, -8],
    ] as const;
    const dots = refs.map(([m, n]) => dot(applyRope(q, m), applyRope(k, n)));
    for (let i = 1; i < dots.length; i++) {
      expect(dots[i]!).toBeCloseTo(dots[0]!, 9);
    }
  });

  it('depends smoothly on m - n (continuous in offset)', () => {
    const q = [0.7, -0.1, 0.4, 0.6];
    const k = [0.3, 0.8, -0.2, 0.5];
    const samples: number[] = [];
    for (let off = 0; off <= 5; off++) {
      samples.push(dot(applyRope(q, off), applyRope(k, 0)));
    }
    // Successive samples should differ by less than the sup norm
    // of q and k (smoothness sanity, not a numerical claim about
    // the derivative).
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i]! - samples[i - 1]!)).toBeLessThan(2);
    }
  });

  it('matches the unrotated dot product at m = n', () => {
    const q = [1, 2, 3, 4];
    const k = [-1, 0.5, 2, -3];
    const baseDot = dot(q, k);
    for (const pos of [0, 1, 5, 100]) {
      const d = dot(applyRope(q, pos), applyRope(k, pos));
      expect(d).toBeCloseTo(baseDot, 9);
    }
  });
});

describe('ropeAngle', () => {
  it('returns 0 at pos=0', () => {
    for (let k = 0; k < 4; k++) {
      expect(ropeAngle(0, k, 8)).toBe(0);
    }
  });

  it('pair-0 has wavelength 2π (one full turn per position-step of 2π)', () => {
    // Pair k=0 angle is pos · base^0 = pos. So one position step
    // rotates pair 0 by one radian; 2π position steps complete one
    // turn. Verify the value at pos=1, k=0 is exactly 1.
    expect(ropeAngle(1, 0, 16)).toBe(1);
  });

  it('high-index pairs rotate much more slowly than low-index pairs', () => {
    const aLow = ropeAngle(1, 0, 16);
    const aHigh = ropeAngle(1, 7, 16);
    expect(aLow).toBeGreaterThan(aHigh * 1000);
  });

  it('agrees with what applyRope actually rotates by', () => {
    // Take the pair-0 slice of an axis-aligned unit pair, rotate it
    // via applyRope, and check the angle from atan2 matches
    // ropeAngle(pos, 0, d).
    const d = 8;
    const pos = 3;
    const v = [1, 0, 0, 0, 0, 0, 0, 0]; // pair 0 is the unit x; others zero
    const r = applyRope(v, pos);
    const measured = Math.atan2(r[1]!, r[0]!);
    const expected = ropeAngle(pos, 0, d);
    expect(measured).toBeCloseTo(expected % (2 * Math.PI), 9);
  });
});

describe('dot', () => {
  it('throws on length mismatch', () => {
    expect(() => dot([1, 2], [3, 4, 5])).toThrow();
  });

  it('matches the obvious sum', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(4 + 10 + 18);
  });
});
