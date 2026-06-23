'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Centerpiece sim for the KV cache lesson. The user steps through
 * autoregressive generation one token at a time and watches what
 * the K and V matrices look like in each regime:
 *
 *   - "Naive": every step rebuilds the entire matrix (every row
 *     flashes as "recomputed this step")
 *   - "Cache": every step appends one new row; old rows are reused
 *
 * d_model is small (8 cells) so the matrices fit comfortably on
 * one line per token. The colored cells are arbitrary — they show
 * which rows were computed *this step* vs reused. There is no
 * real attention math here; this is a visualization of *work
 * done*, not of values produced.
 */

const PROMPT_TOKENS = ['The', 'cat', 'sat', 'on'] as const;
const GENERATED_TOKENS = ['the', 'mat', '.', 'It', 'was', 'soft', 'and', 'warm'] as const;
const D_MODEL = 8;
const PROMPT_LEN = PROMPT_TOKENS.length;
const MAX_GEN = GENERATED_TOKENS.length;
const MAX_LEN = PROMPT_LEN + MAX_GEN;

type Mode = 'cache' | 'naive';

export function KVCacheBuilder() {
  const [mode, setMode] = useState<Mode>('cache');
  // genStep = 0 means "prompt only, no generation yet."
  const [genStep, setGenStep] = useState(0);

  const seqLen = PROMPT_LEN + genStep;
  const tokens = useMemo(
    () => [...PROMPT_TOKENS, ...GENERATED_TOKENS.slice(0, genStep)],
    [genStep],
  );

  // Which row indices were *computed this step*?
  //   - At step 0 (prompt only): all prompt rows.
  //   - Cached mode, step ≥ 1: only the newest row.
  //   - Naive mode, step ≥ 1: every row.
  const computedThisStep = useMemo(() => {
    if (genStep === 0) {
      // Prompt prefill — both regimes compute every prompt row once.
      return new Set(Array.from({ length: PROMPT_LEN }, (_, i) => i));
    }
    if (mode === 'cache') return new Set([seqLen - 1]);
    return new Set(Array.from({ length: seqLen }, (_, i) => i));
  }, [genStep, mode, seqLen]);

  const reusedFromCache = useMemo(() => {
    if (genStep === 0 || mode === 'naive') return new Set<number>();
    return new Set(Array.from({ length: seqLen - 1 }, (_, i) => i));
  }, [genStep, mode, seqLen]);

  const cellsComputed = computedThisStep.size * D_MODEL;
  const cellsReused = reusedFromCache.size * D_MODEL;

  const reset = () => setGenStep(0);

  return (
    <SimFrame
      title="KV cache: step through generation"
      headerAction={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGenStep((s) => Math.max(0, s - 1))}
            disabled={genStep === 0}
            className="text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border border-border text-muted hover:text-ink focus-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setGenStep((s) => Math.min(MAX_GEN, s + 1))}
            disabled={genStep >= MAX_GEN}
            className="text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border border-accent text-accent hover:text-accent-hover focus-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate next
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
      {/* Mode toggle. */}
      <div className="mb-5 flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          Mode
        </span>
        <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
          {(['cache', 'naive'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={clsx(
                'px-3 py-1 transition-colors focus-ring',
                mode === m
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:text-ink',
              )}
            >
              {m === 'cache' ? 'With cache' : 'Naive recompute'}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-mono text-dim tabular-nums ml-auto">
          step <span className="text-ink">{genStep}</span>
          {' / '}
          <span className="text-ink">{MAX_GEN}</span>
          {' · seq len '}
          <span className="text-ink">{seqLen}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MatrixPanel
          label="K matrix"
          tokens={tokens}
          computedThisStep={computedThisStep}
          reusedFromCache={reusedFromCache}
          seedBase={1}
        />
        <MatrixPanel
          label="V matrix"
          tokens={tokens}
          computedThisStep={computedThisStep}
          reusedFromCache={reusedFromCache}
          seedBase={7}
        />
      </div>

      <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 gap-4 font-mono text-[11px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Computed this step
          </div>
          <div className="text-accent tabular-nums">
            {computedThisStep.size} row{computedThisStep.size === 1 ? '' : 's'}{' '}
            × {D_MODEL} dims = {cellsComputed} cells
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Reused from cache
          </div>
          <div className={clsx('tabular-nums', cellsReused > 0 ? 'text-ink' : 'text-dim')}>
            {reusedFromCache.size} row{reusedFromCache.size === 1 ? '' : 's'}{' '}
            × {D_MODEL} dims = {cellsReused} cells
          </div>
        </div>
      </div>

      {genStep === 0 && (
        <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
          Prompt has been encoded. Press{' '}
          <span className="text-accent">Generate next</span> to produce one new
          token. Watch what changes in each mode.
        </p>
      )}
      {genStep > 0 && mode === 'cache' && (
        <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
          Only the newest row was computed; every earlier row was looked up
          from the cache. Per-step work is{' '}
          <span className="text-ink">constant in sequence length</span> (the
          attention dot product still scans the full cache, but the
          projection — the dominant cost — is constant).
        </p>
      )}
      {genStep > 0 && mode === 'naive' && (
        <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
          The whole matrix was rebuilt from scratch. Per-step work grows{' '}
          <span className="text-ink">linearly</span> with sequence length, and
          total generation cost is one polynomial degree higher than the
          cached version.
        </p>
      )}
    </SimFrame>
  );
}

function MatrixPanel({
  label,
  tokens,
  computedThisStep,
  reusedFromCache,
  seedBase,
}: {
  label: string;
  tokens: readonly string[];
  computedThisStep: ReadonlySet<number>;
  reusedFromCache: ReadonlySet<number>;
  seedBase: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          {label}
        </div>
        <div className="text-[11px] text-dim font-mono tabular-nums">
          {tokens.length} × {D_MODEL}
        </div>
      </div>
      <div className="space-y-1 font-mono text-[11px]">
        {tokens.map((tok, ti) => {
          const isComputed = computedThisStep.has(ti);
          const isReused = reusedFromCache.has(ti);
          return (
            <div key={ti} className="flex items-center gap-2">
              <span
                className={clsx(
                  'w-12 shrink-0 text-right',
                  ti < PROMPT_LEN ? 'text-dim italic' : 'text-ink',
                )}
              >
                {tok}
              </span>
              <span className="flex gap-0.5">
                {Array.from({ length: D_MODEL }).map((_, di) => {
                  // Deterministic per-(token, dim) shade so the matrix
                  // looks like *data*, not stripes.
                  const v = pseudo(ti * 31 + di * 7 + seedBase);
                  const alpha = isComputed
                    ? 0.25 + v * 0.6
                    : isReused
                      ? 0.08 + v * 0.18
                      : 0.04 + v * 0.1;
                  const colorVar = isComputed ? '--accent' : '--fg';
                  const bg = `rgb(var(${colorVar}) / ${alpha})`;
                  return (
                    <span
                      key={di}
                      className={clsx(
                        'inline-block w-4 h-4 rounded-sm border',
                        isComputed
                          ? 'border-accent/60'
                          : 'border-border',
                      )}
                      style={{ backgroundColor: bg }}
                      aria-hidden
                    />
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tiny deterministic hash → [0, 1). */
function pseudo(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
