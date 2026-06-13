'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  VectorCanvas,
  type VectorCanvasVector,
} from '@/components/sim/primitives/VectorCanvas';
import { dot } from '@/lib/math/linalg';

export interface CandidateSortPreset {
  query?: readonly [number, number];
}

const DEFAULT_QUERY: [number, number] = [1.2, 0.4];

const CANDIDATES: ReadonlyArray<{ id: string; label: string; value: [number, number] }> = [
  { id: 'c1', label: 'c₁', value: [1.5, 0.0] },
  { id: 'c2', label: 'c₂', value: [0.4, 1.4] },
  { id: 'c3', label: 'c₃', value: [-1.0, 0.6] },
  { id: 'c4', label: 'c₄', value: [0.8, -0.9] },
  { id: 'c5', label: 'c₅', value: [-0.6, -1.1] },
];

const SCALE = 4; // bar scale for q·c values.

function fmt(x: number, digits = 2): string {
  if (Math.abs(x) < Math.pow(10, -digits)) return (0).toFixed(digits);
  return x.toFixed(digits);
}

/**
 * Secondary dot-product interactive. A query vector the reader drags,
 * plus five fixed candidate vectors. The candidate list re-sorts by
 * dot product with the query as it moves.
 */
export function CandidateSort({ preset }: { preset?: CandidateSortPreset }) {
  const [query, setQuery] = useState<[number, number]>(() => {
    const v = preset?.query ?? DEFAULT_QUERY;
    return [v[0], v[1]];
  });

  const scored = useMemo(() => {
    return CANDIDATES.map((c) => ({
      ...c,
      score: dot(query, c.value),
    })).sort((a, b) => b.score - a.score);
  }, [query]);

  // The query is the only manipulable element; candidates are dimmer
  // because they are not (here) draggable.
  const vectors: VectorCanvasVector[] = useMemo(
    () => [
      { id: 'q', label: 'q', value: query },
      ...CANDIDATES.map((c) => ({ id: c.id, label: c.label, value: c.value })),
    ],
    [query],
  );

  const setVector = (id: string, value: [number, number]) => {
    if (id === 'q') setQuery(value);
    // Candidates are not draggable in this interactive.
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Candidate Sort
        </h3>
        <button
          type="button"
          onClick={() => setQuery([...DEFAULT_QUERY])}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink transition-colors"
        >
          Reset
        </button>
      </div>
      <p className="text-[12px] text-muted mb-5 font-mono">
        Drag <span className="text-accent">q</span> — the 5 candidates re-sort by{' '}
        <span className="text-ink">q · cᵢ</span> in real time.
      </p>

      <VectorCanvas
        vectors={vectors}
        onChange={setVector}
        height={260}
        ariaLabel="Query vector q (draggable) and five fixed candidate vectors."
      />

      <ol className="mt-5 space-y-2 font-mono text-[13px]">
        {scored.map((c, i) => (
          <li
            key={c.id}
            className="grid grid-cols-[2.5rem_2rem_minmax(0,1fr)_4rem] items-center gap-3"
          >
            <span className="text-dim tabular-nums text-right">
              {i + 1}
            </span>
            <span className="text-muted">{c.label}</span>
            <SignedBar value={c.score} max={SCALE} />
            <span
              className={clsx(
                'tabular-nums text-right',
                c.score === scored[0]?.score ? 'text-accent' : 'text-ink',
              )}
            >
              {fmt(c.score, 2)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SignedBar({ value, max }: { value: number; max: number }) {
  const half = 50;
  const frac = Math.max(-1, Math.min(1, value / max));
  const widthPct = Math.abs(frac) * half;
  const positive = frac >= 0;
  return (
    <div className="relative h-5 bg-bg/40 rounded-sm overflow-hidden">
      <div
        className="absolute inset-y-0 w-px bg-border-strong"
        style={{ left: `${half}%` }}
      />
      <div
        className={clsx(
          'absolute inset-y-0 transition-all duration-200 ease-out',
          positive ? 'bg-accent' : 'bg-[rgba(248,113,113,0.7)]',
        )}
        style={
          positive
            ? { left: `${half}%`, width: `${widthPct}%` }
            : { left: `${half - widthPct}%`, width: `${widthPct}%` }
        }
      />
    </div>
  );
}
