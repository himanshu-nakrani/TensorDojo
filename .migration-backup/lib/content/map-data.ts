/**
 * Build the data the /map page renders. Pure functions over the
 * `ConceptGraph` and the `TRACKS` reading order, so the page can be
 * server-rendered (SSG) and the client only needs to layer visit
 * state on top.
 *
 * Two derived maps are exported:
 *
 *   `buildTrackSections(graph)` — a vertical stack of track sections,
 *   each with a label and a list of lesson entries. Each lesson
 *   entry carries:
 *     - the concepts taught in that lesson (from the
 *       atomic-concept → lesson-concept edges in the graph)
 *     - the cross-track prerequisite lessons (from the
 *       atomic-concept chains that span track boundaries)
 *
 *   `findCrossTrackEdges(graph)` — flat list of {from, to, fromTitle,
 *   toTitle} for everything that crosses a track boundary. Useful for
 *   tooling and tests; the section-level `crossTrackPrereqs` field
 *   is what the page actually renders.
 *
 * The cross-track inference works by walking the graph one edge at
 * a time. For every edge (A → B):
 *   - look up the lesson that teaches concept A (if any)
 *   - look up the lesson that teaches concept B (if any)
 *   - if both have a lesson and the lessons are in different tracks,
 *     record A's lesson → B's lesson as a cross-track edge.
 *
 * The lesson-for-concept mapping is the inverse of the
 * atomic-concept → lesson-concept edges in the graph: for each
 * `lesson-concept` node, the concepts that flow into it (via the
 * `to: <id>-concept` edges) are the concepts taught by that lesson.
 */

import { TRACKS, type LessonTrack } from '@/lib/lessons-meta';
import type { ConceptGraph, ConceptNode } from './schemas';

export interface CrossTrackEdge {
  /** Prerequisite lesson slug. */
  from: string;
  /** Dependent lesson slug. */
  to: string;
  fromTitle: string;
  toTitle: string;
  fromTrackLabel: string;
}

export interface TrackLessonEntry {
  slug: string;
  title: string;
  minutes: number;
  /** Atomic concepts taught in this lesson. */
  concepts: string[];
  /** Cross-track prerequisite lessons feeding into this one. */
  crossTrackPrereqs: CrossTrackEdge[];
}

export interface TrackSection {
  id: string;
  label: string;
  lessons: TrackLessonEntry[];
}

/**
 * Index of concept id -> lesson slug (where this concept is taught).
 * A concept with no associated lesson is absent from the map.
 */
function buildConceptToLesson(graph: ConceptGraph): Map<string, string> {
  const byId = new Map<string, ConceptNode>(graph.nodes.map((n) => [n.id, n]));
  const lessonConcepts = graph.nodes.filter((n): n is ConceptNode & { lesson: string } =>
    Boolean(n.lesson),
  );
  // For each lesson concept, the incoming edges (atomic → lesson-concept)
  // are the concepts that feed into it. Those atomics are taught by
  // this lesson.
  //
  // "Set if not present": when an atomic flows into multiple
  // lesson-concepts (e.g. `softmax → softmax-concept` and
  // `softmax → sampling-decoding-concept`), we want the *first*
  // lesson-concept in YAML order to win, not the last. The first
  // is the canonical teaching site; the others are downstream
  // consumers of the concept. Without this guard, `softmax` would
  // map to `sampling-decoding` and produce false cross-track edges
  // pointing back at lessons that should be downstream.
  //
  // We also self-map every lesson-concept to its own lesson slug,
  // so that edges whose `to` is a lesson-concept (e.g.
  // `causal-mask → transformer-block` — where `transformer-block`
  // is a lesson-concept with `lesson: transformer-block`) resolve
  // to the right destination lesson in the cross-track pass.
  const atomicToLesson = new Map<string, string>();
  for (const lc of lessonConcepts) {
    atomicToLesson.set(lc.id, lc.lesson);
    const incoming = graph.edges.filter((e) => e.to === lc.id);
    for (const e of incoming) {
      const src = byId.get(e.from);
      if (!src) continue;
      if (src.lesson) continue; // don't map lesson -> lesson
      if (atomicToLesson.has(e.from)) continue; // first one wins
      atomicToLesson.set(e.from, lc.lesson!);
    }
  }
  return atomicToLesson;
}

/**
 * Walk every (from, to) edge. For each, look up the lesson that
 * teaches `from` and the lesson that teaches `to`. If both are
 * lessons and in different tracks, record the cross-track edge.
 */
