

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { checkpointStats, sqrtNAnchors } from '@/lib/math/checkpoint';

/**
 * Visualize gradient checkpointing as a tradeoff between activation
 * memory (saved checkpoints + chunk recompute buffer) and total
 * compute (forward + backward + re-forward).
 *
 * The user picks a layer count N and the anchor count K. When K = N
 * we are in baseline mode (every layer saved). When K = sqrt(N) we
 * are at the canonical checkpointing operating point.
 */
export function CheckpointExplorer() {
  const [N, setN] = useState(24);
  const [on, setOn] = useState(true);

  const K = on ? sqrtNAnchors(N) : N;
  const stats = useMemo(() => checkpointStats(N, K), [N, K]);
  const baseline = useMemo(() => checkpointStats(N, N), [N]);

  const memRatio = stats.peakMem / baseline.peakMem;
  const computeRatio = stats.totalFlops / baseline.totalFlops;
  const computeOverhead = (computeRatio - 1) * 100;

  return (
    <SimFrame
      title="Gradient checkpointing: memory vs compute"
      headerWrap
      headerAction={
        <button
          type="button"
          onClick={() => setOn((s) => !s)}
          aria-pressed={on}
          className={clsx(
            'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
            on
              ? 'border-accent text-accent bg-accent-soft'
              : 'border-border text-muted hover:text-ink hover:border-border-strong',
          )}
        >
          Checkpointing: {on ? 'on' : 'off'}
        </button>
      }
    >
      {/* Depth slider */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <label
            htmlFor="ckpt-N"
            className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
          >
            stack depth N
          </label>
          <span className="font-mono text-[14px] text-accent tabular-nums">
            {N} layers · {K} anchor{K === 1 ? '' : 's'}
          </span>
        </div>
        <input
          id="ckpt-N"
          type="range"
          min={4}
          max={120}
          step={1}
          value={N}
          onChange={(e) => setN(parseInt(e.target.value, 10))}
          className="w-full accent-[rgb(var(--accent))]"
        />
      </div>

      {/* Layer strip showing anchors */}
      <LayerStrip N={N} K={K} on={on} />

      {/* Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <Bar
          label="peak activation memory"
          value={stats.peakMem}
          baseline={baseline.peakMem}
          tone="good"
        />
        <Bar
          label="total compute (fwd + bwd)"
          value={stats.totalFlops}
          baseline={baseline.totalFlops}
          tone="bad"
        />
      </div>

      {/* Headline numbers */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-mono">
        <Stat
          label="memory vs baseline"
          value={`${(memRatio * 100).toFixed(0)}%`}
          tone="accent"
        />
        <Stat
          label="compute overhead"
          value={
            computeOverhead === 0
              ? '+0%'
              : `+${computeOverhead.toFixed(0)}%`
          }
          tone={computeOverhead > 0 ? 'amber' : 'muted'}
        />
      </div>

      <p className="mt-3 text-[11px] text-dim font-mono leading-relaxed">
        With checkpointing on, anchors live for the full step; non-anchor activations are recomputed on demand during backward.
        Memory scales like √N; compute pays roughly +33% overhead.
      </p>
    </SimFrame>
  );
}

function LayerStrip({ N, K, on }: { N: number; K: number; on: boolean }) {
  const W = 700;
  const H = 36;
  const PAD = 2;
  const cellW = (W - PAD * 2) / N;

  const anchorEvery = Math.max(1, Math.ceil(N / K));
  const isAnchor = (i: number) =>
    !on || i === 0 || i === N - 1 || i % anchorEvery === 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
      {Array.from({ length: N }, (_, i) => {
        const x = PAD + i * cellW;
        const w = Math.max(1, cellW - 1);
        const anchor = isAnchor(i);
        return (
          <rect
            key={i}
            x={x}
            y={6}
            width={w}
            height={H - 12}
            className={
              anchor
                ? 'fill-[rgb(var(--accent))]'
                : 'fill-fg-subtle'
            }
            fillOpacity={anchor ? 0.85 : 0.25}
          />
        );
      })}
    </svg>
  );
}

function Bar({
  label,
  value,
  baseline,
  tone,
}: {
  label: string;
  value: number;
  baseline: number;
  tone: 'good' | 'bad';
}) {
  const W = 320;
  const H = 18;
  const max = Math.max(value, baseline, 1);
  const valuePct = (value / max) * 100;
  const baselinePct = (baseline / max) * 100;

  // Good = lower is better (memory), Bad = lower is better but extra compute is OK.
  // Both render the value bar in accent and the baseline as a faint outline.
  return (
    <div className="rounded-md border border-border bg-bg/40 px-3 py-2">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          {label}
        </span>
        <span className="text-[11px] font-mono text-accent tabular-nums">
          {value.toFixed(0)} units
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
        {/* Baseline outline */}
        <rect
          x={0}
          y={2}
          width={(baselinePct / 100) * W}
          height={H - 4}
          fill="none"
          className="stroke-border-strong"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        <rect
          x={0}
          y={2}
          width={(valuePct / 100) * W}
          height={H - 4}
          className={
            tone === 'good'
              ? 'fill-[rgb(var(--accent))]'
              : 'fill-warning'
          }
          fillOpacity={0.75}
        />
      </svg>
      <div className="mt-1 text-[10px] font-mono text-fg-subtle">
        baseline (dashed): {baseline.toFixed(0)} units
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'accent' | 'amber' | 'muted';
}) {
  const color =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'amber'
        ? 'text-warning'
        : 'text-fg-muted';
  return (
    <div className="rounded-md border border-border bg-bg/40 px-3 py-2 flex items-baseline justify-between">
      <span className="text-dim">{label}</span>
      <span className={`tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
