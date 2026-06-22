'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  attendedCount,
  effectiveReceptiveField,
} from '@/lib/math/sliding-window';

/**
 * Side-by-side causal vs sliding-window mask. Two square grids of
 * cells, accent-filled when the (i, j) pair is attended.
 *
 * The reading order: rows = query position i, columns = key position
 * j. We render a single labeled triangle for the full causal mask
 * and a band for the sliding-window mask, with cell counts and the
 * effective receptive field shown below.
 */
export function SlidingWindowExplorer() {
  const [n, setN] = useState(48);
  const [w, setW] = useState(8);
  const [L, setL] = useState(8);

  const fullCount = useMemo(() => attendedCount(n, 'full', w), [n, w]);
  const slidingCount = useMemo(
    () => attendedCount(n, 'sliding', w),
    [n, w],
  );
  const erf = useMemo(() => effectiveReceptiveField(L, w, n), [L, w, n]);
  const ratio = fullCount / Math.max(1, slidingCount);

  return (
    <SimFrame
      title="Causal vs sliding-window attention mask"
      onReset={() => {
        setN(48);
        setW(8);
        setL(8);
      }}
    >
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Slider
          id="sw-n"
          label="context length n"
          value={n}
          min={8}
          max={128}
          step={1}
          format={(v) => String(v)}
          onChange={setN}
        />
        <Slider
          id="sw-w"
          label="window size w"
          value={w}
          min={1}
          max={64}
          step={1}
          format={(v) => String(v)}
          onChange={setW}
        />
        <Slider
          id="sw-L"
          label="layers L (for receptive field)"
          value={L}
          min={1}
          max={32}
          step={1}
          format={(v) => String(v)}
          onChange={setL}
        />
      </div>

      {/* Two masks side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MaskPanel
          title="Full causal"
          subtitle={`${fullCount.toLocaleString()} attended pairs`}
          n={n}
          w={w}
          kind="full"
        />
        <MaskPanel
          title={`Sliding window (w = ${w})`}
          subtitle={`${slidingCount.toLocaleString()} pairs · ${ratio.toFixed(1)}× cheaper`}
          n={n}
          w={w}
          kind="sliding"
        />
      </div>

      {/* Receptive field readout */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="per-layer cost" value={`O(n × w) = ${(n * (w + 1)).toLocaleString()}`} />
        <Stat label="effective receptive field" value={`${erf.toLocaleString()} tokens`} />
        <Stat
          label="full-attn cost"
          value={`O(n²) = ${(n * n).toLocaleString()}`}
        />
      </div>

      <p className="mt-3 text-[11px] text-dim font-mono leading-relaxed">
        At fixed w, doubling n doubles sliding-window cost but quadruples full-attention cost.
        The receptive field of L · w grows with depth, so distant tokens still influence the output indirectly.
      </p>
    </SimFrame>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-bg/40 px-3 py-2 flex items-baseline justify-between">
      <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
        {label}
      </span>
      <span className="text-[12px] font-mono text-accent tabular-nums">
        {value}
      </span>
    </div>
  );
}

function MaskPanel({
  title,
  subtitle,
  n,
  w,
  kind,
}: {
  title: string;
  subtitle: string;
  n: number;
  w: number;
  kind: 'full' | 'sliding';
}) {
  const size = 260;
  const cell = size / n;

  // Render the mask as a polygon (faster than n² rects).
  // For full: the lower triangle.
  // For sliding: the band of width w + 1 along the diagonal.
  const path = useMemo(() => {
    if (kind === 'full') {
      // Triangle: (0,0) -> (0,n) -> (n,n) -> close.
      // In SVG, top-left = (0, 0). Row i is y in [i*cell, (i+1)*cell].
      return `M 0 0 L 0 ${size} L ${size} ${size} Z`;
    }
    // Band path: outer boundary is the lower-triangle hypotenuse,
    // inner boundary is the line j = i - w - 0.5 (clipped at 0).
    // Build a polygon row by row.
    let d = '';
    for (let i = 0; i < n; i += 1) {
      const y = i * cell;
      const yEnd = (i + 1) * cell;
      const xRight = Math.min(n, i + 1) * cell;
      const xLeft = Math.max(0, i - w) * cell;
      d += `M ${xLeft} ${y} L ${xRight} ${y} L ${xRight} ${yEnd} L ${xLeft} ${yEnd} Z `;
    }
    return d;
  }, [kind, n, w, cell, size]);

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <span className="text-[11px] font-mono text-fg-muted">{subtitle}</span>
      </div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        className="block h-auto"
        aria-label={`${title} mask`}
      >
        {/* Background */}
        <rect width={size} height={size} className="fill-border" fillOpacity={0.15} />
        {/* Attended region */}
        <path d={path} className="fill-[rgb(var(--accent))]" fillOpacity={0.6} />
        {/* Diagonal hint */}
        <line
          x1={0}
          y1={0}
          x2={size}
          y2={size}
          className="stroke-border-strong"
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
        {/* Axis labels */}
        <text
          x={size / 2}
          y={-3}
          textAnchor="middle"
          fontSize={9}
          fontFamily="monospace"
          className="fill-fg-subtle"
        >
          key position j →
        </text>
      </svg>
      <div className="mt-1 text-[10px] font-mono text-fg-subtle text-center">
        rows: query i  ·  shaded cells = attended
      </div>
    </div>
  );
}

