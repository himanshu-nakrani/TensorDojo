import { describe, expect, it } from 'vitest';
import { checkpointStats, sqrtNAnchors } from './checkpoint';

describe('checkpointStats', () => {
  it('baseline (K = N) keeps every activation', () => {
    const s = checkpointStats(24, 24);
    expect(s.anchorMem).toBe(25);
    // No recomputation when every layer is its own anchor.
    expect(s.totalFlops).toBe(s.fwdFlops + 2 * 24);
  });

  it('K = 1 saves only the input — minimum anchors, maximum recompute', () => {
    const s = checkpointStats(24, 1);
    expect(s.chunkMem).toBeGreaterThanOrEqual(24);
    expect(s.totalFlops).toBe(24 + 2 * 24 + 24); // one extra forward pass total
  });

  it('peak memory is U-shaped with anchors; sqrt-N anchors is near minimum', () => {
    const N = 64;
    const sqrtAnchors = sqrtNAnchors(N);
    const sqrtPeak = checkpointStats(N, sqrtAnchors).peakMem;
    // Extremes (1 anchor and N anchors) should both be worse.
    expect(checkpointStats(N, 1).peakMem).toBeGreaterThan(sqrtPeak);
    expect(checkpointStats(N, N).peakMem).toBeGreaterThan(sqrtPeak);
  });

  it('peak memory roughly halves between baseline and sqrt-N anchors at N=64', () => {
    const N = 64;
    const baseline = checkpointStats(N, N).peakMem;
    const sqrt = checkpointStats(N, sqrtNAnchors(N)).peakMem;
    expect(sqrt).toBeLessThan(baseline / 2);
  });

  it('compute overhead is ~33% when checkpointing is on', () => {
    const N = 64;
    const baseline = checkpointStats(N, N).totalFlops;
    const sqrt = checkpointStats(N, sqrtNAnchors(N)).totalFlops;
    const overhead = (sqrt - baseline) / baseline;
    expect(overhead).toBeCloseTo(1 / 3, 1);
  });

  it('zero-layer stack is a degenerate zero', () => {
    const s = checkpointStats(0, 0);
    expect(s.totalFlops).toBe(0);
    expect(s.peakMem).toBe(0);
  });
});

describe('sqrtNAnchors', () => {
  it('returns roughly sqrt(N)', () => {
    expect(sqrtNAnchors(16)).toBe(4);
    expect(sqrtNAnchors(100)).toBe(10);
    expect(sqrtNAnchors(96)).toBe(10);
  });

  it('never returns less than 1', () => {
    expect(sqrtNAnchors(0)).toBe(1);
    expect(sqrtNAnchors(1)).toBe(1);
  });
});
