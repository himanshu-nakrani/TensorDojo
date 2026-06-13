'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  VectorCanvas,
  type VectorCanvasVector,
} from '@/components/sim/primitives/VectorCanvas';
import { cosTheta, dot, magnitude } from '@/lib/math/linalg';

export interface CandidateCosinePreset {
  q?: readonly [number, number];
  /** Length of the special resizable candidate. */
  resizableLength?: number;
}

const DEFAULT_Q: [number, number] = [1.5, 0.4];

/** Five fixed candidates + one with a resizable length. */
const FIXED_CANDIDATES: ReadonlyArray<{
  id: string;
  label: string;
  value: readonly [number, number];
}> = [
  { id: 'c1', label: 'c₁', value: [1.0, 0.0] },
  { id: 'c2', label: 'c₂', value: [0.6, 0.9] },
  { id: 'c3', label: 'c₃', value: [-0.4, 1.1] },
  { id: 'c4', label: 'c₄', value: [0.0, -1.0] },
  { id: 'c5', label: 'c₅', value: [0.8, -0.5] },
];
const RESIZABLE_ID = 'cr';
const RESIZABLE_LABEL = 'c_R';
const RESIZABLE_DIR: [number, number] = [1, 0.4]; // direction
const DEFAULT_RESIZABLE_LEN = 0.7;

function fmt(x: number, digits = 2): string {
  if (Math.abs(x) < Math.pow(10, -digits)) return (0).toFixed(digits);
  return x.toFixed(digits);
}

/**
 * Side-by-side ranking of 6 candidates by raw dot product and
 * cosine similarity. The query is draggable; one candidate has a
 * resizable length so the reader can see how magnitude moves the
 * raw dot product but leaves cosine alone.
 */
export function CandidateCosine({ preset }: { preset?: CandidateCosinePreset }) {
  const [q, setQ] = useState<[number, number]>(() => {
    const p = preset?.q;
    return [p?.[0] ?? DEFAULT_Q[0], p?.[1] ?? DEFAULT_Q[1]];
  });
  const [resizableLen, setResizableLen] = useState<number>(
    () => preset?.resizableLength ?? DEFAULT_RESIZABLE_LEN,
  );

  const candidates = useMemo(() => {
    const dirMag = magnitude(RESIZABLE_DIR);
    const unit = [RESIZABLE_DIR[0] / dirMag, RESIZABLE_DIR[1] / dirMag] as const;
    return [
      ...FIXED_CANDIDATES.map((c) => ({
        id: c.id,
        label: c.label,
        value: c.value,
        resizable: false,
      })),
      {
        id: RESIZABLE_ID,
        label: RESIZABLE_LABEL,
        value: [unit[0] * resizableLen, unit[1] * resizableLen] as readonly [
          number,
          number,
        ],
        resizable: true,
      },
    ];
  }, [resizableLen]);

  const rows = useMemo(
    () =>
      candidates.map((c) => {
        const qDot = dot(q, c.value);
        const cos = cosTheta(q, c.value);
        return { ...c, qDot, cos };
      }),
    [candidates, q],
  );

  const rankedByDot = useMemo(
    () => [...rows].sort((a, b) => b.qDot - a.qDot),
    [rows],
  );

  const vectors: VectorCanvasVector[] = useMemo(
    () => [
      { id: 'q', label: 'q', value: q },
      ...FIXED_CANDIDATES.map((c) => ({
        id: c.id,
        label: c.label,
        value: c.value,
      })),
      {
        id: RESIZABLE_ID,
        label: RESIZABLE_LABEL,
        value: [
          RESIZABLE_DIR[0] * resizableLen,
          RESIZABLE_DIR[1] * resizableLen,
        ],
      },
    ],
    [q, resizableLen],
  );

  const setVector = (id: string, value: [number, number]) => {
    if (id === 'q') setQ(value);
    // candidate tips are not user-movable; the resizable one is a length slider.
  };

  // The scale of the bars. Use the maximum absolute dot product in the table.
  const maxAbs = Math.max(0.001, ...rows.map((r) => Math.abs(r.qDot)));

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Candidate Cosine
        </h3>
        <button
          type="button"
          onClick={() => {
            setQ([...DEFAULT_Q] as [number, number]);
            setResizableLen(DEFAULT_RESIZABLE_LEN);
          }}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Query (drag) and 5 fixed candidates
          </div>
          <VectorCanvas
            vectors={vectors}
            onChange={setVector}
            height={300}
            ariaLabel="Query vector q and 5 fixed candidate vectors. Drag q to recompute."
          />
          <p className="mt-2 text-[11px] text-muted font-mono">
            The cyan resizable arrow c_R has a length slider below — drag
            the query, then change c_R's length to see dot product change
            while cosine similarity does not.
          </p>
        </div>

        <div className="md:w-[420px] space-y-2">
          <header className="grid grid-cols-[80px_1fr_1fr] gap-3 text-[10px] uppercase tracking-[0.18em] text-dim font-mono pb-1 border-b border-border">
            <span>candidate</span>
            <span className="text-right">q · c</span>
            <span className="text-right">cos θ</span>
          </header>
          {rankedByDot.map((r) => (
            <div
              key={r.id}
              className={clsx(
                'grid grid-cols-[80px_1fr_1fr] gap-3 items-center font-mono text-[12px] tabular-nums',
                r.resizable && 'bg-bg/40 rounded px-2 py-1 -mx-2',
              )}
            >
              <div className="flex flex-col">
                <span className="text-ink">{r.label}</span>
                {r.resizable && (
                  <span className="text-[10px] text-dim">‖c_R‖ = {fmt(magnitude(r.value), 1)}</span>
                )}
              </div>
              <SignedBar value={r.qDot} max={maxAbs} />
              <SignedBar value={r.cos} max={1} accent />
            </div>
          ))}

          <div className="pt-3 mt-2 border-t border-border space-y-2">
            <label className="block">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                  c_R length
                </span>
                <span className="font-mono text-[12px] text-ink tabular-nums">
                  {fmt(resizableLen, 2)}
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={2.5}
                step={0.05}
                value={resizableLen}
                onChange={(e) =>
                  setResizableLen(parseFloat(e.target.value) || DEFAULT_RESIZABLE_LEN)
                }
                className="slider w-full"
                style={{ ['--fill' as string]: `${((resizableLen - 0.1) / 2.4) * 100}%` }}
                aria-label="Length of resizable candidate"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignedBar({
  value,
  max,
  accent,
}: {
  value: number;
  max: number;
  accent?: boolean;
}) {
  const t = Math.max(-1, Math.min(1, value / max));
  const pct = Math.abs(t) * 50; // half-width
  return (
    <div className="relative h-3 bg-border rounded-sm overflow-hidden">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-strong" />
      <div
        className={clsx(
          'absolute top-0 bottom-0 transition-all duration-150',
          accent ? 'bg-accent' : 'bg-ink/70',
        )}
        style={
          t >= 0
            ? { left: '50%', width: `${pct}%` }
            : { right: '50%', width: `${pct}%` }
        }
      />
      <span
        className={clsx(
          'absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-mono tabular-nums',
          accent ? 'text-accent' : 'text-ink',
        )}
      >
        {fmt(value)}
      </span>
    </div>
  );
}
