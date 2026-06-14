'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  VectorCanvas,
  type VectorCanvasVector,
} from '@/components/sim/primitives/VectorCanvas';
import { Heatmap } from '@/components/sim/primitives/Heatmap';
import { dot, matMul, transpose } from '@/lib/math/linalg';
import { softmaxRows } from '@/lib/math/softmax';

export interface AttentionMatrixPreset {
  /** 4 query vectors (2D each). */
  q?: readonly (readonly [number, number])[];
  /** 4 key vectors (2D each). */
  k?: readonly (readonly [number, number])[];
  /** Temperature on the softmax applied to scores. Default 1. */
  temperature?: number;
}

const TOKEN_LABELS: readonly string[] = ['the', 'cat', 'sat', 'down'];

const DEFAULT_Q: ReadonlyArray<readonly [number, number]> = [
  [1.4, 0.3],
  [0.3, 1.4],
  [-0.6, 1.1],
  [0.0, -1.4],
];

const DEFAULT_K: ReadonlyArray<readonly [number, number]> = [
  [1.0, 0.0],
  [0.0, 1.0],
  [1.0, 0.9],
  [-0.8, 0.4],
];

function fmt(x: number, digits = 2): string {
  if (Math.abs(x) < Math.pow(10, -digits)) return (0).toFixed(digits);
  return x.toFixed(digits);
}

export function AttentionMatrix({ preset }: { preset?: AttentionMatrixPreset }) {
  const initialQ = preset?.q ?? DEFAULT_Q;
  const initialK = preset?.k ?? DEFAULT_K;
  const temperature = preset?.temperature ?? 1.0;

  const [q, setQ] = useState<[number, number][]>(() =>
    initialQ.map(([x, y]) => [x, y] as [number, number]),
  );
  const [k, setK] = useState<[number, number][]>(() =>
    initialK.map(([x, y]) => [x, y] as [number, number]),
  );
  const [showMath, setShowMath] = useState(true);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  const scores = useMemo(() => matMul(q, transpose(k)), [q, k]);
  const weights = useMemo(
    () => softmaxRows(scores, temperature),
    [scores, temperature],
  );

  const vectors: VectorCanvasVector[] = useMemo(
    () => [
      ...q.map((v, i) => ({
        id: `q${i}`,
        label: `Q${i}`,
        value: v,
      })),
      ...k.map((v, j) => ({
        id: `k${j}`,
        label: `K${j}`,
        value: v,
      })),
    ],
    [q, k],
  );

  const setVector = (id: string, value: [number, number]) => {
    if (id.startsWith('q')) {
      const i = Number(id.slice(1));
      setQ((prev) => {
        const next = prev.slice();
        next[i] = value;
        return next;
      });
    } else if (id.startsWith('k')) {
      const j = Number(id.slice(1));
      setK((prev) => {
        const next = prev.slice();
        next[j] = value;
        return next;
      });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Attention Matrix
        </h3>
        <button
          type="button"
          onClick={() => {
            setQ(DEFAULT_Q.map(([x, y]) => [x, y] as [number, number]));
            setK(DEFAULT_K.map(([x, y]) => [x, y] as [number, number]));
          }}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink focus-ring transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Q & K vectors
          </div>
          <VectorCanvas
            vectors={vectors}
            onChange={setVector}
            height={300}
            ariaLabel="8 draggable 2D vectors: 4 Q and 4 K, one per token."
          />
          <p className="mt-2 text-[11px] text-muted font-mono">
            Drag any tip — Q and K are on the same plane so the angle between
            them is direct. The matrices below update live.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Scores = QKᵀ
              </div>
              <button
                type="button"
                onClick={() => setShowMath((s) => !s)}
                className={clsx(
                  'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
                  showMath
                    ? 'border-accent text-accent'
                    : 'border-border text-muted hover:text-ink',
                )}
              >
                {showMath ? 'Math: on' : 'Math: off'}
              </button>
            </div>
            <Heatmap
              values={scores}
              rowLabels={TOKEN_LABELS as readonly string[]}
              colLabels={TOKEN_LABELS as readonly string[]}
              colormap="diverging"
              precision={2}
              cellSize={48}
              highlight={hover ?? undefined}
              ariaLabel="Score matrix: dot product of each Q with each K."
            />
            {showMath && (
              <p className="mt-2 text-[11px] text-muted font-mono">
                scores[i][j] = Q[i] · K[j]
              </p>
            )}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
              Weights = softmax(scores)
            </div>
            <Heatmap
              values={weights}
              rowLabels={TOKEN_LABELS as readonly string[]}
              colLabels={TOKEN_LABELS as readonly string[]}
              colormap="accent"
              precision={2}
              cellSize={48}
              highlight={hover ?? undefined}
              ariaLabel="Attention weight matrix: row-wise softmax of scores."
            />
            <p className="mt-2 text-[11px] text-muted font-mono">
              Each row sums to{' '}
              <span className="text-ink">{fmt(weights[0]?.reduce((a, b) => a + b, 0) ?? 1, 3)}</span>.
              Read across a row to see what that token attends to.
            </p>
          </div>
        </div>
      </div>

      {/* Hover hint matrix — invisible cells that capture pointer events so the
          user can mouse over a (i,j) cell to highlight it across both heatmaps. */}
      <div className="mt-4 text-[11px] text-dim font-mono">
        Tip: hover the matrices — both highlight the same (i, j) so you can
        see which Q–K pair produced which cell.
      </div>
      <div
        className="grid mt-2"
        style={{
          gridTemplateColumns: `repeat(${TOKEN_LABELS.length}, 1fr)`,
          gap: '2px',
        }}
        onMouseLeave={() => setHover(null)}
      >
        {TOKEN_LABELS.map((_, i) =>
          TOKEN_LABELS.map((__, j) => (
            <div
              key={`${i}-${j}`}
              className="h-4"
              onMouseEnter={() => setHover({ row: i, col: j })}
            />
          )),
        )}
      </div>
    </div>
  );
}
