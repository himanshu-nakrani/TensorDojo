import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'wouter';
import dagre from 'dagre';
import { getVisited, getLastVisited } from '@/lib/progress/visits';
import { useCompletions } from '@/hooks/use-completions';
import { trackColor } from '@/lib/track-color';
import type { CrossTrackEdge, TrackSection } from '@/lib/content/map-data';

/**
 * The concept map is an interactive dependency graph.
 *
 *   - Every lesson is a node. Nodes are laid out by dagre
 *     (layered / Sugiyama DAG layout) so prerequisites sit to the
 *     left of the lessons that depend on them.
 *   - Two edge kinds are drawn as curves:
 *       · in-track "next lesson" edges (neutral, thin)
 *       · cross-track prerequisite edges (colored by the source
 *         track, dashed) — the thing the previous static grid
 *         could only hint at with a "↗N" badge.
 *   - The readability problem at 80 nodes is solved with
 *     focus + context: hovering or focusing a node lights up its
 *     own edges and immediate neighbours and dims everything else,
 *     so the local dependency structure is always legible even
 *     though the whole graph is dense.
 *   - The canvas pans (drag) and zooms (wheel / buttons), and
 *     re-centres on whatever node receives keyboard focus so tab
 *     navigation stays usable.
 *
 * Below `md` the graph is replaced by the stacked list view — a
 * pan/zoom canvas is unusable on a phone — and the list is always
 * available under a disclosure as the accessible fallback.
 */



const NODE_W = 210;
const NODE_H = 78;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.2;

interface GraphNode {
  id: string;
  title: string;
  minutes: number;
  trackId: string;
  trackIdx: number;
  trackLabel: string;
  prereqs: CrossTrackEdge[];
  /** dagre-computed centre. */
  cx: number;
  cy: number;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: 'seq' | 'cross';
  /** track index of the *source* node — used to colour cross edges. */
  trackIdx: number;
  points: Array<{ x: number; y: number }>;
}

interface LaidOutGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  /** id -> set of neighbour ids (both directions). */
  neighbours: Map<string, Set<string>>;
  /** id -> set of incident edge ids. */
  incident: Map<string, Set<string>>;
}

export function layoutGraph(sections: TrackSection[]): LaidOutGraph {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: 'LR',
    ranksep: 96,
    nodesep: 26,
    edgesep: 14,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const slugToTrackIdx = new Map<string, number>();
  const meta = new Map<
    string,
    { title: string; minutes: number; trackId: string; trackIdx: number; trackLabel: string; prereqs: CrossTrackEdge[] }
  >();

  sections.forEach((section, trackIdx) => {
    section.lessons.forEach((lesson) => {
      slugToTrackIdx.set(lesson.slug, trackIdx);
      meta.set(lesson.slug, {
        title: lesson.title,
        minutes: lesson.minutes,
        trackId: section.id,
        trackIdx,
        trackLabel: section.label,
        prereqs: lesson.crossTrackPrereqs,
      });
      g.setNode(lesson.slug, { width: NODE_W, height: NODE_H });
    });
  });

  const edgeDescs: Array<{ id: string; from: string; to: string; kind: 'seq' | 'cross'; trackIdx: number }> = [];

  // In-track sequence edges (strong weight keeps each chain tight).
  sections.forEach((section, trackIdx) => {
    for (let i = 0; i < section.lessons.length - 1; i++) {
      const from = section.lessons[i]!.slug;
      const to = section.lessons[i + 1]!.slug;
      const id = `seq:${from}->${to}`;
      g.setEdge(from, to, { weight: 4, minlen: 1 }, id);
      edgeDescs.push({ id, from, to, kind: 'seq', trackIdx });
    }
  });

  // Cross-track prerequisite edges (source track colours them).
  const seenCross = new Set<string>();
  sections.forEach((section) => {
    section.lessons.forEach((lesson) => {
      for (const p of lesson.crossTrackPrereqs) {
        if (!meta.has(p.from) || !meta.has(p.to)) continue;
        const id = `cross:${p.from}->${p.to}`;
        if (seenCross.has(id)) continue;
        seenCross.add(id);
        g.setEdge(p.from, p.to, { weight: 1, minlen: 1 }, id);
        edgeDescs.push({
          id,
          from: p.from,
          to: p.to,
          kind: 'cross',
          trackIdx: slugToTrackIdx.get(p.from) ?? 0,
        });
      }
    });
  });

  dagre.layout(g);

  const nodes: GraphNode[] = [];
  for (const id of g.nodes()) {
    const n = g.node(id);
    const m = meta.get(id);
    if (!n || !m) continue;
    nodes.push({
      id,
      title: m.title,
      minutes: m.minutes,
      trackId: m.trackId,
      trackIdx: m.trackIdx,
      trackLabel: m.trackLabel,
      prereqs: m.prereqs,
      cx: n.x,
      cy: n.y,
    });
  }

  const edges: GraphEdge[] = [];
  const neighbours = new Map<string, Set<string>>();
  const incident = new Map<string, Set<string>>();
  const addN = (a: string, b: string) => {
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    neighbours.get(a)!.add(b);
  };
  const addI = (node: string, edgeId: string) => {
    if (!incident.has(node)) incident.set(node, new Set());
    incident.get(node)!.add(edgeId);
  };

  for (const d of edgeDescs) {
    const e = g.edge({ v: d.from, w: d.to, name: d.id });
    if (!e || !e.points) continue;
    edges.push({ ...d, points: e.points });
    addN(d.from, d.to);
    addN(d.to, d.from);
    addI(d.from, d.id);
    addI(d.to, d.id);
  }

  const gl = g.graph();
  return {
    nodes,
    edges,
    width: gl.width ?? 0,
    height: gl.height ?? 0,
    neighbours,
    incident,
  };
}

