'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { cacheBytes, generateNaive, generateWithCache } from '@/lib/math/kvcache';

/**
 * Side-by-side total-cost comparison for the KV cache lesson.
 * The slider sweeps sequence length on a log scale (1…2048).
 * Two bars (naive vs cached) show total FLOPs to generate that
 * many tokens. The "Nx faster" readout makes the asymptotic gap
 * concrete: at seq=64 it's a few times; at seq=2048 it's hundreds.
 *
 * A second readout shows the memory cost of the cache itself —
 * the other side of the trade-off, and the reason context length
 * is a meaningful product axis.
 */

const D_MODEL = 4096;       // LLaMA-7B-ish per-head·heads dimension
const N_LAYERS = 32;        // LLaMA-7B layer count
const BYTES_PER_EL = 2;     // fp16/bf16

// Discrete log-spaced sequence lengths, so the slider lands on
// round numbers and the bars don't jitter.
const SEQ_STEPS = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048] as const;
const DEFAULT_INDEX = 6; // 256

type Scale = 'log' | 'linear';

export function KVCacheCostChart() {
  const [seqIndex, setSeqIndex] = useState(DEFAULT_INDEX);
  const [scale, setScale] = useState<Scale>('log');
  const seqLen = SEQ_STEPS[seqIndex]!;

  const { naive, cached, ratio, cacheGB } = useMemo(() => {
    const naive = generateNaive(seqLen, D_MODEL).total;
    const cached = generateWithCache(seqLen, D_MODEL).total;
    const ratio = naive / cached;
    const cacheGB = cacheBytes(seqLen, D_MODEL, N_LAYERS, BYTES_PER_EL) / 1024 ** 3;
    return { naive, cached, ratio, cacheGB };
  }, [seqLen]);

  // Bar widths: in log mode both bars are normalized by log(naive);
  // in linear mode by naive. Log mode makes the polynomial shape
  // visible at small seq lengths; linear mode makes the gap visceral
  // at large ones.
  const naivePct = 100;
  const cachedPct =
    scale === 'log'
      ? (Math.log10(cached) / Math.log10(naive)) * 100
      : (cached / naive) * 100;

  const reset = () => {
    setSeqIndex(DEFAULT_INDEX);
    setScale('log');
  };

  return (
    <SimFrame
      title="Naive vs cached: total generation cost"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {(['log', 'linear'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  scale === s
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {s}
              </button>
            ))}
          </div>
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
      {/* Slider. */}
      <label className="block mb-5">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Sequence length
          </span>
          <span className="text-[11px] font-mono tabular-nums">
            <span className="text-ink">{seqLen.toLocaleString()}</span>
            <span className="text-dim"> tokens</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={SEQ_STEPS.length - 1}
          step={1}
          value={seqIndex}
          onChange={(e) => setSeqIndex(Number(e.target.value))}
          className="w-full focus-ring"
          aria-label="Sequence length"
        />
        <div className="flex justify-between text-[11px] text-dim font-mono mt-1 tabular-nums">
          {SEQ_STEPS.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </label>

      {/* Bars. */}
      <div className="space-y-3 mb-5">
        <Bar
          label="Naive (recompute every step)"
          widthPct={naivePct}
          value={formatBig(naive)}
          variant="naive"
        />
        <Bar
          label="Cached (compute new row only)"
          widthPct={cachedPct}
          value={formatBig(cached)}
          variant="cached"
        />
      </div>

      {/* Headline readouts. */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border font-mono text-[11px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Speedup from cache
          </div>
          <div className="text-accent text-[14px] tabular-nums">
            {ratio.toFixed(ratio < 10 ? 1 : 0)}× faster
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Cache memory (d={D_MODEL}, L={N_LAYERS}, bf16)
          </div>
          <div className="text-ink text-[14px] tabular-nums">
            {cacheGB < 1
              ? `${(cacheGB * 1024).toFixed(1)} MB`
              : `${cacheGB.toFixed(2)} GB`}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        The speedup grows with sequence length — naive scales as{' '}
        <span className="text-ink">O(n³·d)</span> total, cached as{' '}
        <span className="text-ink">O(n²·d)</span>. The cost paid is memory: a
        full cache for 2048 tokens of a 7B-class model is around 1 GB per
        request. That memory budget is what bounds how long the
        model's context window can be.
      </p>
    </SimFrame>
  );
}

function Bar({
  label,
  widthPct,
  value,
  variant,
}: {
  label: string;
  widthPct: number;
  value: string;
  variant: 'naive' | 'cached';
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] font-mono mb-1">
        <span className={variant === 'naive' ? 'text-ink' : 'text-accent'}>
          {label}
        </span>
        <span className="text-dim tabular-nums">{value} FLOPs</span>
      </div>
      <div className="relative h-5 rounded border border-border bg-bg-elevated overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all duration-200',
            variant === 'naive'
              ? 'bg-[rgb(var(--fg)/0.18)]'
              : 'bg-accent-soft border-r border-accent/40',
          )}
          style={{ width: `${Math.max(0.5, widthPct)}%` }}
        />
      </div>
    </div>
  );
}

function formatBig(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}
