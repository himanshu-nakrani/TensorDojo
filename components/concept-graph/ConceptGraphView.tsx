'use client';

import { Fragment, useMemo } from 'react';
import dagre from 'dagre';
import Link from 'next/link';
import type { ConceptGraph, ConceptNode } from '@/lib/content/schemas';

type PositionedNode = ConceptNode & {
  x: number;
  y: number;
  trackId: string;
};

const NODE_W = 200;
const NODE_H = 60;
const TRACK_LABEL_H = 28;
const TRACK_GAP = 56;
const TRACK_HORIZONTAL_PAD = 32;

/**
 * Render the concept graph as an SVG. Nodes are grouped by track
 * (the same groups the home page uses) and each track is laid out
 * left-to-right with dagre. Tracks are stacked vertically; cross-
 * track edges are drawn faintly so the reader can see what feeds
 * what without the layout becoming illegible.
 *
 * Click a node with a `lesson` to navigate to that lesson.
 */
export function ConceptGraphView({ graph }: { graph: ConceptGraph }) {
  const positioned = useMemo(() => layoutByTrack(graph), [graph]);

  if (positioned.nodes.length === 0) {
    return (
      <p className="text-muted font-mono text-sm">
        No concepts yet. Add some to <code>content/concepts/graph.yaml</code>.
      </p>
    );
  }

  const { minX, minY, width, height } = positioned;

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Concept graph"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280" />
        </marker>
        <marker
          id="arrow-faint"
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={5}
          markerHeight={5}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3A424B" />
        </marker>
      </defs>

      {/* Track labels (left of each track row) */}
      {positioned.tracks.map((track) => (
        <g key={track.id}>
          <text
            x={minX + 8}
            y={track.y + TRACK_LABEL_H - 8}
            className="fill-dim font-mono"
            fontSize={11}
          >
            {track.label}
          </text>
        </g>
      ))}

      {/* Edges — within-track drawn solid, cross-track drawn faint dashed */}
      {graph.edges.map((e, i) => {
        const from = positioned.nodes.find((n) => n.id === e.from);
        const to = positioned.nodes.find((n) => n.id === e.to);
        if (!from || !to) return null;
        const crossTrack = from.trackId !== to.trackId;
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        // For cross-track edges, route them as a smooth bezier
        // that exits the right side of the source track and
        // enters the left side of the target track.
        if (crossTrack) {
          const midX = (x1 + x2) / 2;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="#2A323B"
              strokeWidth={0.8}
              strokeDasharray="3 3"
              markerEnd="url(#arrow-faint)"
              opacity={0.5}
            />
          );
        }
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#2A323B"
            strokeWidth={1}
            markerEnd="url(#arrow)"
          />
        );
      })}

      {/* Nodes */}
      {positioned.nodes.map((n) => {
        const isLesson = !!n.lesson;
        const nodeContent = (
          <g transform={`translate(${n.x}, ${n.y})`}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill="#14181D"
              stroke={isLesson ? '#1F242A' : '#1A1F25'}
              strokeWidth={1}
            />
            <text
              x={NODE_W / 2}
              y={isLesson ? 24 : 36}
              textAnchor="middle"
              className="fill-ink font-mono"
              fontSize={11}
              style={{ fontSize: 11 }}
            >
              {n.title.length > 28 ? n.title.slice(0, 26) + '…' : n.title}
            </text>
            {isLesson && (
              <text
                x={NODE_W / 2}
                y={46}
                textAnchor="middle"
                className="fill-dim font-mono"
                fontSize={9}
                style={{ fontSize: 9 }}
              >
                lesson
              </text>
            )}
          </g>
        );
        if (!isLesson) return <Fragment key={n.id}>{nodeContent}</Fragment>;
        return (
          <Link key={n.id} href={`/lessons/${n.lesson}`}>
            {nodeContent}
          </Link>
        );
      })}
    </svg>
  );
}

interface TrackLayout {
  id: string;
  label: string;
  y: number;
}

