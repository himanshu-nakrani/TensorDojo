import { describe, expect, it } from 'vitest';
import { bytesToGB, memoryBreakdown, totalBytes } from './qlora';

describe('memoryBreakdown', () => {
  const cfg = { paramsB: 70, loraRank: 16, seqLen: 2048 };

  it('full FT is dominated by optimizer state', () => {
    const b = memoryBreakdown('full', cfg);
    expect(b.optimizer).toBeGreaterThan(b.base);
    expect(b.optimizer).toBeGreaterThan(b.gradients);
  });

  it('LoRA keeps the same base but tiny grads/optimizer', () => {
    const full = memoryBreakdown('full', cfg);
    const lora = memoryBreakdown('lora', cfg);
    expect(lora.base).toBe(full.base);
    expect(lora.optimizer).toBeLessThan(full.optimizer / 50);
    expect(lora.gradients).toBeLessThan(full.gradients / 50);
  });

  it('QLoRA shrinks the base 4× vs LoRA', () => {
    const lora = memoryBreakdown('lora', cfg);
    const qlora = memoryBreakdown('qlora', cfg);
    expect(qlora.base).toBeCloseTo(lora.base / 4, -1);
    // Adapter cost unchanged.
    expect(qlora.adapter).toBeCloseTo(lora.adapter, -1);
  });

  it('inference removes grads and optimizer state', () => {
    const inf = memoryBreakdown('inference', cfg);
    expect(inf.gradients).toBe(0);
    expect(inf.optimizer).toBe(0);
  });
});

describe('totalBytes / bytesToGB', () => {
  it('70B full FT is hundreds of GB; QLoRA is tens', () => {
    const full = bytesToGB(
      totalBytes(memoryBreakdown('full', { paramsB: 70, loraRank: 16, seqLen: 2048 })),
    );
    const qlora = bytesToGB(
      totalBytes(memoryBreakdown('qlora', { paramsB: 70, loraRank: 16, seqLen: 2048 })),
    );
    expect(full).toBeGreaterThan(500);
    expect(qlora).toBeLessThan(80);
    expect(full / qlora).toBeGreaterThan(8);
  });

  it('7B QLoRA fits on a consumer GPU', () => {
    const qlora = bytesToGB(
      totalBytes(memoryBreakdown('qlora', { paramsB: 7, loraRank: 16, seqLen: 2048 })),
    );
    expect(qlora).toBeLessThan(24);
  });
});
