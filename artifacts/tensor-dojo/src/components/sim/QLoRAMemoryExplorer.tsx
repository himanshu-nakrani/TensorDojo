

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  bytesToGB,
  memoryBreakdown,
  totalBytes,
  type Regime,
} from '@/lib/math/qlora';

const REGIMES: { id: Regime; label: string }[] = [
  { id: 'full', label: 'Full FT' },
  { id: 'lora', label: 'LoRA' },
  { id: 'qlora', label: 'QLoRA' },
  { id: 'inference', label: 'Inference' },
];

const COMPONENT_COLOR = {
  base: 'fill-[rgb(21,128,61)]',      // green (brand)
  adapter: 'fill-[rgb(67,56,202)]',   // indigo
  gradients: 'fill-[rgb(180,83,9)]',  // amber
  optimizer: 'fill-[rgb(220,38,38)]', // red
  activations: 'fill-[rgb(107,114,128)]', // gray
} as const;

type Component = keyof typeof COMPONENT_COLOR;

const COMPONENT_LABEL: Record<Component, string> = {
  base: 'base weights',
  adapter: 'adapter',
  gradients: 'gradients',
  optimizer: 'optimizer (Adam m, v)',
  activations: 'activations',
};

export function QLoRAMemoryExplorer() {
  const [paramsB, setParamsB] = useState(70);
  const [loraRank, setLoraRank] = useState(16);
  const seqLen = 2048;

  const breakdowns = useMemo(
    () =>
      REGIMES.map((r) => ({
        regime: r,
        b: memoryBreakdown(r.id, { paramsB, loraRank, seqLen }),
      })),
    [paramsB, loraRank],
  );

  const maxGB = useMemo(
    () =>
      Math.max(...breakdowns.map(({ b }) => bytesToGB(totalBytes(b))), 1),
    [breakdowns],
  );

  return (
    <SimFrame
      title="Training memory budget"
      onReset={() => {
        setParamsB(70);
        setLoraRank(16);
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Slider
          id="qlora-params"
          label="model size (billions)"
          value={paramsB}
          min={1}
          max={400}
          step={1}
          format={(v) => `${v}B`}
          onChange={setParamsB}
        />
        <Slider
          id="qlora-rank"
          label="LoRA rank"
          value={loraRank}
          min={1}
          max={256}
          step={1}
          format={(v) => String(v)}
          onChange={setLoraRank}
        />
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {breakdowns.map(({ regime, b }) => {
          const totalGB = bytesToGB(totalBytes(b));
          return (
            <RegimeRow
              key={regime.id}
              label={regime.label}
              regime={regime.id}
              breakdown={b}
              totalGB={totalGB}
              maxGB={maxGB}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono text-fg-muted">
        {(Object.keys(COMPONENT_LABEL) as Component[]).map((c) => (
          <div key={c} className="flex items-center gap-1.5">
            <svg width={10} height={10}>
              <rect width={10} height={10} className={COMPONENT_COLOR[c]} fillOpacity={0.85} />
            </svg>
            <span>{COMPONENT_LABEL[c]}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-dim font-mono leading-relaxed">
        Three reductions stack: 4-bit base (4× smaller weights) + LoRA (100× smaller grads/optimizer) + checkpointing (smaller activations). A 70B model goes from ~870 GB to ~58 GB.
      </div>
    </SimFrame>
  );
}

function RegimeRow({
  label,
  regime,
  breakdown,
  totalGB,
  maxGB,
}: {
  label: string;
  regime: Regime;
  breakdown: ReturnType<typeof memoryBreakdown>;
  totalGB: number;
  maxGB: number;
}) {
  const W = 700;
  const H = 36;
  const bytes = totalBytes(breakdown);
  const widthPct = (totalGB / maxGB) * 100;

  // Segments, in display order.
  const segments: { key: Component; bytes: number }[] = [
    { key: 'base', bytes: breakdown.base },
    { key: 'adapter', bytes: breakdown.adapter },
    { key: 'gradients', bytes: breakdown.gradients },
    { key: 'optimizer', bytes: breakdown.optimizer },
    { key: 'activations', bytes: breakdown.activations },
  ];

  let cursor = 0;
  const regimeFitsOn = (regime === 'qlora' && totalGB < 80) || regime === 'inference';

  return (
    <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
      <span className="text-[12px] font-semibold text-ink text-right">
        {label}
      </span>
      <div
        className={clsx(
          'relative h-9 rounded-md border border-border bg-bg/40 overflow-hidden',
        )}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="none"
        >
          {/* Single full-width bar that shows the % of max */}
          <g transform={`scale(${widthPct / 100} 1)`}>
            {segments.map((seg) => {
              if (seg.bytes <= 0) return null;
              const segWidth = (seg.bytes / bytes) * W;
              const x = cursor;
              cursor += segWidth;
              return (
                <rect
                  key={seg.key}
                  x={x}
                  y={0}
                  width={segWidth + 0.5}
                  height={H}
                  className={COMPONENT_COLOR[seg.key]}
                  fillOpacity={0.85}
                />
              );
            })}
          </g>
        </svg>
      </div>
      <span
        className={clsx(
          'text-[12px] font-mono tabular-nums whitespace-nowrap w-24 text-right',
          regimeFitsOn ? 'text-accent' : 'text-fg-muted',
        )}
      >
        {totalGB.toFixed(1)} GB
      </span>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label
          htmlFor={id}
          className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
        >
          {label}
        </label>
        <span className="font-mono text-[14px] text-accent tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-[rgb(var(--accent))]"
      />
    </div>
  );
}
