import { describe, expect, it } from 'vitest';
import { cacheBytes } from './kvcache';
import {
  cacheBytesPerToken,
  cacheBytesTotal,
  expandKvForGroup,
  kvHeadFor,
  validateGroupConfig,
} from './gqa';

describe('cacheBytesPerToken', () => {
  it('rejects non-positive inputs', () => {
    expect(() => cacheBytesPerToken(0, 8, 2)).toThrow();
    expect(() => cacheBytesPerToken(128, 0, 2)).toThrow();
    expect(() => cacheBytesPerToken(128, 8, 0)).toThrow();
  });

  it('matches the obvious formula 2·d·nKv·b', () => {
    expect(cacheBytesPerToken(128, 8, 2)).toBe(2 * 128 * 8 * 2);
  });

  it('shrinks linearly with nKvHeads', () => {
    const mha = cacheBytesPerToken(128, 32, 2);
    const gqa4 = cacheBytesPerToken(128, 8, 2); // group factor 4
    const mqa = cacheBytesPerToken(128, 1, 2);
    expect(gqa4 * 4).toBe(mha);
    expect(mqa * 32).toBe(mha);
  });
});

describe('cacheBytesTotal', () => {
  it('agrees with the kv-cache lesson for MHA (nKvHeads == nQueryHeads)', () => {
    // The kv-cache lesson's cacheBytes formula is 2·n·d_model·L·b,
    // where d_model = dHead · nQueryHeads. For MHA every query
    // head has its own KV head, so nKvHeads = nQueryHeads.
    const seqLen = 2048;
    const dHead = 128;
    const nHeads = 32;
    const nLayers = 32;
    const b = 2;
    const dModel = dHead * nHeads;

    const fromKvCache = cacheBytes(seqLen, dModel, nLayers, b);
    const fromGqa = cacheBytesTotal(seqLen, dHead, nHeads, nLayers, b);
    expect(fromGqa).toBe(fromKvCache);
  });

  it('shrinks by exactly the group factor when KV heads shrink', () => {
    const args = [2048, 128, 32, 2] as const; // seqLen, dHead, nLayers, b
    const mha = cacheBytesTotal(args[0], args[1], 32, args[2], args[3]);
    const gqa8 = cacheBytesTotal(args[0], args[1], 4, args[2], args[3]); // 32 / 4 = group 8
    expect(gqa8 * 8).toBe(mha);
  });

  it('seqLen=0 means no cache yet', () => {
    expect(cacheBytesTotal(0, 128, 8, 32, 2)).toBe(0);
  });
});

describe('validateGroupConfig', () => {
  it('accepts legal configs', () => {
    expect(() => validateGroupConfig(8, 8)).not.toThrow();
    expect(() => validateGroupConfig(8, 4)).not.toThrow();
    expect(() => validateGroupConfig(8, 2)).not.toThrow();
    expect(() => validateGroupConfig(8, 1)).not.toThrow();
    expect(() => validateGroupConfig(32, 8)).not.toThrow();
  });

  it('rejects indivisible configs', () => {
    expect(() => validateGroupConfig(8, 3)).toThrow();
    expect(() => validateGroupConfig(5, 2)).toThrow();
  });

  it('rejects non-positive or non-integer heads', () => {
    expect(() => validateGroupConfig(0, 1)).toThrow();
    expect(() => validateGroupConfig(8, 0)).toThrow();
    expect(() => validateGroupConfig(-4, 2)).toThrow();
    expect(() => validateGroupConfig(8.5, 4)).toThrow();
  });
});

describe('kvHeadFor', () => {
  it('groups query heads into contiguous blocks (GQA-4 over 8 heads)', () => {
    // 8 query heads, 2 KV heads → group size 4 → heads 0..3 → KV 0,
    // heads 4..7 → KV 1.
    const expected = [0, 0, 0, 0, 1, 1, 1, 1];
    for (let q = 0; q < 8; q++) {
      expect(kvHeadFor(q, 8, 2)).toBe(expected[q]!);
    }
  });

  it('MQA collapses everything to KV head 0', () => {
    for (let q = 0; q < 8; q++) {
      expect(kvHeadFor(q, 8, 1)).toBe(0);
    }
  });

  it('MHA is the identity map', () => {
    for (let q = 0; q < 8; q++) {
      expect(kvHeadFor(q, 8, 8)).toBe(q);
    }
  });

  it('throws on out-of-range query index', () => {
    expect(() => kvHeadFor(8, 8, 2)).toThrow();
    expect(() => kvHeadFor(-1, 8, 2)).toThrow();
  });
});

describe('expandKvForGroup', () => {
  it('repeats each row group-size times in order', () => {
    const kv = [
      [1, 2],
      [3, 4],
    ];
    const out = expandKvForGroup(kv, 8, 2); // group size 4
    expect(out).toHaveLength(8);
    expect(out.slice(0, 4)).toEqual([
      [1, 2],
      [1, 2],
      [1, 2],
      [1, 2],
    ]);
    expect(out.slice(4)).toEqual([
      [3, 4],
      [3, 4],
      [3, 4],
      [3, 4],
    ]);
  });

  it('returns fresh row arrays (not aliases)', () => {
    const kv = [[1, 2]];
    const out = expandKvForGroup(kv, 4, 1);
    out[0]![0] = 999;
    expect(kv[0]![0]).toBe(1);
    expect(out[1]![0]).toBe(1);
  });

  it('rejects mismatched input shape', () => {
    expect(() => expandKvForGroup([[1, 2]], 8, 2)).toThrow();
  });

  it('MHA is the identity (returns a copy of the input)', () => {
    const kv = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];
    const out = expandKvForGroup(kv, 4, 4);
    expect(out).toEqual(kv);
  });
});
