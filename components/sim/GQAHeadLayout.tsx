'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { cacheBytesTotal, kvHeadFor } from '@/lib/math/gqa';

/**
 * Centerpiece sim for the GQA lesson. Shows 8 query heads as
 * boxes on top, the chosen number of KV heads as boxes on the
 * bottom, and lines from each query head to its shared KV head.
 * The cache-cost panel on the right shows the per-request memory
 * for the current mode, side by side with MHA for reference.
 *
 * Default is GQA-4 (two KV heads), the LLaMA-2 70B configuration
 * rounded down to fit eight query heads on screen.
 */

const N_QUERY_HEADS = 8;
const PRESETS = [
  { label: 'MHA', nKvHeads: 8, group: 1 },
  { label: 'GQA-2', nKvHeads: 4, group: 2 },
  { label: 'GQA-4', nKvHeads: 2, group: 4 },
  { label: 'MQA', nKvHeads: 1, group: 8 },
] as const;
type Preset = (typeof PRESETS)[number];
const DEFAULT_PRESET: Preset = PRESETS[2]!; // GQA-4

// Fixed model knobs for the cache-cost comparison. LLaMA-2 7B-ish.
const SEQ_LEN = 4096;
const D_HEAD = 128;
const N_LAYERS = 32;
const BYTES_PER_EL = 2;

export function GQAHeadLayout() {
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const reset = () => setPreset(DEFAULT_PRESET);

  // Connection list: each query head's KV head index, for line drawing.
  const connections = useMemo(
    () =>
      Array.from({ length: N_QUERY_HEADS }, (_, q) => ({
        q,
        kv: kvHeadFor(q, N_QUERY_HEADS, preset.nKvHeads),
      })),
    [preset.nKvHeads],
  );

  const cacheCurrent = cacheBytesTotal(
    SEQ_LEN,
    D_HEAD,
    preset.nKvHeads,
    N_LAYERS,
    BYTES_PER_EL,
  );
  const cacheMHA = cacheBytesTotal(
    SEQ_LEN,
    D_HEAD,
    N_QUERY_HEADS,
    N_LAYERS,
    BYTES_PER_EL,
  );
  const ratio = cacheMHA / cacheCurrent;

  return (
    <SimFrame
      title="Query heads, KV heads, and the cache they share"
      onReset={reset}
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPreset(p)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  preset.label === p.label
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6">
        <HeadDiagram
          nQueryHeads={N_QUERY_HEADS}
          nKvHeads={preset.nKvHeads}
          connections={connections}
        />
        <CacheComparison
          presetLabel={preset.label}
          cacheCurrent={cacheCurrent}
          cacheMHA={cacheMHA}
          ratio={ratio}
        />
      </div>

      <p className="mt-5 pt-4 border-t border-border text-[11px] text-dim font-mono leading-relaxed">
        Every query head still gets its own query projection — the model
        retains <span className="text-ink">{N_QUERY_HEADS}</span> independent
        "questions." What shrinks is the K and V pool. With{' '}
        <span className="text-ink">{preset.nKvHeads}</span> KV head
        {preset.nKvHeads === 1 ? '' : 's'} across{' '}
        <span className="text-ink">{N_QUERY_HEADS}</span> query heads, the
        cache is{' '}
        <span className="text-accent">{ratio.toFixed(0)}×</span> smaller than
        vanilla MHA — the same factor by which the lines bundle together above.
      </p>
    </SimFrame>
  );
}

