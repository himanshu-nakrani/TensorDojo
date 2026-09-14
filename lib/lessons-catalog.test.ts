import { describe, expect, it } from 'vitest';
import { TRACKS } from './lessons-meta';
import {
  buildCatalog,
  countVisited,
  formatUnitId,
  trackAnchorId,
} from './lessons-catalog';

describe('formatUnitId', () => {
  it('pads a track number as T01', () => {
    expect(formatUnitId(1)).toBe('T01');
    expect(formatUnitId(4)).toBe('T04');
  });

  it('joins track and lesson as T04·07', () => {
    expect(formatUnitId(4, 7)).toBe('T04·07');
    expect(formatUnitId(1, 1)).toBe('T01·01');
  });
});

describe('trackAnchorId', () => {
  it('matches the hash CurriculumGrid already links to', () => {
    expect(trackAnchorId('transformer-block')).toBe(
      'track-transformer-block',
    );
  });
});

describe('buildCatalog', () => {
  const catalog = buildCatalog();

  it('emits one track per TRACKS entry, in reading order', () => {
    expect(catalog.map((t) => t.id)).toEqual(TRACKS.map((t) => t.id));
  });

  it('numbers the first lesson T01·01', () => {
    const first = catalog[0]?.lessons[0];
    expect(first).toMatchObject({
      slug: 'dot-product',
      unitId: 'T01·01',
    });
  });

  it('numbers lessons inside a track sequentially', () => {
    const track = catalog.find((t) => t.id === 'transformer-block');
    expect(track).toBeDefined();
    const n = track!.trackNumber;
    expect(track!.unitId).toBe(formatUnitId(n));
    expect(track!.lessons[0]?.unitId).toBe(formatUnitId(n, 1));
    expect(track!.lessons.at(-1)?.unitId).toBe(
      formatUnitId(n, track!.lessons.length),
    );
    expect(track!.lessons[0]?.slug).toBe('multi-head-attention');
  });

  it('keeps #track-{id} anchors for in-page jumps', () => {
    for (const track of catalog) {
      expect(track.anchorId).toBe(`track-${track.id}`);
    }
  });

  it('covers every slug in TRACKS, in TRACKS order', () => {
    const catalogSlugs = catalog.flatMap((t) => t.lessons.map((l) => l.slug));
    const trackSlugs = TRACKS.flatMap((t) => [...t.slugs]);
    expect(catalogSlugs).toEqual(trackSlugs);
  });
});

describe('countVisited', () => {
  it('counts only slugs present in the visited set', () => {
    expect(countVisited(['a', 'b', 'c'], new Set(['a', 'c', 'zzz']))).toBe(2);
  });

  it('is zero for an empty visit set', () => {
    expect(countVisited(['a', 'b'], new Set())).toBe(0);
  });
});
