

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'wouter';
import { getVisited, getLastVisited } from '@/lib/progress/visits';
import type { CrossTrackEdge, TrackSection } from '@/lib/content/map-data';

/**
 * The concept map is laid out as a single SVG canvas:
 *
 *   - Each track is a column. Tracks are ordered left-to-right
 *     by reading order, exactly as on the home page.
 *   - Each lesson is a node positioned at (track column, slot
 *     within track). The longest track sets the canvas height.
 *   - In-track arrows are drawn vertically between consecutive
 *     lessons inside the same column.
 *   - Cross-track prerequisite edges (from graph.yaml) are NOT
 *     drawn as arcs — at 8+ tracks and 40+ lessons the arcs
 *     produce unreadable spaghetti. Instead each destination
 *     node carries a small "↗N" badge in its top-right corner;
 *     hovering the badge reveals the prerequisite list.
 *   - Visit state colors the node fill. The "resume" target
 *     (most recently visited) gets an outline ring and a label.
 *
 * Deliberately static layout — no force-directed physics, no
 * zooming, no panning. The grid is what makes the structure
 * scannable. With 8 tracks × 130 px node + 7 × 22 px gap +
 * 2 × 24 px padding, the canvas is 1242 px wide — comfortable
 * inside the 1500 px max-w container.
 */
export function ConceptMapView({ sections }: { sections: TrackSection[] }) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setVisited(new Set(Object.keys(getVisited())));
      setResumeSlug(getLastVisited()?.slug ?? null);
    };
    refresh();
    window.addEventListener('tld-visits-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('tld-visits-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Mobile / narrow viewports: render a stacked list per track.
          The 1242 px design grid is unusable below ~md (768 px) —
          it scales down to ~360 px and the labels become tiny. The
          list view preserves the same information without the
          spatial encoding. */}
      <div className="md:hidden">
        <MapList sections={sections} visited={visited} resumeSlug={resumeSlug} />
      </div>

      <div className="hidden md:block">
        <MapCanvas
          sections={sections}
          visited={visited}
          resumeSlug={resumeSlug}
        />
        <details className="mt-8">
          <summary className="focus-ring cursor-pointer text-[12px] uppercase tracking-[0.12em] text-fg-muted font-mono hover:text-ink transition-colors">
            Show accessible list view
          </summary>
          <div className="mt-4">
            <MapList sections={sections} visited={visited} resumeSlug={resumeSlug} />
          </div>
        </details>
      </div>
      <Legend hasResume={resumeSlug !== null} />
    </div>
  );
}

/**
 * Stacked list view for mobile / narrow viewports. One section per
 * track, lessons rendered as full-width cards with a chevron and
 * cross-track-prereq summary inline.
 */
