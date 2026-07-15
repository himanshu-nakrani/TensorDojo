'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { activeFlopsRatio, totalParamsRatio } from '@/lib/math/moe';

/**
 * Secondary sim for the MoE lesson. Side-by-side bars for
 * total FFN parameter count vs active FLOPs per token, across
 * four real architectures. The point: MoE decouples params
 * from compute. Mixtral-8x7B has 8× the params of a dense
 * baseline but runs at the cost of a top-2-of-8 = 2-expert
 * forward pass.
 */

const CONFIGS = [
  { label: 'Dense (LLaMA-style)', nExperts: 1, topK: 1 },
  { label: 'MoE-8 (Mixtral 8×7B)', nExperts: 8, topK: 2 },
  { label: 'MoE-16 (DBRX)', nExperts: 16, topK: 4 },
  { label: 'MoE-64 (Switch Transformer)', nExperts: 64, topK: 1 },
] as const;

export function MoECostBars() {
  const [selectedIdx, setSelectedIdx] = useState(1);

  const maxParams = Math.max(...CONFIGS.map((c) => totalParamsRatio(c.nExperts)));

  const reset = () => setSelectedIdx(1);

  return (
    <SimFrame
      title="Total params vs active compute"
      onReset={reset}
    >
      <div className="space-y-4">
        {CONFIGS.map((cfg, i) => {
          const params = totalParamsRatio(cfg.nExperts);
          const active = activeFlopsRatio(cfg.nExperts, cfg.topK);
          const paramsPct = (params / maxParams) * 100;
          const activePct = (active * params / maxParams) * 100;
          return (
            <button
              key={cfg.label}
              type="button"
              onClick={() => setSelectedIdx(i)}
              className={clsx(
                'block w-full text-left rounded p-3 transition-colors focus-ring',
                selectedIdx === i
                  ? 'bg-accent-soft border border-accent/40'
                  : 'bg-surface border border-border hover:border-border-strong',
              )}
            >
              <div className="flex items-baseline justify-between mb-2 font-mono text-[11px]">
                <span className={selectedIdx === i ? 'text-accent' : 'text-ink'}>
                  {cfg.label}
                </span>
                <span className="text-dim tabular-nums">
                  top-{cfg.topK} of {cfg.nExperts}
                </span>
              </div>
              <div className="space-y-1.5">
                <BarRow
                  label="Total FFN params"
                  widthPct={paramsPct}
                  value={`${params}×`}
                  variant="muted"
                />
                <BarRow
                  label="Active FLOPs per token"
                  widthPct={activePct}
                  value={`${(active * params).toFixed(1)}×`}
                  variant="accent"
                />
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Both bars are relative to a single-expert dense FFN.{' '}
        <span className="text-ink">Total params</span> grows linearly with the
        number of experts;{' '}
        <span className="text-accent">active compute</span> grows only with
        top-k. Mixtral-8×7B (8 experts, top-2) costs the FLOPs of a
        2-expert dense model — about 13B active out of 47B total. Switch
        Transformer's top-1 of 64 is the extreme: 64× the parameters at
        almost dense-1 compute, with much harder load-balancing to manage.
      </p>
    </SimFrame>
  );
}

function BarRow({
  label,
  widthPct,
  value,
  variant,
}: {
  label: string;
  widthPct: number;
  value: string;
  variant: 'muted' | 'accent';
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] font-mono mb-0.5">
        <span className={variant === 'muted' ? 'text-dim' : 'text-accent'}>{label}</span>
        <span className="text-dim tabular-nums">{value}</span>
      </div>
      <div className="relative h-3 rounded border border-border bg-bg-elevated overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all duration-200',
            variant === 'muted'
              ? 'bg-[rgb(var(--fg)/0.18)]'
              : 'bg-accent-soft border-r border-accent/40',
          )}
          style={{ width: `${Math.max(0.5, widthPct)}%` }}
        />
      </div>
    </div>
  );
}
