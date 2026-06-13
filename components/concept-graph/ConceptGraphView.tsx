'use client';

import { Fragment, useMemo, useState } from 'react';
import dagre from 'dagre';
import Link from 'next/link';
import clsx from 'clsx';
import type { ConceptGraph, ConceptNode } from '@/lib/content/schemas';

type PositionedNode = ConceptNode & { x: number; y: number };

const NODE_W = 200;
const NODE_H = 60;

/**
 * Render the concept graph as an SVG using dagre for layout. Click a
 * node with a `lesson` to navigate to it. MVP-1: the map is a static
 * reference — no mastery state, no progress tracking.
 */
export function ConceptGraphView({ graph }: { graph: ConceptGraph }) {
  const [hover, setHover] = useState<string | null>(null);

  const positioned = useMemo(() => layoutGraph(graph), [graph]);

  if (positioned.nodes.length === 0) {
    return (
      <p className="text-muted font-mono text-sm">
        No concepts yet. Add some to <code>content/concepts/graph.yaml</code>.
      </p>
    );
  }

  const minX = Math.min(...positioned.nodes.map((n) => n.x));
  const maxX = Math.max(...positioned.nodes.map((n) => n.x + NODE_W));
  const minY = Math.min(...positioned.nodes.map((n) => n.y));
  const maxY = Math.max(...positioned.nodes.map((n) => n.y + NODE_H));
  const pad = 40;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${width} ${height}`}
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
      </defs>

      {/* Edges */}
      {graph.edges.map((e, i) => {
        const from = positioned.nodes.find((n) => n.id === e.from);
        const to = positioned.nodes.find((n) => n.id === e.to);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W / 2;
        const y1 = from.y + NODE_H;
        const x2 = to.x + NODE_W / 2;
        const y2 = to.y;
        const midY = (y1 + y2) / 2;
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
            fill="none"
            stroke="#2A323B"
            strokeWidth={1}
            markerEnd="url(#arrow)"
          />
        );
      })}

      {/* Nodes */}
      {positioned.nodes.map((n) => {
        const isLesson = !!n.lesson;
        const isHover = hover === n.id;
        const nodeContent = (
          <g
            transform={`translate(${n.x}, ${n.y})`}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            className={clsx(isLesson && 'cursor-pointer')}
          >
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill="#14181D"
              stroke={isHover ? '#3A424B' : '#1F242A'}
              strokeWidth={isHover ? 2 : 1}
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

function layoutGraph(graph: ConceptGraph): { nodes: PositionedNode[] } {
  const g = new dagre.graphlib.Graph({ directed: true });
  g.setGraph({
    rankdir: 'TB',
    nodesep: 30,
    ranksep: 60,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of graph.nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of graph.edges) {
    g.setEdge(e.from, e.to);
  }
  dagre.layout(g);
  const nodes: PositionedNode[] = graph.nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 };
  });
  return { nodes };
}