function MapList({
  sections,
  visited,
  resumeSlug,
}: {
  sections: TrackSection[];
  visited: Set<string>;
  resumeSlug: string | null;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id}>
          <h2 className="text-[12px] uppercase tracking-[0.12em] text-ink font-mono font-semibold mb-1">
            {section.label}
          </h2>
          <div className="text-[11px] text-fg-muted font-mono mb-3">
            {section.lessons.length} lesson
            {section.lessons.length === 1 ? '' : 's'}
          </div>
          <ol className="space-y-2">
            {section.lessons.map((lesson) => {
              const isVisited = visited.has(lesson.slug);
              const isResume = resumeSlug === lesson.slug;
              const prereqCount = lesson.crossTrackPrereqs.length;
              return (
                <li key={lesson.slug}>
                  <Link
                    href={`/lessons/${lesson.slug}`}
                    className={[
                      'block rounded-lg border bg-bg-elevated p-3 transition-colors focus-ring card-surface',
                      // 44px+ min-height for touch comfort
                      'min-h-[64px]',
                      isResume
                        ? 'border-accent ring-2 ring-accent/30'
                        : isVisited
                          ? 'border-accent/40'
                          : 'border-border',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={
                              isVisited
                                ? 'inline-block h-2 w-2 shrink-0 rounded-full bg-accent ring-2 ring-accent/20'
                                : 'inline-block h-2 w-2 shrink-0 rounded-full border border-border-strong'
                            }
                          />
                          <h3 className="text-sm font-semibold text-ink leading-snug">
                            {lesson.title}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[12px] font-mono text-fg-muted">
                          <span>{lesson.minutes} min</span>
                          {prereqCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-accent">
                              ↗ {prereqCount} cross-track prereq
                              {prereqCount === 1 ? '' : 's'}
                            </span>
                          )}
                          {isResume && (
                            <span className="px-1.5 py-0.5 rounded bg-accent text-accent-fg uppercase tracking-[0.12em] text-[11px]">
                              Resume
                            </span>
                          )}
                        </div>
                        {prereqCount > 0 && (
                          <ul className="mt-2 space-y-0.5 text-[12px] text-muted">
                            {lesson.crossTrackPrereqs.map((p) => (
                              <li key={`${p.from}->${p.to}`}>
                                ↗ {p.fromTitle}{' '}
                                <span className="text-fg-subtle">
                                  ({p.fromTrackLabel})
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * Layout constants. The map is responsive via the wrapping
 * SVG with `preserveAspectRatio`; the pixel values below are
 * the *design grid*, not absolute screen positions.
 *
 * At N columns × NODE_W + (N-1) × COL_GAP + 2 × PADDING_X we
 * need to fit inside the 1500 px max-w of the map page. With
 * 8 tracks at NODE_W=150 and COL_GAP=22 the canvas is
 * 8*150 + 7*22 + 48 = 1402 px — within the 1500 px budget. Up to
 * 10 tracks at the same dimensions would be 1496 px, still OK.
 * Past that the page should switch to horizontal scroll, which
 * the wrapper already supports via `overflow-x-auto`.
 */
const NODE_W = 150;
const NODE_H = 104;
const COL_GAP = 22;
const ROW_GAP = 24;
const HEADER_H = 44;
const PADDING_X = 24;
const PADDING_Y = 24;

interface PositionedLesson {
  slug: string;
  title: string;
  minutes: number;
  concepts: string[];
  crossTrackPrereqs: CrossTrackEdge[];
  trackId: string;
  /** Column index in the grid (0-based, left to right). */
  col: number;
  /** Row index within the track column (0-based, top to bottom). */
  row: number;
  /** Center x. */
  cx: number;
  /** Center y. */
  cy: number;
}

function MapCanvas({
  sections,
  visited,
  resumeSlug,
}: {
  sections: TrackSection[];
  visited: Set<string>;
  resumeSlug: string | null;
}) {
  const { positioned, width, height } = useMemo(() => {
    // ⚡ Bolt Optimization: Memoize layout calculations to avoid re-running
    // the nested loops on progress updates (e.g. when `visited` or `resumeSlug` change).
    // 1. Position every lesson in the grid.
    const pos: PositionedLesson[] = [];
    sections.forEach((section, col) => {
      section.lessons.forEach((lesson, row) => {
        const cx = PADDING_X + col * (NODE_W + COL_GAP) + NODE_W / 2;
        const cy = PADDING_Y + HEADER_H + row * (NODE_H + ROW_GAP) + NODE_H / 2;
        const p: PositionedLesson = {
          slug: lesson.slug,
          title: lesson.title,
          minutes: lesson.minutes,
          concepts: lesson.concepts,
          crossTrackPrereqs: lesson.crossTrackPrereqs,
          trackId: section.id,
          col,
          row,
          cx,
          cy,
        };
        pos.push(p);
      });
    });

    // 2. Canvas dimensions. (Cross-track prereqs are rendered as
    // per-node badges on the destination LessonNode rather than as
    // SVG arcs — see the design-doc block at the top of the file.)
    const cols = sections.length;
    const maxRows = Math.max(...sections.map((s) => s.lessons.length));
    const w = PADDING_X * 2 + cols * NODE_W + (cols - 1) * COL_GAP;
    const h =
      PADDING_Y * 2 + HEADER_H + maxRows * NODE_H + (maxRows - 1) * ROW_GAP;

    return { positioned: pos, width: w, height: h };
  }, [sections]);

  return (
    <div className="overflow-x-auto">
      <div
        className="relative mx-auto"
        style={{ width: `${width}px`, maxWidth: '100%' }}
      >
        {/* SVG layer: track-column backdrops, in-track arrows,
            cross-track arcs. Sits behind the HTML lesson nodes
            (which carry interactivity). */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="block w-full h-auto"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrow-in-track"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                className="fill-fg-subtle"
              />
            </marker>
          </defs>

          {/* Track column backdrops. A faint vertical band behind
              each track makes the grouping legible without
              competing with the nodes. */}
          {sections.map((section, col) => {
            const x =
              PADDING_X + col * (NODE_W + COL_GAP) - COL_GAP / 4;
            const w = NODE_W + COL_GAP / 2;
            return (
              <rect
                key={section.id}
                x={x}
                y={PADDING_Y}
                width={w}
                height={height - PADDING_Y * 2}
                rx={12}
                className="fill-bg/50"
              />
            );
          })}

          {/* In-track arrows: vertical line between consecutive
              lessons. */}
          {sections.flatMap((section, col) =>
            section.lessons.slice(0, -1).map((lesson, row) => {
              const x =
                PADDING_X + col * (NODE_W + COL_GAP) + NODE_W / 2;
              const y1 =
                PADDING_Y + HEADER_H + row * (NODE_H + ROW_GAP) + NODE_H;
              const y2 = y1 + ROW_GAP - 4;
              return (
                <line
                  key={`${section.id}-${lesson.slug}-arrow`}
                  x1={x}
                  y1={y1}
                  x2={x}
                  y2={y2}
                  className="stroke-fg-subtle"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow-in-track)"
                />
              );
            }),
          )}

        </svg>

        {/* HTML layer: track headers + lesson nodes, absolutely
            positioned over the SVG. Keeping the nodes as HTML
            (not SVG <foreignObject>) means real focus styles, real
            <Link> behavior, real text wrapping. */}
        <div className="absolute inset-0">
          {sections.map((section, col) => {
            const x = PADDING_X + col * (NODE_W + COL_GAP);
            return (
              <div
                key={section.id}
                className="absolute"
                style={{
                  left: `${x}px`,
                  top: `${PADDING_Y}px`,
                  width: `${NODE_W}px`,
                }}
              >
                <h2 className="text-[12px] uppercase tracking-[0.12em] text-ink font-mono font-semibold leading-snug">
                  {section.label}
                </h2>
                <div className="text-[11px] text-fg-muted font-mono mt-0.5">
                  {section.lessons.length} lesson
                  {section.lessons.length === 1 ? '' : 's'}
                </div>
              </div>
            );
          })}

          {positioned.map((lesson) => {
            const isVisited = visited.has(lesson.slug);
            const isResume = resumeSlug === lesson.slug;
            const left = lesson.cx - NODE_W / 2;
            const top = lesson.cy - NODE_H / 2;
            return (
              <LessonNode
                key={lesson.slug}
                lesson={lesson}
                left={left}
                top={top}
                visited={isVisited}
                resume={isResume}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LessonNode({
  lesson,
  left,
  top,
  visited,
  resume,
}: {
  lesson: PositionedLesson;
  left: number;
  top: number;
  visited: boolean;
  resume: boolean;
}) {
  const prereqCount = lesson.crossTrackPrereqs.length;
  const [prereqOpen, setPrereqOpen] = useState(false);

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!prereqOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPrereqOpen(false);
    };
    const onDoc = () => setPrereqOpen(false);
    window.addEventListener('keydown', onKey);
    // Use a microtask so the click that opened it doesn't immediately close.
    const t = window.setTimeout(() => {
      document.addEventListener('click', onDoc);
    }, 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      document.removeEventListener('click', onDoc);
    };
  }, [prereqOpen]);

  return (
    <div
      className="absolute"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${NODE_W}px`,
        minHeight: `${NODE_H}px`,
      }}
    >
      <Link
        href={`/lessons/${lesson.slug}`}
        aria-label={`Open lesson: ${lesson.title}${
          visited ? ' (visited)' : ''
        }${resume ? ' — resume here' : ''}${
          prereqCount > 0
            ? `. ${prereqCount} cross-track prerequisite${prereqCount === 1 ? '' : 's'}.`
            : ''
        }`}
        data-visited={visited ? 'true' : 'false'}
        data-resume={resume ? 'true' : 'false'}
        className={[
          'focus-ring group absolute inset-0 block rounded-lg border bg-bg-elevated p-2.5 transition-colors card-surface',
          resume
            ? 'border-accent ring-2 ring-accent/30 hover:bg-bg-elevated-hover'
            : visited
              ? 'border-accent/40 hover:border-accent hover:bg-bg-elevated-hover'
              : 'border-border hover:border-accent hover:bg-bg-elevated-hover',
        ].join(' ')}
      >
        {resume && (
          <div
            className="absolute -top-2.5 left-3 text-[11px] uppercase tracking-[0.12em] font-mono px-1.5 py-0.5 rounded bg-accent text-accent-fg"
            aria-hidden="true"
          >
            Resume
          </div>
        )}
        <div className="flex items-start justify-between gap-1.5 h-full">
          <h3 className="text-[0.82rem] font-semibold text-ink leading-snug tracking-[-0.005em]">
            {lesson.title}
          </h3>
          <span
            aria-hidden="true"
            className={
              visited
                ? 'inline-block h-2 w-2 shrink-0 rounded-full bg-accent ring-2 ring-accent/20 mt-1'
                : 'inline-block h-2 w-2 shrink-0 rounded-full border border-border-strong mt-1'
            }
            title={visited ? 'Visited' : 'Not yet visited'}
          />
        </div>
        <div className="absolute bottom-1.5 left-2.5 text-[11px] font-mono text-fg-muted">
          {lesson.minutes} min
        </div>
      </Link>
      {prereqCount > 0 && (
        <div className="absolute bottom-1.5 right-2.5 z-10">
          <button
            type="button"
            aria-expanded={prereqOpen}
            aria-label={`Show ${prereqCount} cross-track prerequisite${
              prereqCount === 1 ? '' : 's'
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPrereqOpen((o) => !o);
            }}
            className="focus-ring inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-accent/40 bg-bg-elevated text-accent text-[11px] font-mono hover:bg-accent-soft transition-colors"
          >
            ↗{prereqCount}
          </button>
          {prereqOpen && (
            <div
              role="dialog"
              aria-label="Cross-track prerequisites"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-2 w-[220px] rounded-md border border-border-strong bg-bg-elevated p-3 shadow-lg text-left"
            >
              <div className="text-[11px] uppercase tracking-[0.12em] font-mono text-dim mb-2">
                Cross-track prereqs
              </div>
              <ul className="space-y-1 text-[12px] text-muted">
                {lesson.crossTrackPrereqs.map((p) => (
                  <li key={`${p.from}->${p.to}`}>
                    ↗ {p.fromTitle}{' '}
                    <span className="text-fg-subtle">
                      ({p.fromTrackLabel})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Legend({ hasResume }: { hasResume: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono text-fg-muted pt-4 border-t border-border">
      <span className="uppercase tracking-[0.12em] text-dim">Legend</span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-accent/20" />
        visited
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full border border-border-strong"
        />
        unvisited
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="22" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="20" y2="3" className="stroke-fg-subtle" strokeWidth="1.5" />
        </svg>
        next in track
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center px-1 rounded border border-accent/40 text-accent text-[11px] font-mono">
          ↗N
        </span>
        N cross-track prerequisites (tap to view)
      </span>
      {hasResume && (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block px-1 py-0.5 rounded bg-accent text-accent-fg uppercase tracking-[0.12em]">
            Resume
          </span>
          where you left off
        </span>
      )}
    </div>
  );
}
