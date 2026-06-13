'use client';

import { useMemo, useRef, useState, KeyboardEvent } from 'react';
import { NumberInput } from '@/components/sim/primitives/NumberInput';
import { argmax, softmax } from '@/lib/softmax';

const DEFAULT_SCORES: readonly number[] = [2.0, 1.0, 0.1, -0.5, 1.5];
const SCORE_LABELS = ['s₁', 's₂', 's₃', 's₄', 's₅'] as const;
const NUDGE_STEP = 0.1;
const NUDGE_STEP_LARGE = 1.0;

/**
 * A smaller, focused interactive: a column of editable scores whose softmax
 * distribution updates live. Tests that the score→distribution pattern
 * generalizes to a second widget. Arrow keys nudge the focused score.
 */
export function ScoreEditor() {
  const [scores, setScores] = useState<number[]>([...DEFAULT_SCORES]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const distribution = useMemo(() => softmax(scores), [scores]);
  const dominant = useMemo(() => argmax(distribution), [distribution]);
  const sumLabel = useMemo(
    () => distribution.reduce((a, b) => a + b, 0).toFixed(3),
    [distribution],
  );

  const setScore = (i: number, v: number) => {
    setScores((prev) => {
      if (prev[i] === v) return prev;
      const next = prev.slice();
      next[i] = v;
      return next;
    });
  };

  // ArrowUp / ArrowDown nudge by ±0.1; Shift+arrow nudges by ±1.
  const handleKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    const step = e.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setScore(i, (scores[i] as number) + step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setScore(i, (scores[i] as number) - step);
    }
  };

  const reset = () => setScores([...DEFAULT_SCORES]);

  // Each row's bar fills the row's allotted width.
  const max = Math.max(0.001, ...distribution);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Score Editor
        </h3>
        <button
          type="button"
          onClick={reset}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink transition-colors"
        >
          Reset
        </button>
      </div>
      <p className="text-[12px] text-muted mb-5 font-mono">
        Focus a cell and nudge with{' '}
        <kbd className="px-1.5 py-0.5 rounded border border-border-strong text-ink bg-surface-2 text-[10px]">
          ↑
        </kbd>{' '}
        <kbd className="px-1.5 py-0.5 rounded border border-border-strong text-ink bg-surface-2 text-[10px]">
          ↓
        </kbd>
        . Hold{' '}
        <kbd className="px-1.5 py-0.5 rounded border border-border-strong text-ink bg-surface-2 text-[10px]">
          Shift
        </kbd>{' '}
        for a 10× step.
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2.5rem)] gap-x-4 gap-y-3 items-center font-mono text-[13px]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim">
          Score
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim">
          Probability
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim text-right">
          p
        </div>

        {scores.map((s, i) => {
          const p = distribution[i] as number;
          const widthPct = (p / max) * 100;
          const isDominant = i === dominant;
          return (
            <div key={i} className="contents">
              <div className="flex items-center gap-3">
                <NumberInput
                  value={s}
                  step={0.1}
                  onChange={(v) => setScore(i, v)}
                  onKeyDown={handleKey(i)}
                  ariaLabel={`Score ${i + 1}`}
                  className="w-20"
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                />
                <span className="text-[11px] text-dim">{SCORE_LABELS[i]}</span>
              </div>
              <div className="relative h-7 bg-bg/40 rounded-sm overflow-hidden">
                <div
                  className={
                    'absolute inset-y-0 left-0 rounded-sm transition-all duration-200 ease-out ' +
                    (isDominant ? 'bg-accent' : 'bg-border-strong')
                  }
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div
                className={
                  'text-right tabular-nums ' +
                  (isDominant ? 'text-accent' : 'text-muted')
                }
              >
                {p.toFixed(3)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-border text-[11px] font-mono text-muted">
        <span>Σ pᵢ</span>
        <span className="text-ink tabular-nums">= {sumLabel}</span>
      </div>
    </div>
  );
}