interface LayoutResult {
  nodes: PositionedNode[];
  tracks: TrackLayout[];
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/**
 * Per-track LR layout. Each track gets its own dagre sub-layout;
 * tracks are stacked vertically with a fixed gap. Cross-track
 * edges are preserved in the returned nodes (with their trackId)
 * but the SVG renders them separately.
 *
 * Edges whose endpoints are both in the same track bucket are
 * passed to dagre so it can build the LR ranks. Edges that cross
 * tracks are deferred to the SVG (drawn as faint bezier curves).
 */
function layoutByTrack(graph: ConceptGraph): LayoutResult {
  // Bucket nodes by track id. Nodes not in any track bucket go
  // into a "misc" track rendered at the bottom.
  const trackBuckets = new Map<string, ConceptNode[]>();
  trackBuckets.set('misc', []);
  for (const t of TRACK_DEFS) trackBuckets.set(t.id, []);
  for (const node of graph.nodes) {
    const id = nodeTrackId(node.id) ?? 'misc';
    const bucket = trackBuckets.get(id) ?? trackBuckets.get('misc')!;
    bucket.push(node);
  }

  // Group edges: within-track (passed to dagre) vs cross-track
  // (deferred to SVG). Also filter out edges whose endpoints
  // don't exist in the graph.
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const withinTrackEdges: Array<[string, string, string]> = []; // [from, to, trackId]
  for (const e of graph.edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    const fromTrack = nodeTrackId(e.from);
    const toTrack = nodeTrackId(e.to);
    if (fromTrack !== undefined && fromTrack === toTrack) {
      withinTrackEdges.push([e.from, e.to, fromTrack]);
    }
  }

  const positioned: PositionedNode[] = [];
  let yCursor = 0;
  const tracks: TrackLayout[] = [];

  for (const t of TRACK_DEFS) {
    const bucket = trackBuckets.get(t.id) ?? [];
    if (bucket.length === 0) continue;
    const trackEdges = withinTrackEdges
      .filter((e) => e[2] === t.id)
      .map(([from, to]) => ({ from, to }));
    const { nodes } = layoutTrackLR(bucket, t.id, trackEdges);
    for (const n of nodes) {
      positioned.push({ ...n, x: n.x, y: n.y + yCursor });
    }
    tracks.push({ id: t.id, label: t.label, y: yCursor });
    yCursor += NODE_H + TRACK_GAP;
  }

  // Any remaining misc nodes go on a final track.
  const misc = trackBuckets.get('misc') ?? [];
  if (misc.length > 0) {
    const { nodes } = layoutTrackLR(misc, 'misc', []);
    for (const n of nodes) {
      positioned.push({ ...n, x: n.x, y: n.y + yCursor });
    }
    tracks.push({ id: 'misc', label: 'Other', y: yCursor });
  }

  if (positioned.length === 0) {
    return {
      nodes: [],
      tracks: [],
      minX: 0,
      minY: 0,
      width: 0,
      height: 0,
    };
  }

  // Normalize positions so the leftmost node starts at TRACK_HORIZONTAL_PAD
  // and the track label gutter (the longest label width) is reserved.
  const allXs = positioned.map((n) => n.x);
  const minNodeX = Math.min(...allXs);
  const labelGutter = longestLabelWidth(TRACK_DEFS.map((t) => t.label)) + 16;
  const shiftX = TRACK_HORIZONTAL_PAD + labelGutter - minNodeX;
  for (const n of positioned) n.x += shiftX;

  const allX2 = positioned.map((n) => n.x + NODE_W);
  const allY2 = positioned.map((n) => n.y + NODE_H);
  const minX = 0;
  const minY = -TRACK_LABEL_H;
  const width = Math.max(...allX2) - minX + TRACK_HORIZONTAL_PAD;
  const height = Math.max(...allY2) - minY + TRACK_GAP;

  return { nodes: positioned, tracks, minX, minY, width, height };
}

function layoutTrackLR(
  nodes: readonly ConceptNode[],
  trackId: string,
  edges: ReadonlyArray<{ from: string; to: string }>,
): {
  nodes: PositionedNode[];
  width: number;
} {
  const g = new dagre.graphlib.Graph({ directed: true });
  g.setGraph({
    rankdir: 'LR',
    nodesep: 24,
    ranksep: 36,
    marginx: 8,
    marginy: 8,
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    g.setEdge(e.from, e.to);
  }
  dagre.layout(g);
  const positioned: PositionedNode[] = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      x: pos.x - NODE_W / 2,
      y: pos.y - NODE_H / 2,
      trackId,
    };
  });
  const allX2 = positioned.map((n) => n.x + NODE_W);
  const width = Math.max(...allX2) - Math.min(...positioned.map((n) => n.x));
  return { nodes: positioned, width };
}

function longestLabelWidth(labels: readonly string[]): number {
  // Approximate monospace width: 6.5px per char at 11px font-size.
  return Math.max(0, ...labels.map((l) => l.length * 6.5));
}

/**
 * Map a concept id to a track id. The mapping is hand-written to
 * match the home page groups; it does not pull from the lesson
 * registry (which would create a circular import at build time
 * for /map, since the registry imports lesson components).
 */
function nodeTrackId(conceptId: string): string | undefined {
  const id = conceptId;
  if (
    id === 'vector' ||
    id === 'vector-magnitude' ||
    id === 'dot-product' ||
    id === 'cos-theta' ||
    id === 'projection' ||
    id === 'dot-product-concept' ||
    id === 'vector-projection-concept'
  ) {
    return 'foundations';
  }
  if (
    id === 'softmax' ||
    id === 'attention-score' ||
    id === 'attention-weight' ||
    id === 'temperature' ||
    id === 'scaled-dot-product' ||
    id === 'causal-mask' ||
    id === 'attention-output' ||
    id === 'softmax-concept' ||
    id === 'attention-scores-concept' ||
    id === 'attention-output-concept' ||
    id === 'scaled-attention-concept' ||
    id === 'causal-mask-concept'
  ) {
    return 'pick-what-matters';
  }
  if (
    id === 'token-embedding' ||
    id === 'positional-encoding' ||
    id === 'token-embeddings-concept' ||
    id === 'positional-encoding-concept'
  ) {
    return 'tokens-as-inputs';
  }
  if (
    id === 'multi-head' ||
    id === 'residual' ||
    id === 'layer-norm' ||
    id === 'feed-forward' ||
    id === 'gelu' ||
    id === 'multi-head-attention-concept' ||
    id === 'residuals-layernorm-concept' ||
    id === 'feed-forward-concept' ||
    id === 'transformer-block'
  ) {
    return 'transformer-block';
  }
  if (
    id === 'decoding-strategy' ||
    id === 'cross-entropy' ||
    id === 'gradient-descent' ||
    id === 'sampling-decoding-concept' ||
    id === 'cross-entropy-concept' ||
    id === 'gradient-descent-concept'
  ) {
    return 'decoding-and-learning';
  }
  return undefined;
}

const TRACK_DEFS: readonly { id: string; label: string }[] = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'pick-what-matters', label: 'Picking what matters' },
  { id: 'tokens-as-inputs', label: 'Tokens as inputs' },
  { id: 'transformer-block', label: 'The block' },
  { id: 'decoding-and-learning', label: 'Decoding + learning' },
];
