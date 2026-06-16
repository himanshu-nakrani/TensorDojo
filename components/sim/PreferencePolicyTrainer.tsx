'use client';

import { useCallback, useRef, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { dpoGradient, policySoftmax } from '@/lib/math/rlhf';
import {
  BETA,
  LR,
  PREFERENCES,
  PROMPT,
  RESPONSES,
} from './_lesson31-prefs';

const N_PREFS = PREFERENCES.length; // 6
const REF_LOGITS = [0, 0, 0, 0] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function applyStep(
  logits: number[],
  stepIndex: number,
): { logits: number[]; nextIndex: number } {
  const pref = PREFERENCES[stepIndex % N_PREFS]!;
  const grad = dpoGradient(
    logits,
    REF_LOGITS,
    pref.preferred,
    pref.dispreferred,
    BETA,
  );
  const next = logits.map((l, i) => l - LR * grad[i]!);
  return { logits: next, nextIndex: (stepIndex + 1) % N_PREFS };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Centerpiece for lesson 31: a 4-response policy trained step-by-step
 * using DPO updates from a hand-tuned preference dataset.
 *
 * The bar chart shifts visibly on every Step press because lr=0.3 is
 * deliberately large. After ~20 steps, response 1 ("Ask what they're
 * cooking…") dominates and response 2 ("Recite a recipe.") loses.
 */
export function PreferencePolicyTrainer() {
  const [logits, setLogits] = useState<number[]>([0, 0, 0, 0]);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const probs = policySoftmax(logits);
  const nextPref = PREFERENCES[stepIndex % N_PREFS]!;
  const epoch = Math.floor(totalSteps / N_PREFS);

  // Single step
  const handleStep = useCallback(() => {
    setLogits((prev) => {
      const { logits: next, nextIndex } = applyStep(prev, stepIndex);
      setStepIndex(nextIndex);
      setTotalSteps((t) => t + 1);
      return next;
    });
  }, [stepIndex]);

  // Step × 6: stagger 6 updates over 1.2 s
  const handleStep6 = useCallback(() => {
    if (animRef.current !== null) return;
    let current = { logits: logits.slice(), stepIndex };
    let tick = 0;

    const run = () => {
      const { logits: next, nextIndex } = applyStep(
        current.logits,
        current.stepIndex,
      );
      current = { logits: next, stepIndex: nextIndex };
      tick += 1;

      setLogits(next.slice());
      setStepIndex(nextIndex);
      setTotalSteps((t) => t + 1);

      if (tick < N_PREFS) {
        animRef.current = setTimeout(run, 200);
      } else {
        animRef.current = null;
      }
    };

    animRef.current = setTimeout(run, 0);
  }, [logits, stepIndex]);

  const handleReset = useCallback(() => {
    if (animRef.current !== null) {
      clearTimeout(animRef.current);
      animRef.current = null;
    }
    setLogits([0, 0, 0, 0]);
    setStepIndex(0);
    setTotalSteps(0);
  }, []);

  return (
    <SimFrame
      title="Policy trainer"
      headerAction={
        <span className="text-[11px] font-mono text-muted tabular-nums">
          step {totalSteps % N_PREFS} of {N_PREFS} &middot; epoch {epoch}
        </span>
      }
    >
      <div className="space-y-5">
      {/* Prompt */}
      <div className="rounded border border-border bg-bg/50 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono mr-2">
          Prompt
        </span>
        <span className="font-mono text-[12px] text-ink">{PROMPT}</span>
      </div>

      {/* Probability bars */}
      <section aria-label="Policy probabilities">
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
          Policy probabilities
        </div>
        <div className="space-y-2">
          {RESPONSES.map((resp, i) => {
            const pct = probs[i]! * 100;
            return (
              <div key={i} className="flex items-center gap-2 min-w-0">
                {/* Response label */}
                <span className="font-mono text-[11px] text-muted w-4 shrink-0 tabular-nums">
                  {i}
                </span>
                <span className="font-mono text-[11px] text-ink w-52 shrink-0 truncate">
                  {resp}
                </span>
                {/* Bar */}
                <div className="flex-1 bg-bg/60 rounded-sm overflow-hidden h-4 relative min-w-0">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${pct.toFixed(2)}%`,
                      backgroundColor: 'rgb(var(--accent))',
                      transition: 'width 200ms ease-out',
                    }}
                  />
                </div>
                {/* Percentage */}
                <span className="font-mono text-[11px] text-ink tabular-nums w-12 text-right shrink-0">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Next preference preview */}
      <div className="rounded border border-border bg-bg/40 px-3 py-2 font-mono text-[11px] text-muted">
        <span className="text-dim uppercase tracking-[0.14em] text-[10px] mr-2">
          Next preference
        </span>
        response {nextPref.preferred} preferred over response{' '}
        {nextPref.dispreferred}
        <span className="ml-2 text-dim">
          &mdash; &ldquo;{RESPONSES[nextPref.preferred]}&rdquo; &gt;{' '}
          &ldquo;{RESPONSES[nextPref.dispreferred]}&rdquo;
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleStep}
          className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[12px] hover:border-border-strong transition-colors"
        >
          Step
        </button>
        <button
          type="button"
          onClick={handleStep6}
          className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[12px] hover:border-border-strong transition-colors"
        >
          Step &times;6
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[12px] hover:border-border-strong transition-colors text-muted"
        >
          Reset
        </button>
      </div>
      </div>
    </SimFrame>
  );
}
