

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  type Beam,
  beamStep,
  makeSeedBeam,
} from '@/lib/math/beam-search';

const MAX_STEPS = 10;

/**
 * Beam-search visualizer. A slider chooses beam width k = 1..5,
 * Play/step controls advance one beam-search step at a time, and
 * the current frontier of beams is rendered as a column of token
 * paths with their log-probability scores. Finished beams (ending
 * in <eos>) are dimmed; the highest-scoring beam is accented.
 */
export function BeamSearchExplorer() {
  const [k, setK] = useState(3);
  const [beams, setBeams] = useState<Beam[]>(() => [makeSeedBeam('the')]);
  const [playing, setPlaying] = useState(false);

  const step = useMemo(
    () => beams.reduce((m, b) => Math.max(m, b.tokens.length - 1), 0),
    [beams],
  );

  const allFinished = beams.every((b) => b.finished);
  const stepsReached = step >= MAX_STEPS;
  const atEnd = allFinished || stepsReached;

  const advance = () => {
    if (atEnd) return;
    setBeams((prev) => beamStep(prev, k));
  };

  const reset = () => {
    setPlaying(false);
    setBeams([makeSeedBeam('the')]);
  };

  // Reset whenever k changes — the beams from a different width
  // are not comparable to the new width's expansion.
  useEffect(() => {
    setPlaying(false);
    setBeams([makeSeedBeam('the')]);
  }, [k]);

  // Auto-advance when playing.
  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => {
      setBeams((prev) => beamStep(prev, k));
    }, 550);
    return () => window.clearTimeout(t);
  }, [playing, beams, atEnd, k]);

  const sorted = [...beams].sort((a, b) => b.logProb - a.logProb);

  return (
    <SimFrame
      title="Beam Search Explorer"
      headerWrap
      headerAction={
        <button
          type="button"
          onClick={reset}
          className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
        >
          Reset
        </button>
      }
    >
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4 items-end mb-5">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label
              htmlFor="beam-k"
              className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
            >
              beam width  k
            </label>
            <span className="font-mono text-[14px] text-accent tabular-nums">
              {k}
            </span>
          </div>
          <input
            id="beam-k"
            type="range"
            min={1}
            max={5}
            step={1}
            value={k}
            onChange={(e) => setK(parseInt(e.target.value, 10))}
            className="w-full accent-[rgb(var(--accent))]"
            aria-valuetext={`${k} beam${k === 1 ? '' : 's'}`}
          />
        </div>
        <button
          type="button"
          onClick={advance}
          disabled={atEnd}
          className={clsx(
            'focus-ring inline-flex items-center justify-center min-h-[40px] px-4 rounded-md text-[13px] font-mono border transition-colors',
            atEnd
              ? 'border-border text-fg-subtle cursor-not-allowed'
              : 'border-border-strong text-ink hover:border-accent hover:text-accent',
          )}
        >
          Step →
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={atEnd}
          className={clsx(
            'focus-ring inline-flex items-center justify-center min-h-[40px] px-4 rounded-md text-[13px] font-mono font-semibold transition-colors',
            atEnd
              ? 'bg-bg-elevated text-fg-subtle cursor-not-allowed'
              : playing
                ? 'bg-bg-elevated text-ink border border-border-strong'
                : 'bg-accent text-accent-fg hover:bg-accent-hover',
          )}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      {/* Step header */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          Step {step} of ≤ {MAX_STEPS}
          {' · '}
          {sorted.length} active beam{sorted.length === 1 ? '' : 's'}
        </div>
        {atEnd && (
          <div className="text-[11px] uppercase tracking-[0.12em] text-accent font-mono">
            {allFinished ? '✓ All beams reached <eos>' : 'Step limit'}
          </div>
        )}
      </div>

      {/* Beams */}
      <ol className="space-y-2">
        {sorted.map((beam, idx) => {
          const isBest = idx === 0;
          return (
            <li key={idx}>
              <div
                className={clsx(
                  'rounded-md border bg-bg/30 px-3 py-2 transition-colors',
                  isBest
                    ? 'border-accent bg-accent-faint'
                    : 'border-border',
                  beam.finished && !isBest && 'opacity-60',
                )}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span
                    className={clsx(
                      'text-[11px] uppercase tracking-[0.12em] font-mono',
                      isBest ? 'text-accent' : 'text-fg-muted',
                    )}
                  >
                    Beam {idx + 1}
                    {beam.finished && ' · done'}
                  </span>
                  <span
                    className={clsx(
                      'font-mono text-[12px] tabular-nums',
                      isBest ? 'text-accent' : 'text-fg-muted',
                    )}
                  >
                    log p = {beam.logProb.toFixed(3)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {beam.tokens.map((tok, i) => (
                    <span
                      key={i}
                      className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded font-mono text-[12px] tabular-nums',
                        tok === '<eos>'
                          ? 'border border-accent/50 text-accent'
                          : i === beam.tokens.length - 1 && !beam.finished
                            ? 'bg-accent text-accent-fg'
                            : 'bg-bg-elevated text-ink border border-border',
                      )}
                    >
                      {tok}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 pt-4 border-t border-border text-[12px] text-fg-muted font-mono leading-relaxed">
        k = 1 is greedy decoding. Greedy from <code>the</code> never
        reaches &lt;eos&gt; on this toy bigram — it loops on the
        higher-probability token at each step. Bump k to 2 and the
        path through <code>mat → &lt;eos&gt;</code> shows up.
      </p>
    </SimFrame>
  );
}
