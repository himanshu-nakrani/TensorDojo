import { describe, it, expect } from 'vitest';
import { augmentDataset, jitter2D, makeRng, rotate2D } from './augmentation';

describe('makeRng (mulberry32)', () => {
  it('is deterministic given the seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 20; i += 1) expect(a()).toBe(b());
  });
  it('produces different streams for different seeds', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    let differs = 0;
    for (let i = 0; i < 20; i += 1) if (a() !== b()) differs += 1;
    expect(differs).toBeGreaterThan(15);
  });
});

describe('rotate2D', () => {
  it('a 90° rotation takes (1, 0) to (0, 1) within fp tolerance', () => {
    const [x, y] = rotate2D([1, 0], Math.PI / 2);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(1, 10);
  });
  it('a 180° rotation takes (1, 0) to (-1, 0)', () => {
    const [x, y] = rotate2D([1, 0], Math.PI);
    expect(x).toBeCloseTo(-1, 10);
    expect(y).toBeCloseTo(0, 10);
  });
  it('a 360° rotation is the identity', () => {
    const [x, y] = rotate2D([0.7, -0.3], 2 * Math.PI);
    expect(x).toBeCloseTo(0.7, 9);
    expect(y).toBeCloseTo(-0.3, 9);
  });
});

describe('jitter2D', () => {
  it('sigma=0 returns the original point (modulo Box-Muller of zero)', () => {
    // With sigma=0 the additive term is 0, so the point is unchanged.
    const rng = makeRng(0);
    const [x, y] = jitter2D([0.5, -0.3], 0, rng);
    expect(x).toBeCloseTo(0.5, 10);
    expect(y).toBeCloseTo(-0.3, 10);
  });
  it('non-zero sigma: noise is bounded, finite, mean near 0 over many samples', () => {
    const rng = makeRng(0);
    const N = 2000;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < N; i += 1) {
      const [x, y] = jitter2D([0, 0], 0.1, rng);
      sx += x;
      sy += y;
    }
    const mx = sx / N;
    const my = sy / N;
    expect(Math.abs(mx)).toBeLessThan(0.02);
    expect(Math.abs(my)).toBeLessThan(0.02);
  });
});

describe('augmentDataset', () => {
  interface Pt {
    x: readonly number[];
    label: number;
  }
  it('k=0 returns a copy with no augmentation', () => {
    const data: Pt[] = [
      { x: [0.5, -0.3], label: 0 },
      { x: [-0.2, 0.8], label: 1 },
    ];
    const out = augmentDataset(data, 0, 42);
    expect(out.length).toBe(2);
    expect(out[0]).toEqual(data[0]);
  });

  it('k>0 produces k*N synthetic copies appended to the original N', () => {
    const data: Pt[] = [
      { x: [0.5, -0.3], label: 0 },
      { x: [-0.2, 0.8], label: 1 },
    ];
    const k = 3;
    const out = augmentDataset(data, k, 42);
    expect(out.length).toBe(data.length * (1 + k));
  });

  it('preserves the label on the original N (they are the first N entries)', () => {
    const data: Pt[] = [
      { x: [0.5, -0.3], label: 0 },
      { x: [-0.2, 0.8], label: 1 },
      { x: [0.1, 0.2], label: 2 },
    ];
    const out = augmentDataset(data, 2, 42);
    for (let i = 0; i < data.length; i += 1) {
      expect(out[i]!.label).toBe(data[i]!.label);
    }
  });

  it('synthetic examples carry the same label (rotation is class-preserving)', () => {
    const data: Pt[] = [
      { x: [1.2, 0.3], label: 0 },
      { x: [-0.8, 0.4], label: 1 },
    ];
    const k = 4;
    const out = augmentDataset(data, k, 0);
    // The implementation groups all `k` copies of data[i]
    // contiguously after the originals. So for each original
    // example, the next k entries should all share its label.
    for (let i = 0; i < data.length; i += 1) {
      for (let j = 0; j < k; j += 1) {
        const idx = data.length + i * k + j;
        expect(out[idx]!.label).toBe(data[i]!.label);
      }
    }
  });

  it('is deterministic given the seed', () => {
    const data: Pt[] = [
      { x: [0.5, -0.3], label: 0 },
      { x: [-0.2, 0.8], label: 1 },
    ];
    const a = augmentDataset(data, 2, 42);
    const b = augmentDataset(data, 2, 42);
    for (let i = 0; i < a.length; i += 1) {
      expect(a[i]!.x).toEqual(b[i]!.x);
    }
  });
});