export function findCrossTrackEdges(
  graph: ConceptGraph,
): CrossTrackEdge[] {
  const byId = new Map<string, ConceptNode>(graph.nodes.map((n) => [n.id, n]));
  const conceptToLesson = buildConceptToLesson(graph);
  const lessonTrack = new Map<string, string>();
  for (const t of TRACKS) {
    for (const slug of t.slugs) lessonTrack.set(slug, t.id);
  }
  const lessonTitle = new Map<string, string>();
  for (const lc of graph.nodes) {
    if (lc.lesson) lessonTitle.set(lc.lesson, lc.title);
  }
  const trackLabel = new Map<string, string>(
    TRACKS.map((t) => [t.id, t.label]),
  );

  const seen = new Set<string>();
  const out: CrossTrackEdge[] = [];
  // Build a slug -> reading-order-index map so we can drop edges
  // that point "backwards" relative to the canonical sequence.
  // The graph data has a few inverted edges (e.g. cross-entropy →
  // softmax) that would otherwise produce confusing "prerequisite"
  // annotations on the map. The reading order is the source of
  // truth for what comes first; the graph is descriptive metadata.
  const orderIndex = new Map<string, number>();
  let i = 0;
  for (const t of TRACKS) for (const s of t.slugs) orderIndex.set(s, i++);
  for (const e of graph.edges) {
    const fromLesson = conceptToLesson.get(e.from);
    const toLesson = conceptToLesson.get(e.to);
    if (!fromLesson || !toLesson) continue;
    if (fromLesson === toLesson) continue;
    const fromTrack = lessonTrack.get(fromLesson);
    const toTrack = lessonTrack.get(toLesson);
    if (!fromTrack || !toTrack) continue;
    if (fromTrack === toTrack) continue;
    // Drop edges that point against reading order.
    const fi = orderIndex.get(fromLesson);
    const ti = orderIndex.get(toLesson);
    if (fi === undefined || ti === undefined) continue;
    if (fi >= ti) continue;
    const key = `${fromLesson}->${toLesson}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      from: fromLesson,
      to: toLesson,
      fromTitle: lessonTitle.get(fromLesson) ?? fromLesson,
      toTitle: lessonTitle.get(toLesson) ?? toLesson,
      fromTrackLabel: trackLabel.get(fromTrack) ?? fromTrack,
    });
  }
  return out;
}

/**
 * Inverse of `buildConceptToLesson`: lesson slug -> atomic concept
 * ids taught in that lesson.
 */
function buildLessonToConcepts(
  conceptToLesson: Map<string, string>,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [concept, lesson] of conceptToLesson) {
    const arr = out.get(lesson) ?? [];
    arr.push(concept);
    out.set(lesson, arr);
  }
  // Sort for stable rendering.
  for (const [k, v] of out) out.set(k, v.sort());
  return out;
}

/**
 * Build the vertical-stack track sections. Each lesson entry
 * carries the concepts it teaches and the cross-track prerequisites
 * that feed into it. The page renders this directly.
 *
 * `lessonMeta` is a `Record<slug, {title, minutes}>`. The page
 * passes it in (built from `listLessonMeta`) so this function stays
 * a pure data transform.
 */
export function buildTrackSections(
  graph: ConceptGraph,
  lessonMeta: Record<string, { title: string; minutes: number }>,
): TrackSection[] {
  const conceptToLesson = buildConceptToLesson(graph);
  const lessonToConcepts = buildLessonToConcepts(conceptToLesson);
  const crossEdges = findCrossTrackEdges(graph);
  // Group cross-track edges by destination lesson.
  const crossByLesson = new Map<string, CrossTrackEdge[]>();
  for (const e of crossEdges) {
    const arr = crossByLesson.get(e.to) ?? [];
    arr.push(e);
    crossByLesson.set(e.to, arr);
  }

  const sections: TrackSection[] = [];
  for (const track of TRACKS) {
    const lessons: TrackLessonEntry[] = track.slugs.map((slug) => {
      const meta = lessonMeta[slug];
      return {
        slug,
        title: meta?.title ?? slug,
        minutes: meta?.minutes ?? 0,
        concepts: lessonToConcepts.get(slug) ?? [],
        crossTrackPrereqs: crossByLesson.get(slug) ?? [],
      };
    });
    sections.push({
      id: track.id,
      label: track.label,
      lessons,
    });
  }
  return sections;
}

/**
 * Look up a lesson's title by slug from the track sections. The
 * Resume CTA uses this to format the button label.
 */
export function findLessonTitle(
  sections: TrackSection[],
  slug: string,
): string | null {
  for (const s of sections) {
    for (const l of s.lessons) {
      if (l.slug === slug) return l.title;
    }
  }
  return null;
}

/**
 * The slug of the first lesson in the reading order. Used as the
 * default "Start:" target when the reader has no visit history.
 */
export function firstLessonSlug(): string {
  return TRACKS[0]!.slugs[0]!;
}
