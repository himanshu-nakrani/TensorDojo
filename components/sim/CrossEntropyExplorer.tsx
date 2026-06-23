'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { BarChart } from '@/components/sim/primitives/BarChart';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { crossEntropy } from '@/lib/math/cross-entropy';

interface VocabEntry {
  id: string;
  label: string;
  /** Pre-softmax logit the model assigned to this token. */
  defaultLogit: number;
}

const VOCAB: readonly VocabEntry[] = [
  { id: 'the', label: 'the', defaultLogit: 2.0 },
  { id: 'a', label: 'a', defaultLogit: 1.2 },
  { id: 'cat', label: 'cat', defaultLogit: 0.5 },
  { id: 'dog', label: 'dog', defaultLogit: -0.3 },
  { id: 'sat', label: 'sat', defaultLogit: -0.5 },
  { id: 'ran', label: 'ran', defaultLogit: -1.0 },
  { id: 'mat', label: 'mat', defaultLogit: -1.5 },
  { id: 'on', label: 'on', defaultLogit: -2.0 },
];

function softmax(xs: readonly number[]): number[] {
  const max = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function fmt(x: number, digits = 3): string {
  if (!Number.isFinite(x)) return '∞';
  if (Math.abs(x) < Math.pow(10, -digits)) return (0).toFixed(digits);
  return x.toFixed(digits);
}

/**
 * Centerpiece for the cross-entropy lesson.
 *
 * A vocabulary of 8 tokens. The reader can:
 * - Drag any token's slider to change the model's logit for it
 *   (renormalized after each change to keep a valid distribution)
 * - Click any token to set it as the "true" answer
 *
 * The bar chart shows the model's predicted distribution; the
 * accent color marks the true token. The single-example loss is
 * displayed live, with a log-scale axis so the asymmetry is
 * visible across many orders of magnitude.
 */
export function CrossEntropyExplorer() {
  const [logits, setLogits] = useState<number[]>(() =>
    VOCAB.map((v) => v.defaultLogit),
  );
  const [trueIndex, setTrueIndex] = useState<number>(0); // "the"

  const probs = useMemo(() => softmax(logits), [logits]);
  const loss = useMemo(() => crossEntropy(probs, trueIndex), [probs, trueIndex]);
  const pTrue = probs[trueIndex] as number;

  const setLogit = (i: number, v: number) => {
    setLogits((prev) => {
      const next = prev.slice();
      next[i] = v;
      return next;
    });
  };

  const reset = () => {
    setLogits(VOCAB.map((v) => v.defaultLogit));
    setTrueIndex(0);
  };

  return (
    <SimFrame title="Drag logits · click the true token · watch −log p" onReset={reset}>
      {/* Logits — one slider per token */}
      <section aria-label="Logits" className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
          Model logits (drag to change)
        </div>
        <div className="space-y-2">
          {logits.map((logit, i) => {
            const isTrue = i === trueIndex;
            return (
              <div key={VOCAB[i]!.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTrueIndex(i)}
                  className={
                    'w-16 text-left text-[12px] font-mono py-1 px-2 rounded border focus-ring transition-colors ' +
                    (isTrue
                      ? 'border-accent text-accent bg-accent-faint'
                      : 'border-border text-muted hover:text-ink hover:border-border-strong')
                  }
                  aria-pressed={isTrue}
                  aria-label={`Set ${VOCAB[i]!.label} as the true token`}
                >
                  {VOCAB[i]!.label}
                </button>
                <Slider
                  value={logit}
                  min={-3}
                  max={3}
                  step={0.1}
                  onChange={(v) => setLogit(i, v)}
                  formatValue={(v) => v.toFixed(1)}
                  ariaLabel={`Logit for ${VOCAB[i]!.label}`}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Distribution */}
      <section aria-label="Distribution" className="mb-5">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Predicted distribution (after softmax)
          </div>
          <div className="text-[11px] text-dim font-mono tabular-nums">
            p(true) ={' '}
            <span className="text-ink">{fmt(pTrue, 3)}</span>
          </div>
        </div>
        <BarChart
          values={probs}
          highlightIndex={trueIndex}
          labels={VOCAB.map((v, i) =>
            i === trueIndex ? `★ ${v.label}` : v.label,
          )}
          height={220}
          ariaLabel={`Predicted distribution. The true token ${VOCAB[trueIndex]!.label} has probability ${fmt(pTrue, 3)}.`}
        />
      </section>

      {/* Loss readout */}
      <section
        aria-label="Loss"
        className="rounded-md border border-border bg-bg/40 p-4"
      >
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Cross-entropy loss (this example)
          </div>
          <div className="text-[11px] text-dim font-mono tabular-nums">
            −log p(true)
          </div>
        </div>
        <div className="font-mono text-[1.5rem] tabular-nums text-accent">
          {fmt(loss, 3)}
        </div>
        <p className="mt-2 text-[11px] text-dim leading-relaxed">
          {pTrue >= 0.99
            ? 'Model put essentially all mass on the true token — loss ≈ 0.'
            : pTrue <= 0.001
              ? 'Model put essentially no mass on the true token — loss is very large.'
              : loss < 1
                ? 'Confident-right region: loss is small.'
                : loss < 3
                  ? 'Mild-uncertainty region: loss is moderate.'
                  : 'Confident-wrong region: loss is large.'}
        </p>
      </section>
    </SimFrame>
  );
}