function HeadDiagram({
  nQueryHeads,
  nKvHeads,
  connections,
}: {
  nQueryHeads: number;
  nKvHeads: number;
  connections: ReadonlyArray<{ q: number; kv: number }>;
}) {
  // SVG geometry. Width is fluid via viewBox; height is fixed.
  const W = 560;
  const H = 220;
  const PAD_X = 24;
  const Q_Y = 36;
  const KV_Y = H - 36;
  const Q_W = (W - 2 * PAD_X) / nQueryHeads;
  const KV_W = (W - 2 * PAD_X) / nKvHeads;
  const BOX_W = Math.min(Q_W, KV_W) * 0.7;
  const Q_BOX_H = 32;
  const KV_BOX_H = 32;

  const qCx = (i: number) => PAD_X + (i + 0.5) * Q_W;
  const kvCx = (i: number) => PAD_X + (i + 0.5) * KV_W;

  return (
    <div className="border border-border rounded p-2 bg-surface">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Lines: drawn first so boxes sit on top */}
        <g>
          {connections.map(({ q, kv }) => (
            <line
              key={`l-${q}`}
              x1={qCx(q)}
              y1={Q_Y + Q_BOX_H / 2}
              x2={kvCx(kv)}
              y2={KV_Y - KV_BOX_H / 2}
              stroke="rgb(var(--accent) / 0.55)"
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {/* Query head boxes */}
        {Array.from({ length: nQueryHeads }, (_, i) => (
          <g key={`q-${i}`}>
            <rect
              x={qCx(i) - BOX_W / 2}
              y={Q_Y - Q_BOX_H / 2}
              width={BOX_W}
              height={Q_BOX_H}
              rx={3}
              fill="rgb(var(--bg-elevated))"
              stroke="rgb(var(--accent))"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={qCx(i)}
              y={Q_Y + 4}
              textAnchor="middle"
              fontSize={11}
              className="fill-ink font-mono"
            >
              Q{i}
            </text>
          </g>
        ))}

        {/* KV head boxes */}
        {Array.from({ length: nKvHeads }, (_, i) => (
          <g key={`kv-${i}`}>
            <rect
              x={kvCx(i) - BOX_W / 2}
              y={KV_Y - KV_BOX_H / 2}
              width={BOX_W}
              height={KV_BOX_H}
              rx={3}
              fill="rgb(var(--accent) / 0.18)"
              stroke="rgb(var(--accent))"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={kvCx(i)}
              y={KV_Y + 4}
              textAnchor="middle"
              fontSize={11}
              className="fill-ink font-mono"
            >
              KV{i}
            </text>
          </g>
        ))}

        {/* Row labels */}
        <text
          x={PAD_X - 4}
          y={Q_Y + 4}
          textAnchor="end"
          fontSize={9}
          className="fill-dim font-mono uppercase tracking-[0.2em]"
        >
          Q
        </text>
        <text
          x={PAD_X - 4}
          y={KV_Y + 4}
          textAnchor="end"
          fontSize={9}
          className="fill-dim font-mono uppercase tracking-[0.2em]"
        >
          KV
        </text>
      </svg>
    </div>
  );
}

function CacheComparison({
  presetLabel,
  cacheCurrent,
  cacheMHA,
  ratio,
}: {
  presetLabel: string;
  cacheCurrent: number;
  cacheMHA: number;
  ratio: number;
}) {
  // Bar lengths: normalize against MHA so MHA is always 100%.
  const currentPct = (cacheCurrent / cacheMHA) * 100;

  return (
    <div className="border border-border rounded p-4 bg-surface">
      <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
        Per-request KV cache (seq={SEQ_LEN.toLocaleString()}, d
        <sub>head</sub>={D_HEAD}, L={N_LAYERS}, bf16)
      </div>

      <div className="space-y-3">
        <CacheBar
          label="MHA (vanilla)"
          widthPct={100}
          value={formatBytes(cacheMHA)}
          variant="muted"
        />
        <CacheBar
          label={presetLabel}
          widthPct={currentPct}
          value={formatBytes(cacheCurrent)}
          variant="accent"
        />
      </div>

      <div className="mt-4 pt-3 border-t border-border font-mono text-[11px]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim mb-1">
          Cache shrinkage vs MHA
        </div>
        <div className="text-accent text-[14px] tabular-nums">
          {ratio === 1 ? '1× (no change)' : `${ratio.toFixed(0)}× smaller`}
        </div>
      </div>
    </div>
  );
}

function CacheBar({
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
      <div className="flex items-baseline justify-between text-[11px] font-mono mb-1">
        <span className={variant === 'muted' ? 'text-dim' : 'text-accent'}>
          {label}
        </span>
        <span className="text-dim tabular-nums">{value}</span>
      </div>
      <div className="relative h-5 rounded border border-border bg-bg-elevated overflow-hidden">
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

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
