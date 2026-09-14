import { describe, it, expect } from 'vitest';
import { applyFreezeMask, freezeParamCount } from './freeze-mask';
import { N_HID, N_IN, N_OUT, N_PARAMS } from './training';

const L1 = N_HID * N_IN + N_HID;
const L2 = N_HID * N_HID + N_HID;
const L3 = N_OUT * N_HID + N_OUT;

describe('applyFreezeMask', () => {
  const ones: number[] = Array(N_PARAMS).fill(1);

  it('no-freeze returns a copy with all entries unchanged', () => {
    const out = applyFreezeMask(ones, { layer1: false, layer2: false, layer3: false });
    expect(out).toEqual(ones);
    expect(out).not.toBe(ones); // it's a copy
  });

  it('freezing layer 1 zeros only the first L1 entries', () => {
    const out = applyFreezeMask(ones, { layer1: true, layer2: false, layer3: false });
    for (let i = 0; i < L1; i += 1) expect(out[i]).toBe(0);
    for (let i = L1; i < N_PARAMS; i += 1) expect(out[i]).toBe(1);
  });

  it('freezing layer 2 zeros only the middle L2 entries', () => {
    const out = applyFreezeMask(ones, { layer1: false, layer2: true, layer3: false });
    for (let i = 0; i < L1; i += 1) expect(out[i]).toBe(1);
    for (let i = L1; i < L1 + L2; i += 1) expect(out[i]).toBe(0);
    for (let i = L1 + L2; i < N_PARAMS; i += 1) expect(out[i]).toBe(1);
  });

  it('freezing layer 3 zeros only the last L3 entries', () => {
    const out = applyFreezeMask(ones, { layer1: false, layer2: false, layer3: true });
    for (let i = 0; i < L1 + L2; i += 1) expect(out[i]).toBe(1);
    for (let i = L1 + L2; i < N_PARAMS; i += 1) expect(out[i]).toBe(0);
  });

  it('freezing all three zeros the whole gradient', () => {
    const out = applyFreezeMask(ones, { layer1: true, layer2: true, layer3: true });
    for (const v of out) expect(v).toBe(0);
  });

  it('throws on length mismatch', () => {
    expect(() =>
      applyFreezeMask([1, 2], { layer1: false, layer2: false, layer3: false }),
    ).toThrow();
  });
});

describe('freezeParamCount', () => {
  it('counts the right number of trainable params per config', () => {
    expect(freezeParamCount({ layer1: false, layer2: false, layer3: false })).toBe(N_PARAMS);
    expect(freezeParamCount({ layer1: true, layer2: true, layer3: true })).toBe(0);
    expect(freezeParamCount({ layer1: true, layer2: false, layer3: false })).toBe(L2 + L3);
    expect(freezeParamCount({ layer1: true, layer2: true, layer3: false })).toBe(L3);
    expect(freezeParamCount({ layer1: false, layer2: true, layer3: false })).toBe(L1 + L3);
  });
});
