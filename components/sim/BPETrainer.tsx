'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { EOW, learnBPE, type BPEStep } from '@/lib/math/bpe';

/**
 * A small hand-picked corpus: enough words to make BPE produce
 * meaningful subword merges, small enough to render the per-word
 * state inline as the user steps through.
 */
const DEFAULT_CORPUS: readonly string[] = [
  'low low low low low',
  'lower lower newer newer',
  'newest newest widest widest',
  'wider wider lowest',
];
const MAX_MERGES = 16;

interface CorpusPreset {
  corpus?: readonly string[];
  maxMerges?: number;
}

export function BPETrainer({ preset }: { preset?: CorpusPreset }) {
  const corpus = preset?.corpus ?? DEFAULT_CORPUS;
  const maxMerges = preset?.maxMerges ?? MAX_MERGES;
  const [step, setStep] = useState(0);

  // Pre-compute the full training run once; the slider just indexes
  // into the history. Cheap for this corpus size.
  const training = useMemo(() => learnBPE(corpus, maxMerges), [corpus, maxMerges]);
  const totalSteps = training.history.length;

  // Word-state at the current step: initialWords if step=0, else
  // wordHistory[step-1].
  const wordsNow = step === 0 ? training.initialWords : training.wordHistory[step - 1]!;
  const vocabNow =
    step === 0
      ? Array.from(new Set(training.initialWords.flat())).sort()
      : training.history[step - 1]!.vocabAfter;

  // The merge that JUST happened (so we can highlight it in vocab + words).
  const currentMerge = step === 0 ? null : training.history[step - 1]!;

  const reset = () => setStep(0);

  return (
    <SimFrame
      title="Step BPE merges · watch the vocabulary grow"
      headerAction={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border border-border text-muted hover:text-ink focus-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
            disabled={step >= totalSteps}
            className="text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border border-accent text-accent hover:text-accent-hover focus-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Step
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        {/* Left: per-word symbol state. */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
              Corpus (split into symbols)
            </div>
            <div className="text-[11px] text-dim font-mono tabular-nums">
              step <span className="text-ink">{step}</span>
              {' / '}
              <span className="text-ink">{totalSteps}</span>
            </div>
          </div>
          <div className="space-y-1.5 font-mono text-[12px]">
            {wordsNow.map((word, wi) => {
              const original = training.initialWords[wi]!.join('').replace(EOW, '');
              return (
                <div key={wi} className="flex items-baseline gap-3">
                  <span className="text-dim w-16 shrink-0 text-right">
                    {original}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {word.map((sym, si) => {
                      const isNew = currentMerge && sym === currentMerge.merge.merged;
                      return (
                        <span
                          key={si}
                          className={clsx(
                            'px-1.5 py-0.5 rounded border',
                            isNew
                              ? 'border-accent text-accent bg-accent-soft'
                              : 'border-border text-ink bg-bg-elevated',
                          )}
                        >
                          {displaySym(sym)}
                        </span>
                      );
                    })}
                  </span>
                </div>
              );
            })}
          </div>
          {currentMerge && (
            <div className="mt-4 pt-3 border-t border-border text-[11px] font-mono text-dim">
              Step {currentMerge.step}: merged{' '}
              <span className="text-ink">{displaySym(currentMerge.merge.a)}</span>{' '}
              +{' '}
              <span className="text-ink">{displaySym(currentMerge.merge.b)}</span>{' '}
              → <span className="text-accent">{displaySym(currentMerge.merge.merged)}</span>
              {' '}(appeared <span className="text-ink tabular-nums">{currentMerge.frequency}</span> times)
            </div>
          )}
          {step === 0 && (
            <p className="mt-4 pt-3 border-t border-border text-[11px] text-dim font-mono leading-relaxed">
              Each word starts as its individual characters, with{' '}
              <span className="text-ink">{EOW}</span> marking the end of a word.
              Press <span className="text-accent">Step</span> to merge the most
              frequent adjacent pair across the corpus.
            </p>
          )}
        </div>

        {/* Right: vocabulary list. */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
              Vocabulary
            </div>
            <div className="text-[11px] text-dim font-mono tabular-nums">
              <span className="text-ink">{vocabNow.length}</span> tokens
            </div>
          </div>
          <div className="flex flex-wrap gap-1 font-mono text-[12px]">
            {vocabNow.map((sym, i) => {
              const isNew = currentMerge && sym === currentMerge.merge.merged;
              return (
                <span
                  key={i}
                  className={clsx(
                    'px-1.5 py-0.5 rounded border',
                    isNew
                      ? 'border-accent text-accent bg-accent-soft'
                      : 'border-border text-ink bg-bg-elevated',
                  )}
                >
                  {displaySym(sym)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </SimFrame>
  );
}

/**
 * Display a symbol with its EOW marker preserved visually. We keep
 * the ▁ glyph inline — the lesson explicitly teaches what it means.
 */
function displaySym(s: string): string {
  return s;
}
