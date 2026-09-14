/**
 * Catalog view-model for the /lessons index.
 *
 * Turns TRACKS + lesson meta into numbered unit ids (T04·07),
 * stable #track-{id} anchors, and visit counts. The page component
 * is presentational; numbering and grouping live here so they can
 * be tested without rendering.
 */
import { listLessonMeta, TRACKS } from './lessons-meta';

export function formatUnitId(trackNumber: number, lessonNumber?: number): string {
  const track = `T${String(trackNumber).padStart(2, '0')}`;
  if (lessonNumber == null) return track;
  return `${track}·${String(lessonNumber).padStart(2, '0')}`;
}

export function trackAnchorId(trackId: string): string {
  return `track-${trackId}`;
}

export interface CatalogLesson {
  slug: string;
  title: string;
  minutes: number;
  lessonNumber: number;
  unitId: string;
}

export interface CatalogTrack {
  id: string;
  label: string;
  trackNumber: number;
  unitId: string;
  anchorId: string;
  lessons: CatalogLesson[];
}

export function buildCatalog(): CatalogTrack[] {
  const bySlug = new Map(
    listLessonMeta().map((entry) => [entry.meta.slug, entry.meta]),
  );
  return TRACKS.map((track, t) => {
    const trackNumber = t + 1;
    return {
      id: track.id,
      label: track.label,
      trackNumber,
      unitId: formatUnitId(trackNumber),
      anchorId: trackAnchorId(track.id),
      lessons: track.slugs.flatMap((slug, i) => {
        const meta = bySlug.get(slug);
        if (!meta) return [];
        const lessonNumber = i + 1;
        return [
          {
            slug: meta.slug,
            title: meta.title,
            minutes: meta.minutes,
            lessonNumber,
            unitId: formatUnitId(trackNumber, lessonNumber),
          },
        ];
      }),
    };
  });
}

export function countVisited(
  slugs: readonly string[],
  visited: ReadonlySet<string>,
): number {
  let n = 0;
  for (const slug of slugs) {
    if (visited.has(slug)) n += 1;
  }
  return n;
}