/** Catmull-Rom → cubic bezier so dagre's polyline routing reads as
 *  a smooth curve. */
function edgePath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return '';
  const p = points;
  let d = `M ${p[0]!.x.toFixed(1)} ${p[0]!.y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]!;
    const p1 = p[i]!;
    const p2 = p[i + 1]!;
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface View {
  x: number;
  y: number;
  k: number;
}

export function ConceptMapView({ sections, graph, firstSlug, highlightTrack }: { sections: TrackSection[], graph: LaidOutGraph, firstSlug: string | undefined, highlightTrack?: string | null }) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);
  const { set: completed } = useCompletions();

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
    <div className="space-y-6">
      <div className="md:hidden">
        <MapList sections={sections} visited={visited} completed={completed} resumeSlug={resumeSlug} filterTrack={highlightTrack} />
      </div>

      <div className="hidden md:block">
        <MapGraph sections={sections} visited={visited} completed={completed} resumeSlug={resumeSlug} graph={graph} firstSlug={firstSlug} highlightTrack={highlightTrack} />
        <details className="mt-6">
          <summary className="focus-ring cursor-pointer text-[12px] uppercase tracking-[0.12em] text-fg-muted font-mono hover:text-ink transition-colors">
            Show accessible list view
          </summary>
          <div className="mt-4">
            <MapList sections={sections} visited={visited} completed={completed} resumeSlug={resumeSlug} filterTrack={highlightTrack} />
          </div>
        </details>
      </div>

      <Legend sections={sections} hasResume={resumeSlug !== null} hasProgress={completed.size > 0} />
    </div>
  );
}

function hlIdxProbe(highlightTrack?: string | null, sections: TrackSection[] = []) {
  return highlightTrack ? sections.findIndex((sec) => sec.id === highlightTrack) : -1;
}

function MapGraph({
  sections,
  visited,
  completed,
  resumeSlug,
  graph,
  firstSlug,
  highlightTrack,
}: {
  sections: TrackSection[];
  visited: Set<string>;
  completed: Set<string>;
  resumeSlug: string | null;
  graph: LaidOutGraph;
  firstSlug: string | undefined;
  highlightTrack?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [active, setActive] = useState<string | null>(null);
  const fittedRef = useRef(false);

  // Track container size.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!size.w || !size.h || !graph.width || !graph.height) return;
    const pad = 32;
    const k = clamp(
      Math.min((size.w - pad * 2) / graph.width, (size.h - pad * 2) / graph.height),
      MIN_ZOOM,
      1.1,
    );
    setView({
      k,
      x: (size.w - graph.width * k) / 2,
      y: (size.h - graph.height * k) / 2,
    });
  }, [size.w, size.h, graph.width, graph.height]);

  // Open on the reading-order entry lesson at a readable zoom (the
  // whole 80-node graph fit to the viewport is too small to read).
  // The ⤢ control drops back to the full overview.
  const initialView = useCallback(() => {
    if (!size.w || !size.h || !graph.nodes.length) return;
    const entry = graph.nodes.find((n) => n.id === firstSlug) ?? graph.nodes[0]!;
    const k = 0.82;
    setView({ k, x: size.w * 0.3 - entry.cx * k, y: size.h / 2 - entry.cy * k });
  }, [size.w, size.h, graph.nodes, firstSlug]);

  // Set the initial view once, when we first have a size.
  useEffect(() => {
    if (fittedRef.current) return;
    if (size.w && size.h && graph.nodes.length) {
      initialView();
      fittedRef.current = true;
    }
  }, [size.w, size.h, graph.nodes.length, initialView]);

  // Wheel zoom-to-cursor (non-passive so we can preventDefault).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const factor = Math.exp(-e.deltaY * 0.0016);
        const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
        const scale = k / v.k;
        return { k, x: mx - (mx - v.x) * scale, y: my - (my - v.y) * scale };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Drag to pan. `moved` suppresses the click-through navigation on nodes.
  const drag = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number; moved: boolean }>(
    { active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false },
  );

  // Two-pointer pinch zoom (trackpads / tablets): the second pointer
  // switches the gesture from pan to scale-about-midpoint.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{
    dist: number;
    k: number;
    mx: number;
    my: number;
    vx: number;
    vy: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only pan with the primary button and never when starting on a link/button.
    if (e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      pinch.current = {
        dist: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1,
        k: view.k,
        mx: (p1.x + p2.x) / 2 - rect.left,
        my: (p1.y + p2.y) / 2 - rect.top,
        vx: view.x,
        vy: view.y,
      };
      drag.current.active = false;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      const pin = pinch.current;
      const k = clamp((pin.k * dist) / pin.dist, MIN_ZOOM, MAX_ZOOM);
      const scale = k / pin.k;
      setView({
        k,
        x: pin.mx - (pin.mx - pin.vx) * scale,
        y: pin.my - (pin.my - pin.vy) * scale,
      });
      return;
    }
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
    if (d.moved) setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    // Keep `moved` true through the click that immediately follows, then reset.
    if (drag.current.moved) window.setTimeout(() => (drag.current.moved = false), 0);
    drag.current.active = false;
  };

  const zoomBy = (factor: number) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
      const scale = k / v.k;
      const cx = size.w / 2;
      const cy = size.h / 2;
      return { k, x: cx - (cx - v.x) * scale, y: cy - (cy - v.y) * scale };
    });
  };

  // Canvas-level keyboard: arrows pan, +/− zoom about the centre,
  // 0 drops back to the fitted overview.
  const onCanvasKey = (e: React.KeyboardEvent) => {
    const step = 80;
    switch (e.key) {
      case '+':
      case '=':
        zoomBy(1.25);
        break;
      case '-':
      case '_':
        zoomBy(0.8);
        break;
      case '0':
        fit();
        break;
      case 'ArrowLeft':
        setView((v) => ({ ...v, x: v.x + step }));
        break;
      case 'ArrowRight':
        setView((v) => ({ ...v, x: v.x - step }));
        break;
      case 'ArrowUp':
        setView((v) => ({ ...v, y: v.y + step }));
        break;
      case 'ArrowDown':
        setView((v) => ({ ...v, y: v.y - step }));
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button, summary')) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const k = clamp(v.k * 1.6, MIN_ZOOM, MAX_ZOOM);
      const scale = k / v.k;
      return { k, x: mx - (mx - v.x) * scale, y: my - (my - v.y) * scale };
    });
  };

  // Selecting a track chip flies the camera to that track's bounding
  // box; returning to "All tracks" refits the whole graph.
  const prevHl = useRef(hlIdxProbe(highlightTrack, sections));
  useEffect(() => {
    const next = hlIdxProbe(highlightTrack, sections);
    if (!size.w || !size.h) {
      prevHl.current = next;
      return;
    }
    if (next >= 0) {
      const ns = graph.nodes.filter((n) => n.trackIdx === next);
      if (ns.length) {
        const pad = 56;
        const minX = Math.min(...ns.map((n) => n.cx)) - NODE_W / 2;
        const maxX = Math.max(...ns.map((n) => n.cx)) + NODE_W / 2;
        const minY = Math.min(...ns.map((n) => n.cy)) - NODE_H / 2;
        const maxY = Math.max(...ns.map((n) => n.cy)) + NODE_H / 2;
        const bw = maxX - minX;
        const bh = maxY - minY;
        const k = clamp(
          Math.min((size.w - pad * 2) / bw, (size.h - pad * 2) / bh),
          MIN_ZOOM,
          1.15,
        );
        setView({
          k,
          x: size.w / 2 - (minX + bw / 2) * k,
          y: size.h / 2 - (minY + bh / 2) * k,
        });
      }
    } else if (prevHl.current >= 0) {
      fit();
    }
    prevHl.current = next;
  }, [highlightTrack, sections, graph.nodes, size.w, size.h, fit]);

  // Re-centre on a node (keyboard focus, so tab navigation stays visible).
  const centerOn = useCallback(
    (node: GraphNode) => {
      setView((v) => ({ ...v, x: size.w / 2 - node.cx * v.k, y: size.h / 2 - node.cy * v.k }));
    },
    [size.w, size.h],
  );

  const activeSet = useMemo(() => {
    if (!active) return null;
    const s = new Set<string>([active]);
    for (const n of graph.neighbours.get(active) ?? []) s.add(n);
    return s;
  }, [active, graph.neighbours]);

  // Track filter (chips above the canvas): everything outside the
  // selected track dims the same way hover-tracing dims it.
  const hlIdx = highlightTrack
    ? sections.findIndex((sec) => sec.id === highlightTrack)
    : -1;

  const activeEdges = active ? graph.incident.get(active) ?? new Set<string>() : null;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-label="Concept map canvas. Arrow keys pan, plus and minus zoom, 0 fits the whole graph."
        className="focus-ring relative h-[72vh] min-h-[520px] max-h-[820px] overflow-hidden rounded-lg border border-border bg-bg cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onCanvasKey}
        style={{ touchAction: 'none' }}
      >
        {/* World: a single transformed layer holding the edge SVG and
            the HTML node cards, so they scale and pan together. */}
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: `${graph.width}px`,
            height: `${graph.height}px`,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          }}
        >
          <svg
            width={graph.width}
            height={graph.height}
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            className="absolute left-0 top-0 overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <marker id="cg-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {graph.edges.map((edge) => {
              const isActive = activeEdges?.has(edge.id) ?? false;
              const dim = (activeSet !== null && !isActive) || (hlIdx >= 0 && edge.trackIdx !== hlIdx);
              // Sequence edges between two completed lessons light up
              // as the reader's travelled path through the graph.
              const travelled =
                edge.kind === 'seq' &&
                completed.has(edge.from) &&
                completed.has(edge.to);
              const color = travelled
                ? 'rgb(var(--accent-2))'
                : edge.kind === 'cross'
                  ? trackColor(edge.trackIdx)
                  : 'rgb(var(--border-strong))';
              const baseOpacity = travelled ? 0.9 : edge.kind === 'cross' ? 0.5 : 0.55;
              return (
                <path
                  key={edge.id}
                  d={edgePath(edge.points)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 2.4 : travelled ? 1.8 : 1.4}
                  strokeDasharray={edge.kind === 'cross' ? '5 5' : undefined}
                  strokeLinecap="round"
                  markerEnd="url(#cg-arrow)"
                  style={{
                    color,
                    opacity: dim ? 0.07 : isActive ? 1 : baseOpacity,
                    transition: 'opacity 120ms, stroke-width 120ms',
                  }}
                />
              );
            })}
          </svg>

          <div className="absolute left-0 top-0" style={{ width: `${graph.width}px`, height: `${graph.height}px` }}>
            {graph.nodes.map((node) => (
              <GraphNodeCard
                key={node.id}
                node={node}
                visited={visited.has(node.id)}
                completed={completed.has(node.id)}
                resume={resumeSlug === node.id}
                dim={(activeSet !== null && !activeSet.has(node.id)) || (hlIdx >= 0 && node.trackIdx !== hlIdx)}
                highlighted={active === node.id}
                onActivate={() => setActive(node.id)}
                onDeactivate={() => setActive((cur) => (cur === node.id ? null : cur))}
                onFocusNode={() => {
                  setActive(node.id);
                  centerOn(node);
                }}
                suppressNav={() => drag.current.moved}
              />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <ControlButton label="Zoom in" onClick={() => zoomBy(1.25)}>+</ControlButton>
          <ControlButton label="Zoom out" onClick={() => zoomBy(0.8)}>−</ControlButton>
          <ControlButton label="Fit to view" onClick={fit}>⤢</ControlButton>
          <span
            aria-hidden="true"
            className="mt-0.5 text-center text-[10px] font-mono tabular-nums text-fg-subtle"
          >
            {Math.round(view.k * 100)}%
          </span>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] font-mono text-fg-subtle">
          drag / pinch to pan + zoom · double-click to zoom in · hover a
          node to trace its links · canvas focused: arrows pan, + − zoom, 0 fits
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elevated text-[15px] leading-none text-fg-muted shadow-sm hover:border-accent-2 hover:text-ink transition-colors card-surface"
    >
      {children}
    </button>
  );
}

function GraphNodeCard({
  node,
  visited,
  completed,
  resume,
  dim,
  highlighted,
  onActivate,
  onDeactivate,
  onFocusNode,
  suppressNav,
}: {
  node: GraphNode;
  visited: boolean;
  completed: boolean;
  resume: boolean;
  dim: boolean;
  highlighted: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onFocusNode: () => void;
  suppressNav: () => boolean;
}) {
  const prereqCount = node.prereqs.length;
  const color = trackColor(node.trackIdx);
  return (
    <div
      className="absolute"
      style={{
        left: `${node.cx - NODE_W / 2}px`,
        top: `${node.cy - NODE_H / 2}px`,
        width: `${NODE_W}px`,
        height: `${NODE_H}px`,
        opacity: dim ? 0.32 : 1,
        transition: 'opacity 120ms',
        zIndex: highlighted ? 20 : 1,
      }}
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
    >
      <Link
        href={`/lessons/${node.id}`}
        onClick={(e) => {
          if (suppressNav()) e.preventDefault();
        }}
        onFocus={onFocusNode}
        onBlur={onDeactivate}
        data-visited={visited ? 'true' : 'false'}
        data-resume={resume ? 'true' : 'false'}
        className={[
          'focus-ring group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-lg border bg-bg-elevated pl-3 pr-2.5 py-2 transition-shadow card-surface',
          resume
            ? 'border-accent-2 ring-2 ring-accent-2/30'
            : highlighted
              ? 'border-accent-2 shadow-md'
              : visited
                ? 'border-accent-2/40'
                : 'border-border',
        ].join(' ')}
      >
        {/* Track colour rail */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg"
          style={{ backgroundColor: color }}
        />
        {resume && (
          <span
            className="absolute -top-2 right-2 rounded bg-accent-2 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.1em] text-accent-2-fg"
            aria-hidden="true"
          >
            Resume
          </span>
        )}
        <div className="flex items-start gap-1.5">
          <h3
            className="text-[0.8rem] font-semibold leading-[1.2] tracking-[-0.005em] text-ink"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {node.title}
          </h3>
        </div>
        <span className="sr-only">
          {completed ? 'Complete. ' : visited ? 'Visited. ' : ''}
          {resume ? 'Resume here. ' : ''}
          Track: {node.trackLabel}.
        </span>
        <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            {completed ? (
              <span
                aria-hidden="true"
                className="inline-flex h-[13px] w-[13px] items-center justify-center rounded-full bg-accent-2 text-[8px] font-bold text-accent-2-fg"
              >
                ✓
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={
                  visited
                    ? 'inline-block h-1.5 w-1.5 rounded-full bg-accent-2 ring-2 ring-accent-2/20'
                    : 'inline-block h-1.5 w-1.5 rounded-full border border-border-strong'
                }
              />
            )}
            <span aria-hidden="true">{node.minutes} min</span>
            <span className="sr-only">{node.minutes} minutes</span>
          </span>
          {prereqCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded px-1 text-[10px]"
              style={{ color }}
              title={`${prereqCount} cross-track prerequisite${prereqCount === 1 ? '' : 's'}`}
            >
              <span aria-hidden="true">↗ {prereqCount}</span>
              <span className="sr-only">
                {prereqCount} cross-track prerequisite{prereqCount === 1 ? '' : 's'}.
              </span>
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

/**
 * Stacked list view for mobile / narrow viewports and the accessible
 * fallback. One section per track; lessons as full-width cards with
 * their cross-track prerequisites listed inline.
 */
function MapList({
  sections,
  visited,
  completed,
  resumeSlug,
  filterTrack,
}: {
  sections: TrackSection[];
  visited: Set<string>;
  completed: Set<string>;
  resumeSlug: string | null;
  /** When set (track chips), only that track's section is listed. */
  filterTrack?: string | null;
}) {
  const shown = filterTrack
    ? sections.filter((sec) => sec.id === filterTrack)
    : sections;
  return (
    <div className="space-y-6">
      {shown.map((section) => (
        <section key={section.id}>
          <h2 className="mb-1 flex items-center gap-2 text-[12px] font-mono font-semibold uppercase tracking-[0.12em] text-ink">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              // Index into the FULL track list so colors stay stable
              // when the chips filter the list down to one track.
              style={{ backgroundColor: trackColor(sections.indexOf(section)) }}
            />
            {section.label}
          </h2>
          <div className="mb-3 text-[11px] font-mono text-fg-muted">
            {section.lessons.length} lesson{section.lessons.length === 1 ? '' : 's'}
            {completed.size > 0 &&
              ` · ${section.lessons.filter((l) => completed.has(l.slug)).length}/${section.lessons.length} complete`}
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
                      'block min-h-[64px] rounded-lg border bg-bg-elevated p-3 transition-colors focus-ring card-surface',
                      isResume
                        ? 'border-accent-2 ring-2 ring-accent-2/30'
                        : isVisited
                          ? 'border-accent-2/40'
                          : 'border-border',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {completed.has(lesson.slug) ? (
                            <span
                              aria-hidden="true"
                              className="inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-accent-2 text-[9px] font-bold text-accent-2-fg"
                            >
                              ✓
                            </span>
                          ) : (
                            <span
                              aria-hidden="true"
                              className={
                                isVisited
                                  ? 'inline-block h-2 w-2 shrink-0 rounded-full bg-accent-2 ring-2 ring-accent-2/20'
                                  : 'inline-block h-2 w-2 shrink-0 rounded-full border border-border-strong'
                              }
                            />
                          )}
                          <h3 className="text-sm font-semibold leading-snug text-ink">
                            {lesson.title}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[12px] font-mono text-fg-muted">
                          <span>{lesson.minutes} min</span>
                          {prereqCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-accent-2">
                              ↗ {prereqCount} cross-track prereq{prereqCount === 1 ? '' : 's'}
                            </span>
                          )}
                          {isResume && (
                            <span className="rounded bg-accent-2 px-1.5 py-0.5 text-[11px] uppercase tracking-[0.12em] text-accent-2-fg">
                              Resume
                            </span>
                          )}
                        </div>
                        {prereqCount > 0 && (
                          <ul className="mt-2 space-y-0.5 text-[12px] text-muted">
                            {lesson.crossTrackPrereqs.map((p) => (
                              <li key={`${p.from}->${p.to}`}>
                                ↗ {p.fromTitle}{' '}
                                <span className="text-fg-subtle">({p.fromTrackLabel})</span>
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

function Legend({
  sections,
  hasResume,
  hasProgress,
}: {
  sections: TrackSection[];
  hasResume: boolean;
  hasProgress: boolean;
}) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono text-fg-muted">
        <span className="uppercase tracking-[0.12em] text-dim">Legend</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-accent-2 ring-2 ring-accent-2/20" />
          visited
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full border border-border-strong" />
          unvisited
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent-2 text-[8px] font-bold text-accent-2-fg">✓</span>
          complete
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="26" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="24" y2="4" className="stroke-fg-subtle" strokeWidth="1.6" />
          </svg>
          next in track
        </span>
        {hasProgress && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="26" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="24" y2="4" stroke="rgb(var(--accent-2))" strokeWidth="2" />
            </svg>
            your completed path
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <svg width="26" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="24" y2="4" stroke="currentColor" className="text-fg-subtle" strokeWidth="1.6" strokeDasharray="4 4" />
          </svg>
          cross-track prerequisite
        </span>
        {hasResume && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block rounded bg-accent-2 px-1 py-0.5 uppercase tracking-[0.12em] text-accent-2-fg">
              Resume
            </span>
            where you left off
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono text-fg-muted">
        <span className="uppercase tracking-[0.12em] text-dim">Tracks</span>
        {sections.map((section, i) => (
          <span key={section.id} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: trackColor(i) }}
            />
            {section.label}
          </span>
        ))}
      </div>
    </div>
  );
}
