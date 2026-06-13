'use client';

import { useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';

const D_MODEL = 4;
const D_HIDDEN_VALUES = [4, 8, 16, 32];

function paramCount(dModel: number, dHidden: number): {
  ffn: number;
  total: number;
  ffnFraction: number;
} {
  // Per FFN layer: W1 (d_model × d_hidden) + b1 (d_hidden)
  //               + W2 (d_hidden × d_model) + b2 (d_model)
  // Per attention block: 4 projections of (d_model × d_k) where
  // d_k = d_model / h; for h=4, d_k = d_model/4 → 4 × (d_model ×
  // d_model/4) = d_model². Plus a small output projection. The
  // approximate attention param count is ~4·d_model².
  const ffn = dModel * dHidden + dHidden + dHidden * dModel + dModel;
  // The attention block parameters: 4 × d_model × d_k + d_model × d_model
  // ≈ 4·d_model² (with h=4, d_k = d_model/4). We round it to
  // 4·d_model² + d_model² = 5·d_model² for "attention + output."
  const attention = 5 * dModel * dModel;
  // Plus the layernorms (small, ignored here).
  const total = ffn + attention;
  return { ffn, total, ffnFraction: ffn / total };
}

/**
 * Secondary widget for the feed-forward lesson: a count-the-
 * parameters widget. The reader sees how the FFN parameter
 * count (and its share of the block's total) grows with the
 * expansion factor.
 */
export function FFNParameterCount() {
  const [dModel, setDModel] = useState<number>(D_MODEL);
  // d_hidden is one of {4, 8, 16, 32}; allow 1×, 2×, 4×, 8× of d_model.
  const [dHiddenIdx, setDHiddenIdx] = useState<number>(2); // 16

  const dHidden = D_HIDDEN_VALUES[dHiddenIdx] as number;
  const counts = paramCount(dModel, dHidden);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Where the parameters live
        </h3>
      </div>

      <p className="text-[12px] text-muted font-mono leading-relaxed mb-5">
        Most of a transformer's parameters are in the FFN, not the
        attention. The FFN has 2 × d_model × d_hidden weights (W₁ and W₂);
        the attention block has 4 × d_model² (the four Q/K/V/out
        projections). Drag the sliders to see how the FFN's share
        grows.
      </p>

      <div className="space-y-4 font-mono text-[12px] mb-4">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
              d_model
            </span>
            <span className="text-ink tabular-nums">{dModel}</span>
          </div>
          <Slider
            value={dModel}
            min={4}
            max={32}
            step={2}
            onChange={(v) => setDModel(Math.round(v))}
            formatValue={(v) => String(Math.round(v))}
            ariaLabel="d_model"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
              d_hidden
            </span>
            <span className="text-ink tabular-nums">
              {dHidden} (={dHidden / dModel}× d_model)
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {D_HIDDEN_VALUES.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setDHiddenIdx(i)}
                className={
                  'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border transition-colors ' +
                  (dHiddenIdx === i
                    ? 'border-accent text-accent'
                    : 'border-border text-muted hover:text-ink')
                }
                aria-pressed={dHiddenIdx === i}
              >
                {d / D_MODEL}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <dl className="space-y-1.5 font-mono text-[12px]">
        <div className="flex items-baseline justify-between">
          <dt className="text-dim">FFN params (W₁ + b₁ + W₂ + b₂)</dt>
          <dd className="text-accent tabular-nums">{counts.ffn.toLocaleString()}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-dim">Attention block (≈ 5·d²)</dt>
          <dd className="text-ink tabular-nums">
            {(5 * dModel * dModel).toLocaleString()}
          </dd>
        </div>
        <div className="flex items-baseline justify-between pt-2 border-t border-border">
          <dt className="text-ink">FFN share of the block</dt>
          <dd className="text-accent tabular-nums">
            {(counts.ffnFraction * 100).toFixed(0)}%
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-[10px] text-dim font-mono leading-relaxed">
        At d_model = {dModel} and d_hidden = {dHidden} ({dHidden / dModel}×), the FFN
        is {(counts.ffnFraction * 100).toFixed(0)}% of the block's parameters. In
        real transformers (d_model = 512, 1024, 4096), the FFN is
        typically 60–70% of the model's total parameter count.
      </p>
    </div>
  );
}
