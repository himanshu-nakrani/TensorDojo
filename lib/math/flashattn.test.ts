import { describe, expect, it } from 'vitest';
import {
  SRAM_BUDGET_BYTES,
  attentionMemoryFlash,
  attentionMemoryNaive,
  speedupRatio,
} from './flashattn';

describe('attentionMemoryNaive', () => {
  it('rejects non-positive inputs', () => {
    expect(() => attentionMemoryNaive(0, 128)).toThrow();
    expect(() => attentionMemoryNaive(128, 0)).toThrow();
  });

  it('hbmTotal = hbmReads + hbmWrites', () => {
    const s = attentionMemoryNaive(512, 128);
    expect(s.hbmTotal).toBe(s.hbmReads + s.hbmWrites);
  });

  it('score-matrix term dominates at long context', () => {
    const s = attentionMemoryNaive(8192, 128);
    // 8192² * 2 bytes = 128 MB; inputs are 3 * 8192 * 128 * 2 = 6 MB.
    expect(s.hbmTotal).toBeGreaterThan(100 * 1024 * 1024);
  });

  it('peak SRAM = score-matrix bytes (does not fit at long context)', () => {
    const s = attentionMemoryNaive(2048, 128);
    expect(s.sramPeak).toBe(2048 * 2048 * 2);
    expect(s.fitsInSram).toBe(false);
  });

  it('short sequences fit in SRAM (sanity)', () => {
    // 128² * 2 bytes = 32 KB, comfortably under 100 KB.
    const s = attentionMemoryNaive(128, 128);
    expect(s.fitsInSram).toBe(true);
  });
});

describe('attentionMemoryFlash', () => {
  it('rejects non-positive inputs', () => {
    expect(() => attentionMemoryFlash(0, 128)).toThrow();
    expect(() => attentionMemoryFlash(128, 0, 64)).toThrow();
    expect(() => attentionMemoryFlash(128, 128, 0)).toThrow();
  });

  it('hbmTotal = hbmReads + hbmWrites', () => {
    const s = attentionMemoryFlash(512, 128, 64);
    expect(s.hbmTotal).toBe(s.hbmReads + s.hbmWrites);
  });

  it('peak SRAM stays within the 100 KB budget at B=64, d=128', () => {
    const s = attentionMemoryFlash(8192, 128, 64);
    expect(s.sramPeak).toBeLessThanOrEqual(SRAM_BUDGET_BYTES);
    expect(s.fitsInSram).toBe(true);
  });

  it('larger blockSize increases peak SRAM usage', () => {
    const sSmall = attentionMemoryFlash(4096, 128, 32);
    const sLarge = attentionMemoryFlash(4096, 128, 128);
    expect(sLarge.sramPeak).toBeGreaterThan(sSmall.sramPeak);
  });

  it('B=64 d=128 fits SRAM; B=256 d=128 does not (the block-size ceiling)', () => {
    expect(attentionMemoryFlash(4096, 128, 64).fitsInSram).toBe(true);
    expect(attentionMemoryFlash(4096, 128, 256).fitsInSram).toBe(false);
  });

  it('writes are just the output (n·d bytes)', () => {
    const s = attentionMemoryFlash(2048, 128, 64);
    expect(s.hbmWrites).toBe(2048 * 128 * 2);
  });
});

describe('speedupRatio', () => {
  it('returns ratio > 1 for long contexts (flash strictly better)', () => {
    for (const n of [1024, 2048, 4096, 8192]) {
      expect(speedupRatio(n, 128, 64)).toBeGreaterThan(1);
    }
  });

  it('speedup grows with sequence length', () => {
    const r1 = speedupRatio(1024, 128, 64);
    const r2 = speedupRatio(8192, 128, 64);
    expect(r2).toBeGreaterThan(r1);
  });

  it('at typical config (n=4096, d=128, B=64) speedup is multiple-fold', () => {
    const r = speedupRatio(4096, 128, 64);
    expect(r).toBeGreaterThan(2);
  });
});
