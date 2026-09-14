'use client';

import { useMemo, useState } from 'react';
import { Readout } from '@/components/ui/Readout';
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
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <span className="font-mono text-micro uppercase tracking-[0.14em] text-dim">
          Causal vs sliding-window mask
        </span>
        <button
          type="button"
          onClick={() => {
            setN(48);
            setW(8);
            setL(8);
          }}
          className="text-label uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Slider
          id="sw-n"
          label="n"
          ariaLabel="Context length n"
          value={n}
          min={8}
          max={128}
          step={1}
          onChange={setN}
        />
        <Slider
          id="sw-w"
          label="w"
          ariaLabel="Window size w"
          value={w}
          min={1}
          max={64}
          step={1}
          onChange={setW}
        />
        <Slider
          id="sw-L"
          label="L"
          ariaLabel="Layers L for receptive field"
          value={L}
          min={1}
          max={32}
          step={1}
          onChange={setL}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MaskPanel
          title="Full causal"
          subtitle={`${fullCount.toLocaleString()} pairs`}
          n={n}
          w={w}
          kind="full"
        />
        <MaskPanel
          title={`Window w=${w}`}
          subtitle={`${slidingCount.toLocaleString()} · ${ratio.toFixed(1)}×`}
          n={n}
          w={w}
          kind="sliding"
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden">
        <div className="bg-surface-2 px-3 py-2.5 min-w-0">
          <Readout
            label="per-layer"
            value={(n * (w + 1)).toLocaleString()}
            unit="n·w"
            tone="accent"
          />
        </div>
        <div className="bg-surface-2 px-3 py-2.5 min-w-0">
          <Readout
            label="receptive"
            value={erf.toLocaleString()}
            unit="tok"
            tone="accent"
          />
        </div>
        <div className="bg-surface-2 px-3 py-2.5 min-w-0">
          <Readout
            label="full attn"
            value={(n * n).toLocaleString()}
            unit="n²"
          />
        </div>
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  ariaLabel,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between mb-1.5 gap-1">
        <label
          htmlFor={id}
          className="text-micro uppercase tracking-[0.14em] text-dim font-mono"
        >
          {label}
        </label>
        <span className="font-mono text-body-sm text-accent tabular-nums">
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-[rgb(var(--accent))]"
      />
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
      <div className="mb-2 min-w-0">
        <div className="text-body-sm font-semibold text-ink truncate">{title}</div>
        <div className="text-micro font-mono text-muted tabular-nums">{subtitle}</div>
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
          fontFamily="var(--font-mono), ui-monospace, monospace"
          className="fill-dim"
        >
          key position j →
        </text>
      </svg>
      <div className="mt-1 text-micro font-mono text-dim text-center">
        rows: query i  ·  shaded cells = attended
      </div>
    </div>
  );
}

