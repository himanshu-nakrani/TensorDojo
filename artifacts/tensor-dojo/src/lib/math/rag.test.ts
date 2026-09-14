import { describe, expect, it } from 'vitest';
import { CORPUS, QUERIES, cosineSim, rankDocs, topK } from './rag';

describe('cosineSim', () => {
  it('equals 1 for identical vectors', () => {
    expect(cosineSim([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });

  it('equals 0 for orthogonal vectors', () => {
    expect(cosineSim([1, 0], [0, 1])).toBe(0);
  });

  it('rejects length mismatch', () => {
    expect(() => cosineSim([1, 0], [1, 0, 0])).toThrow(/length mismatch/);
  });
});

describe('rankDocs', () => {
  it('returns one entry per doc, sorted descending', () => {
    const query = QUERIES.find((q) => q.id === 'pw')!.embedding;
    const ranked = rankDocs(query, CORPUS);
    expect(ranked).toHaveLength(CORPUS.length);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i]!.score).toBeLessThanOrEqual(ranked[i - 1]!.score);
    }
  });

  it('places auth-reset at the top for the password query', () => {
    const query = QUERIES.find((q) => q.id === 'pw')!.embedding;
    const ranked = rankDocs(query, CORPUS);
    expect(ranked[0]!.doc.id).toBe('auth-reset');
  });

  it('places api-rate at the top for the rate-limit query', () => {
    const query = QUERIES.find((q) => q.id === 'rate')!.embedding;
    const ranked = rankDocs(query, CORPUS);
    expect(ranked[0]!.doc.id).toBe('api-rate');
  });

  it('all scores for the weather query are low', () => {
    const query = QUERIES.find((q) => q.id === 'weather')!.embedding;
    const ranked = rankDocs(query, CORPUS);
    expect(ranked[0]!.score).toBeLessThan(0.5);
  });
});

describe('topK', () => {
  it('returns at most k entries', () => {
    const query = QUERIES[0]!.embedding;
    const ranked = rankDocs(query, CORPUS);
    expect(topK(ranked, 3)).toHaveLength(3);
    expect(topK(ranked, 100)).toHaveLength(CORPUS.length);
    expect(topK(ranked, 0)).toHaveLength(0);
  });
});
