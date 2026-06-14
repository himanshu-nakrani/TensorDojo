'use client';

import { useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';

/**
 * Secondary for the dropout lesson: the inference-time
 * scaling story. Two equivalent ways to write dropout.
 *
 *   Naive:        y = mask ⊙ x
 *                 Expected activation:  (1 − p) x
 *                 Inference: no dropout, but the expected
 *                 activation is now x (not (1 − p) x). Mismatch.
 *
 *   Inverted:     y = mask ⊙ x / (1 − p)
 *                 Expected activation:  x
 *                 Inference: no dropout, expected activation x.
 *                 Match.
 *
 * The lesson's main interactive uses inverted dropout (which is
 * what every modern library does). This panel walks through the
 * scaling explicitly so the reader can see why the inversion
 * matters.
 */
export function DropoutInference() {
  const [p, setP] = useState<number>(0.3);
  const invertedScale = p > 0 ? 1 / (1 - p) : 1;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Inverted dropout: the inference scaling
        </h3>
        <div className="text-[10px] text-dim font-mono">
          training (p={p.toFixed(2)}) vs inference (p=0)
        </div>
      </div>

      <div className="space-y-3 font-mono text-[12px]">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
              Training dropout p
            </span>
            <span className="text-ink tabular-nums">{p.toFixed(2)}</span>
          </div>
          <Slider
            value={p}
            min={0}
            max={0.5}
            step={0.05}
            onChange={setP}
            formatValue={(v) => v.toFixed(2)}
            ariaLabel="Training dropout probability"
          />
        </div>

        <div className="pt-3 border-t border-border space-y-1.5 text-[11px]">
          <div className="flex items-baseline justify-between">
            <span className="text-dim">Naive E[y] (training)</span>
            <span className="text-ink tabular-nums">{(1 - p).toFixed(2)} · x</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dim">Naive E[y] (inference, no mask)</span>
            <span className="text-ink tabular-nums">1.00 · x</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dim">Mismatch</span>
            <span className="text-[rgb(var(--negative))] tabular-nums">
              {p > 0 ? `× ${(1 / (1 - p)).toFixed(2)}` : '—'}
            </span>
          </div>

          <div className="h-px bg-border my-2" />

          <div className="flex items-baseline justify-between">
            <span className="text-dim">Inverted scale 1/(1 − p)</span>
            <span className="text-accent tabular-nums">{invertedScale.toFixed(2)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dim">Inverted E[y] (training)</span>
            <span className="text-accent tabular-nums">1.00 · x</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dim">Inverted E[y] (inference, no mask)</span>
            <span className="text-accent tabular-nums">1.00 · x</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dim">Match</span>
            <span className="text-accent tabular-nums">✓</span>
          </div>
        </div>

        <p className="text-[10px] text-fg-subtle font-mono leading-relaxed pt-2">
          The naive form makes training-time activations
          systematically smaller than inference-time. The
          inverted form scales the kept activations up by
          1/(1−p) at training so the expected value matches
          the no-mask case. No rescaling needed at inference.
        </p>
      </div>
    </div>
  );
}
