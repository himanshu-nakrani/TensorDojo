'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Heatmap } from '@/components/sim/primitives/Heatmap';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { causalMask, applyMask, NEG_INF } from '@/lib/math/mask';
import { softmaxRows } from '@/lib/math/softmax';

export interface CausalMaskExplorerPreset {
  n?: number;
  scores?: number[][];
}

/**
 * A small (n×n) score matrix with a causal-mask toggle. The
 * centerpiece shows what causal masking does to the post-softmax
 * weights: the upper triangle goes to zero.
 */
export function CausalMaskExplorer({ preset }: { preset?: CausalMaskExplorerPreset }) {
  const [n, setN] = useState(preset?.n ?? 6);
  const [maskOn, setMaskOn] = useState(true);

  // Default scores: a small block where later positions have larger
  // scores — so the "without mask" view has the bottom row dominating
  // everything.
  const scores = useMemo(() => {
    if (preset?.scores) return preset.scores;
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        // Score grows with both i and j, with a small offset for visual interest.
        return (i + j) * 0.5 + Math.sin(i * j) * 0.4;
      }),
    );
  }, [preset, n]);

  const mask = useMemo(() => causalMask(n), [n]);
  const maskedScores = useMemo(
    () => (maskOn ? applyMask(scores, mask) : scores),
    [scores, mask, maskOn],
  );
  const weights = useMemo(() => softmaxRows(maskedScores), [maskedScores]);

  const reset = () => {
    setN(preset?.n ?? 6);
    setMaskOn(true);
  };

  return (
    <SimFrame
      title="Causal mask"
      headerAction={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMaskOn((s) => !s)}
            className={clsx(
              'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
              maskOn
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink',
            )}
            aria-pressed={maskOn}
          >
            Causal mask: {maskOn ? 'on' : 'off'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Scores
          </div>
          <div className="relative">
            <Heatmap
              values={maskedScores}
              colormap="diverging"
              precision={2}
              cellSize={56}
              ariaLabel="Causal-masked score matrix"
            />
            {/* Overlay: dim the upper triangle cells */}
            {maskOn && (
              <svg
                viewBox={`0 0 ${24 + n * 56} ${n * 56}`}
                className="absolute inset-0 pointer-events-none"
                preserveAspectRatio="xMidYMid meet"
              >
                {Array.from({ length: n }, (_, i) =>
                  Array.from({ length: n }, (_, j) => {
                    if (j <= i) return null;
                    return (
                      <g key={`${i}-${j}`}>
                        <line
                          x1={24 + j * 56 + 14}
                          y1={i * 56 + 14}
                          x2={24 + j * 56 + 42}
                          y2={i * 56 + 42}
                          stroke="rgb(var(--fg-subtle))"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                        <line
                          x1={24 + j * 56 + 42}
                          y1={i * 56 + 14}
                          x2={24 + j * 56 + 14}
                          y2={i * 56 + 42}
                          stroke="rgb(var(--fg-subtle))"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  }),
                )}
              </svg>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Weights (post-softmax)
          </div>
          <Heatmap
            values={weights}
            colormap="accent"
            precision={2}
            cellSize={56}
            ariaLabel="Post-softmax attention weights"
          />
          <div className="text-[10px] text-dim font-mono mt-1">
            Each row sums to 1.00; the upper triangle {maskOn ? 'is zero' : 'is not'}.
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-3 font-mono text-[12px]">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
          Sequence length
        </span>
        <Slider
          value={n}
          min={3}
          max={8}
          step={1}
          onChange={(v) => setN(Math.round(v))}
          formatValue={(v) => String(Math.round(v))}
          ariaLabel="Sequence length"
          valueMinWidth="1.5ch"
        />
      </div>
    </SimFrame>
  );
}
