import { describe, expect, it } from 'vitest';
import {
  expectedAcceptedTokens,
  speculativeSpeedup,
} from './specdecode';

describe('expectedAcceptedTokens', () => {
  it('rejects α outside [0, 1]', () => {
    expect(() => expectedAcceptedTokens(-0.1, 4)).toThrow();
    expect(() => expectedAcceptedTokens(1.1, 4)).toThrow();
  });

  it('rejects non-positive or non-integer γ', () => {
    expect(() => expectedAcceptedTokens(0.5, 0)).toThrow();
    expect(() => expectedAcceptedTokens(0.5, -1)).toThrow();
    expect(() => expectedAcceptedTokens(0.5, 2.5)).toThrow();
  });

  it('α = 1 means every draft accepted (γ+1 tokens)', () => {
    expect(expectedAcceptedTokens(1, 1)).toBe(2);
    expect(expectedAcceptedTokens(1, 4)).toBe(5);
    expect(expectedAcceptedTokens(1, 8)).toBe(9);
  });

  it('α = 0 means every draft rejected (just the target correction)', () => {
    expect(expectedAcceptedTokens(0, 4)).toBe(1);
    expect(expectedAcceptedTokens(0, 8)).toBe(1);
  });

  it('grows monotonically with α (for fixed γ)', () => {
    let prev = 0;
    for (const a of [0, 0.2, 0.5, 0.7, 0.9, 1]) {
      const cur = expectedAcceptedTokens(a, 4);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });

  it('grows monotonically with γ (for fixed α < 1)', () => {
    let prev = 0;
    for (const g of [1, 2, 4, 8, 16]) {
      const cur = expectedAcceptedTokens(0.7, g);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it('asymptotes to 1/(1-α) as γ → ∞ for α < 1', () => {
    const a = 0.7;
    const big = expectedAcceptedTokens(a, 64);
    expect(big).toBeCloseTo(1 / (1 - a), 4);
  });

  it('matches the closed-form sum for a hand-checked case', () => {
    // α=0.5, γ=3: 1 + 0.5 + 0.25 + 0.125 = 1.875
    expect(expectedAcceptedTokens(0.5, 3)).toBeCloseTo(1.875, 9);
  });
});

describe('speculativeSpeedup', () => {
  it('rejects non-positive costs', () => {
    expect(() => speculativeSpeedup(0.7, 4, 0, 100)).toThrow();
    expect(() => speculativeSpeedup(0.7, 4, 1, 0)).toThrow();
  });

  it('α = 0 with free draft never helps (speedup ≤ 1)', () => {
    // Worst case: every draft rejected. We still pay γ draft
    // calls per target step. With draftCost > 0 this is a
    // slowdown; with draftCost = 0 it's exactly 1.
    const s = speculativeSpeedup(0, 4, 1, 100);
    expect(s).toBeLessThan(1);
  });

  it('α = 1 with cheap draft is huge speedup (γ+1×)', () => {
    // Free draft, every draft accepted: speedup → γ+1.
    const s = speculativeSpeedup(1, 4, 0.001, 100);
    expect(s).toBeGreaterThan(4.5);
  });

  it('typical config (α=0.7, γ=4, draft 10× cheaper) yields multi-× speedup', () => {
    // γ=4, α=0.7: expected accepted ≈ (1 - 0.7^5) / 0.3 ≈ 2.83.
    // Costs: 4 * 1 + 10 = 14 units for ~2.83 tokens; vs plain
    // decoding's 10 units for 1 token. Speedup ≈ 2.02.
    const s = speculativeSpeedup(0.7, 4, 1, 10);
    expect(s).toBeGreaterThan(1.5);
    expect(s).toBeLessThan(3);
  });

  it('increasing γ has a sweet spot, not monotonic gains', () => {
    // For α=0.7 and draft = 1, verify = 10:
    //   γ=2: expected ≈ 1+0.7+0.49 = 2.19; cost = 2+10 = 12; speedup ≈ 1.82
    //   γ=4: ≈ 2.83 / 14 * 10 ≈ 2.02
    //   γ=16: ≈ ~3.33 / 26 * 10 ≈ 1.28
    const sShort = speculativeSpeedup(0.7, 2, 1, 10);
    const sMid = speculativeSpeedup(0.7, 4, 1, 10);
    const sLong = speculativeSpeedup(0.7, 16, 1, 10);
    expect(sMid).toBeGreaterThan(sShort);
    expect(sLong).toBeLessThan(sMid);
  });
});
