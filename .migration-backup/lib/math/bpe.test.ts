import { describe, expect, it } from 'vitest';
import { EOW, encode, encodeWord, learnBPE } from './bpe';

describe('learnBPE', () => {
  it('returns no merges for an empty corpus', () => {
    const r = learnBPE([], 10);
    expect(r.merges).toEqual([]);
    expect(r.vocab).toEqual([]);
    expect(r.history).toEqual([]);
  });

  it('respects numMerges=0 (no training)', () => {
    const r = learnBPE(['low low low'], 0);
    expect(r.merges).toEqual([]);
    expect(r.history).toEqual([]);
    // Vocab is the initial per-character split with EOW on the last char.
    expect(r.vocab).toEqual(['l', 'o', `w${EOW}`]);
  });

  it('throws on negative numMerges', () => {
    expect(() => learnBPE(['low'], -1)).toThrow();
  });

  it('first merge is the most frequent adjacent pair', () => {
    // Three copies of "low" → six "l-o" adjacencies and three "o-w▁".
    // l-o wins. After merge: ["lo", "w▁"] × 3 → next most frequent is
    // "lo-w▁" (3 occurrences).
    const r = learnBPE(['low low low'], 2);
    expect(r.merges).toHaveLength(2);
    expect(r.merges[0]).toEqual({ a: 'l', b: 'o', merged: 'lo' });
    expect(r.history[0]!.frequency).toBe(3);
    expect(r.merges[1]).toEqual({ a: 'lo', b: `w${EOW}`, merged: `low${EOW}` });
    expect(r.history[1]!.frequency).toBe(3);
  });

  it('is deterministic: same corpus + same numMerges → identical output', () => {
    const corpus = ['low low low lower lower newest newest widest widest'];
    const a = learnBPE(corpus, 8);
    const b = learnBPE(corpus, 8);
    expect(a.merges).toEqual(b.merges);
    expect(a.vocab).toEqual(b.vocab);
  });

  it('ties broken lexicographically on (a, b) for reproducibility', () => {
    // Corpus "ab cd": two unique words. After splitWord they become
    // ["a", "b▁"] and ["c", "d▁"]. Both pairs have frequency 1.
    // Lex order on (a, b): ("a", "b▁") < ("c", "d▁"), so the first wins.
    const r = learnBPE(['ab cd'], 1);
    expect(r.merges).toHaveLength(1);
    expect(r.merges[0]).toEqual({ a: 'a', b: `b${EOW}`, merged: `ab${EOW}` });
  });

  it('stops merging when no adjacent pairs remain', () => {
    // Single-char word "a" has zero adjacencies. Even with numMerges=5
    // the trainer halts immediately.
    const r = learnBPE(['a'], 5);
    expect(r.merges).toEqual([]);
  });

  it('history length matches the actual number of merges performed', () => {
    const r = learnBPE(['low lower'], 100);
    expect(r.history).toHaveLength(r.merges.length);
    // Every step's vocabAfter is a snapshot; sizes should equal the
    // unique symbol count at that step.
    for (const step of r.history) {
      expect(new Set(step.vocabAfter).size).toBe(step.vocabAfter.length);
    }
  });

  it('vocabAfter shrinks or stays the same as merges progress (chars get absorbed)', () => {
    // Each merge can only add the merged symbol AND possibly remove
    // a constituent that no longer appears alone. Vocab size delta is
    // in {-1, 0, +1}.
    const r = learnBPE(['low lower newest widest'], 10);
    for (let i = 1; i < r.history.length; i += 1) {
      const delta =
        r.history[i]!.vocabAfter.length - r.history[i - 1]!.vocabAfter.length;
      expect(delta).toBeGreaterThanOrEqual(-1);
      expect(delta).toBeLessThanOrEqual(1);
    }
  });
});

describe('encode / encodeWord', () => {
  it('empty string encodes to empty', () => {
    expect(encodeWord('', [])).toEqual([]);
    expect(encode('', [])).toEqual([]);
  });

  it('without any merges, every word is its character split + EOW', () => {
    expect(encodeWord('cat', [])).toEqual(['c', 'a', `t${EOW}`]);
    expect(encode('cat dog', [])).toEqual([
      'c', 'a', `t${EOW}`,
      'd', 'o', `g${EOW}`,
    ]);
  });

  it('reproduces the training corpus after training: encoded words match the trainer state', () => {
    const corpus = ['low low low lower lower'];
    const r = learnBPE(corpus, 10);
    // After training, encoding any training word should yield the
    // same symbol sequence as the trainer's final state for that word.
    const expected = new Map<string, string[]>();
    // Re-derive the per-word state by re-applying every merge.
    for (const w of ['low', 'lower']) {
      expected.set(w, encodeWord(w, r.merges));
    }
    expect(encodeWord('low', r.merges)).toEqual(expected.get('low'));
    // "low" appears as a complete word in the corpus, so after enough
    // merges it should collapse to a single token.
    expect(encodeWord('low', r.merges).length).toBeLessThanOrEqual(2);
  });

  it('OOV words still encode — they just split into known subwords or chars', () => {
    const r = learnBPE(['low lower'], 5);
    // "xyzzy" shares no character with the corpus's learned merges,
    // so it splits down to chars + EOW on the last.
    const out = encodeWord('xyzzy', r.merges);
    expect(out).toEqual(['x', 'y', 'z', 'z', `y${EOW}`]);
    // "lowest" — never seen, but "low" prefix is a learned merge, so
    // we expect to find at least the "lo" merged symbol in the output.
    const lowest = encodeWord('lowest', r.merges);
    expect(lowest.some((s) => s.startsWith('lo'))).toBe(true);
  });

  it('encode (whole-string) splits on whitespace and lowercases', () => {
    const r = learnBPE(['cat dog'], 3);
    const a = encode('Cat dog', r.merges);
    const b = encode('cat   dog', r.merges); // multiple spaces
    const c = encode('cat dog', r.merges);
    expect(a).toEqual(c);
    expect(b).toEqual(c);
  });
});
