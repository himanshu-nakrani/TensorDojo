'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { NumberInput } from '@/components/sim/primitives/NumberInput';
import { BarChart } from '@/components/sim/primitives/BarChart';
import { argmax, softmax } from '@/lib/softmax';

const DEFAULT_SCORES: readonly number[] = [2.0, 1.0, 0.1, -0.5, 1.5];
const SCORE_LABELS = ['s₁', 's₂', 's₃', 's₄', 's₅'] as const;
const TEMP_MIN = 0.1;
const TEMP_MAX = 3.0;
const TEMP_STEP = 0.1;

function formatSum(values: readonly number[]): string {
  const sum = values.reduce((a, b) => a + b, 0);
  return sum.toFixed(3);
}

/**
 * Centerpiece interactive: edit five scores, drag a temperature slider,
 * watch the softmax distribution update live. The dominant bar is rendered
 * in the accent color; everything else is a dim neutral, by design.
 */
export function SoftmaxExplorer() {
  const [scores, setScores] = useState<number[]>([...DEFAULT_SCORES]);
  const [temperature, setTemperature] = useState(1.0);

  const distribution = useMemo(
    () => softmax(scores, temperature),
    [scores, temperature],
  );
  const dominant = useMemo(() => argmax(distribution), [distribution]);
  const sumLabel = useMemo(() => formatSum(distribution), [distribution]);

  const setScore = (i: number, v: number) => {
    setScores((prev) => {
      if (prev[i] === v) return prev;
      const next = prev.slice();
      next[i] = v;
      return next;
    });
  };

  const reset = () => {
    setScores([...DEFAULT_SCORES]);
    setTemperature(1.0);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Softmax Explorer
        </h3>
        <button
          type="button"
          onClick={reset}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Scores */}
      <section aria-label="Scores" className="mb-7">
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
          Scores
        </div>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {scores.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <NumberInput
                value={s}
                step={0.1}
                onChange={(v) => setScore(i, v)}
                ariaLabel={`Score ${i + 1}`}
                className="w-full text-center"
              />
              <span className="text-[10px] text-dim font-mono">
                {SCORE_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Temperature */}
      <section aria-label="Temperature" className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
          Temperature
        </div>
        <Slider
          value={temperature}
          min={TEMP_MIN}
          max={TEMP_MAX}
          step={TEMP_STEP}
          onChange={setTemperature}
          formatValue={(v) => v.toFixed(1)}
          ariaLabel="Temperature"
        />
        <div className="flex justify-between mt-2 text-[10px] text-dim font-mono tabular-nums">
          <span>{TEMP_MIN.toFixed(1)} sharp</span>
          <span>{TEMP_MAX.toFixed(1)} flat</span>
        </div>
      </section>

      {/* Distribution */}
      <section aria-label="Distribution" className="mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
            Distribution
          </div>
          <div className="text-[10px] text-dim font-mono tabular-nums">
            p({SCORE_LABELS[dominant]}) ={' '}
            <span className="text-accent">
              {(distribution[dominant] ?? 0).toFixed(3)}
            </span>
          </div>
        </div>
        <BarChart
          values={distribution}
          highlightIndex={dominant}
          labels={distribution.map((p) => p.toFixed(2))}
          height={220}
          ariaLabel={`Softmax distribution with 5 entries. Largest entry is ${
            (distribution[dominant] ?? 0).toFixed(3)
          }.`}
        />
      </section>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border text-[11px] font-mono text-muted">
        <span>Σ pᵢ</span>
        <span className="text-ink tabular-nums">= {sumLabel}</span>
      </div>
    </div>
  );
}
