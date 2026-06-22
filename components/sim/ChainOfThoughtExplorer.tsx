'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Toy chain-of-thought demo.
 *
 * Problem: compute 13 × 4 + 27.
 * Truth: 13 × 4 = 52; 52 + 27 = 79.
 *
 * The "direct" prompt asks for the answer in one shot. The toy model
 * (hand-tuned distributions, not a real LLM) returns a noisy
 * distribution over plausible final-answer tokens.
 *
 * The "chain-of-thought" prompt sees the model unroll intermediate
 * tokens. Each intermediate sub-problem (one multiplication, one
 * addition) has a sharp distribution; the final answer conditioned
 * on the trace also has a sharp distribution.
 */

type AnswerDist = Record<string, number>;

const DIRECT_DIST: AnswerDist = {
  '79': 0.34,
  '78': 0.18,
  '80': 0.11,
  '52': 0.09,
  '81': 0.08,
  '69': 0.07,
  '89': 0.05,
  '77': 0.04,
  '82': 0.04,
};

const STEP_1_DIST: AnswerDist = {
  '52': 0.88,
  '53': 0.04,
  '51': 0.04,
  '42': 0.02,
  '62': 0.02,
};

const STEP_2_DIST: AnswerDist = {
  '79': 0.91,
  '78': 0.03,
  '80': 0.03,
  '69': 0.02,
  '89': 0.01,
};

interface CotStep {
  prefix: string;
  prompt: string;
  truth: string;
  dist: AnswerDist;
}

const COT_STEPS: CotStep[] = [
  {
    prefix: '13 × 4 = ',
    prompt: 'multiply first',
    truth: '52',
    dist: STEP_1_DIST,
  },
  {
    prefix: '52 + 27 = ',
    prompt: 'now add',
    truth: '79',
    dist: STEP_2_DIST,
  },
];

export function ChainOfThoughtExplorer() {
  const [mode, setMode] = useState<'direct' | 'cot'>('direct');
  const [stepIndex, setStepIndex] = useState(0);

  const final = mode === 'direct' ? DIRECT_DIST : STEP_2_DIST;
  const currentTrace = COT_STEPS.slice(0, stepIndex);
  const next = COT_STEPS[stepIndex];

  return (
    <SimFrame
      title="Direct vs chain-of-thought decoding"
      headerWrap
      headerAction={
        <div className="flex items-center gap-2">
          {(['direct', 'cot'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setStepIndex(0);
              }}
              aria-pressed={mode === m}
              className={clsx(
                'text-[11px] uppercase tracking-[0.12em] font-mono px-3 py-0.5 rounded border focus-ring transition-colors',
                mode === m
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-muted hover:text-ink hover:border-border-strong',
              )}
            >
              {m === 'direct' ? 'Direct' : 'Chain-of-thought'}
            </button>
          ))}
        </div>
      }
    >
      {/* Problem statement */}
      <div className="rounded-lg border border-border bg-bg/40 p-4 mb-4">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
          problem
        </div>
        <div className="text-[15px] font-mono text-ink">
          13 × 4 + 27 = ?
        </div>
        <div className="text-[11px] text-fg-muted mt-1 font-mono">
          true answer: 79
        </div>
      </div>

      {mode === 'direct' ? (
        <DirectPanel dist={DIRECT_DIST} />
      ) : (
        <CotPanel
          trace={currentTrace}
          next={next}
          finalDist={final}
          done={stepIndex >= COT_STEPS.length}
          onStep={() => setStepIndex((i) => Math.min(i + 1, COT_STEPS.length))}
          onReset={() => setStepIndex(0)}
        />
      )}
    </SimFrame>
  );
}

function DirectPanel({ dist }: { dist: AnswerDist }) {
  return (
    <>
      <div className="rounded-lg border border-border bg-bg/40 p-4 mb-4">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
          prompt
        </div>
        <div className="text-[13px] font-mono text-ink leading-relaxed">
          Q: 13 × 4 + 27 = ?<br />
          A: <span className="text-fg-subtle italic">[one token]</span>
        </div>
      </div>
      <DistributionBars dist={dist} truth="79" label="P(answer | prompt)" />
    </>
  );
}

function CotPanel({
  trace,
  next,
  finalDist,
  done,
  onStep,
  onReset,
}: {
  trace: readonly CotStep[];
  next: CotStep | undefined;
  finalDist: AnswerDist;
  done: boolean;
  onStep: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <div className="rounded-lg border border-border bg-bg/40 p-4 mb-4">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
          prompt + trace so far
        </div>
        <div className="text-[13px] font-mono text-ink leading-relaxed">
          Q: 13 × 4 + 27 = ? Think step by step.<br />
          A:{' '}
          {trace.map((t, i) => (
            <span key={i}>
              {t.prefix}
              <span className="text-accent">{t.truth}</span>.{' '}
            </span>
          ))}
          {next && (
            <span>
              {next.prefix}
              <span className="text-fg-subtle italic">[next token]</span>
            </span>
          )}
          {done && (
            <>
              Answer: <span className="text-accent">79</span>.
            </>
          )}
        </div>
      </div>

      {next && !done && (
        <>
          <div className="mb-3 text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            step {trace.length + 1} · {next.prompt}
          </div>
          <DistributionBars
            dist={next.dist}
            truth={next.truth}
            label={`P(next | prompt, trace)`}
          />
        </>
      )}

      {done && (
        <DistributionBars
          dist={finalDist}
          truth="79"
          label="P(final answer | prompt, complete trace)"
        />
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onStep}
          disabled={done}
          className={clsx(
            'text-[11px] uppercase tracking-[0.12em] font-mono px-3 py-1 rounded border focus-ring transition-colors',
            done
              ? 'border-border text-fg-subtle cursor-not-allowed'
              : 'border-accent text-accent bg-accent-soft hover:bg-accent/15',
          )}
        >
          Step ›
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] uppercase tracking-[0.12em] font-mono px-3 py-1 rounded border border-border text-muted hover:text-ink hover:border-border-strong focus-ring transition-colors"
        >
          Reset
        </button>
      </div>
    </>
  );
}

function DistributionBars({
  dist,
  truth,
  label,
}: {
  dist: AnswerDist;
  truth: string;
  label: string;
}) {
  const entries = Object.entries(dist);
  entries.sort((a, b) => b[1] - a[1]);
  const maxP = Math.max(...entries.map(([, v]) => v));

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
        {label}
      </div>
      <div className="space-y-1.5">
        {entries.map(([k, v]) => {
          const isTruth = k === truth;
          const widthPct = (v / maxP) * 100;
          return (
            <div key={k} className="flex items-center gap-3">
              <span
                className={clsx(
                  'text-[12px] font-mono tabular-nums w-12 text-right',
                  isTruth ? 'text-accent font-semibold' : 'text-fg-muted',
                )}
              >
                {k}
              </span>
              <div className="flex-1 h-4 rounded-sm bg-bg/40 border border-border overflow-hidden">
                <div
                  className={clsx(
                    'h-full transition-[width]',
                    isTruth
                      ? 'bg-[rgb(var(--accent))]'
                      : 'bg-[rgb(var(--accent-hover))]',
                  )}
                  style={{
                    width: `${widthPct}%`,
                    opacity: isTruth ? 0.9 : 0.45,
                  }}
                />
              </div>
              <span
                className={clsx(
                  'text-[11px] font-mono tabular-nums w-12',
                  isTruth ? 'text-accent font-semibold' : 'text-fg-muted',
                )}
              >
                {(v * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
