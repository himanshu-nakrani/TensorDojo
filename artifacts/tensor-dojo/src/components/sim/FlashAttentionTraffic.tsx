

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  attentionMemoryFlash,
  attentionMemoryNaive,
  SRAM_BUDGET_BYTES,
  speedupRatio,
} from '@/lib/math/flashattn';

/**
 * Centerpiece sim for the flash-attention lesson. Slider for
 * sequence length (log-scaled); bars compare naive vs flash
 * HBM traffic. As n grows, naive's traffic explodes (it scales
 * as n²); flash's grows linearly. The headline "speedup" is the
 * ratio of the two.
 */

const SEQ_STEPS = [256, 512, 1024, 2048, 4096, 8192, 16384] as const;
const D_HEAD = 128;
const BLOCK_SIZE = 64;
const DEFAULT_INDEX = 4; // 4096

export function FlashAttentionTraffic() {
  const [seqIndex, setSeqIndex] = useState<number>(DEFAULT_INDEX);
  const seqLen = SEQ_STEPS[seqIndex]!;

  const { naive, flash, speedup } = useMemo(() => {
    const n = attentionMemoryNaive(seqLen, D_HEAD);
    const f = attentionMemoryFlash(seqLen, D_HEAD, BLOCK_SIZE);
    const s = speedupRatio(seqLen, D_HEAD, BLOCK_SIZE);
    return { naive: n, flash: f, speedup: s };
  }, [seqLen]);

  // Bar normalization: log-scaled, so the n=8192 bar fits on screen.
  const logNaive = Math.log10(naive.hbmTotal);
  const logFlash = Math.log10(flash.hbmTotal);
  const refLog = logNaive; // longest bar
  const naivePct = 100;
  const flashPct = (logFlash / refLog) * 100;

  const reset = () => setSeqIndex(DEFAULT_INDEX);

  return (
    <SimFrame
      title="HBM traffic: naive vs flash attention"
      onReset={reset}
    >
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

      <div className="space-y-3 mb-5">
        <TrafficBar
          label="Naive (materializes n² score matrix)"
          widthPct={naivePct}
          value={formatBytes(naive.hbmTotal)}
          variant="naive"
          warn={!naive.fitsInSram}
          warnText={`peak SRAM ${formatBytes(naive.sramPeak)} ≫ ${formatBytes(SRAM_BUDGET_BYTES)} budget`}
        />
        <TrafficBar
          label={`Flash (tile size ${BLOCK_SIZE})`}
          widthPct={flashPct}
          value={formatBytes(flash.hbmTotal)}
          variant="flash"
          warn={!flash.fitsInSram}
          warnText={`peak SRAM ${formatBytes(flash.sramPeak)} — over budget`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border font-mono text-[11px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            HBM traffic ratio
          </div>
          <div className="text-accent text-[14px] tabular-nums">
            {speedup.toFixed(speedup < 10 ? 1 : 0)}× less
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Naive peak SRAM (n² scores)
          </div>
          <div className={clsx('text-[14px] tabular-nums', naive.fitsInSram ? 'text-ink' : 'text-[rgb(var(--negative))]')}>
            {formatBytes(naive.sramPeak)}
            {!naive.fitsInSram && ' (overflows)'}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Same attention math, different memory pattern. Naive writes the n×n
        score matrix to HBM (slow, far off-chip) and reads it back; flash
        keeps the same scores inside SRAM (fast, on-chip) by computing
        attention block by block with a running softmax. The bars use a log
        scale, so equal pixel-width is a 10× ratio — the actual gap grows as
        n²/n = n.
      </p>
    </SimFrame>
  );
}

function TrafficBar({
  label,
  widthPct,
  value,
  variant,
  warn,
  warnText,
}: {
  label: string;
  widthPct: number;
  value: string;
  variant: 'naive' | 'flash';
  warn: boolean;
  warnText: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] font-mono mb-1">
        <span className={variant === 'naive' ? 'text-ink' : 'text-accent'}>{label}</span>
        <span className="text-dim tabular-nums">{value}</span>
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
      {warn && (
        <div className="mt-1 text-[11px] text-[rgb(var(--negative))] font-mono">
          {warnText}
        </div>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
