'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  activationVariancePerLayer,
  type InitScheme,
} from '@/lib/math/weight-init';

const SCHEMES: { id: InitScheme; label: string; sub: string }[] = [
  { id: 'kaiming', label: 'Kaiming', sub: '√(2/d)' },
  { id: 'xavier', label: 'Xavier', sub: '√(1/d)' },
  { id: 'small', label: 'Small', sub: 'σ = 0.01' },
  { id: 'large', label: 'Large', sub: 'σ = 0.5' },
];

/**
 * Plot per-layer activation variance for a deep ReLU MLP at four
 * common weight-initialization schemes. The y-axis is log10(var)
 * clamped to [-30, 30] so the plot is readable across all schemes.
 */
export function WeightInitExplorer() {
  const [scheme, setScheme] = useState<InitScheme>('kaiming');
  const [depth, setDepth] = useState(12);
  const [seed, setSeed] = useState(42);
  const d = 128;

  const variances = useMemo(
    () => activationVariancePerLayer({ scheme, d, depth, seed }),
    [scheme, depth, seed],
  );

  const finalVar = variances[variances.length - 1] ?? 0;
  const status = classify(finalVar);

  return (
    <SimFrame
      title="Activation variance through a ReLU MLP"
      headerWrap
      headerAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reseed
          </button>
          <button
            type="button"
            onClick={() => {
              setScheme('kaiming');
              setDepth(12);
              setSeed(42);
            }}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reset
          </button>
        </div>
      }
    >
      {/* Scheme selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SCHEMES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScheme(s.id)}
            aria-pressed={scheme === s.id}
            className={clsx(
              'text-[11px] uppercase tracking-[0.12em] font-mono px-3 py-1 rounded border focus-ring transition-colors',
              scheme === s.id
                ? 'border-accent text-accent bg-accent-soft'
                : 'border-border text-muted hover:text-ink hover:border-border-strong',
            )}
          >
            {s.label}
            <span className="ml-1.5 text-fg-subtle">·</span>
            <span className="ml-1.5 text-fg-muted">{s.sub}</span>
          </button>
        ))}
      </div>

      {/* Depth slider */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <label
            htmlFor="weight-init-depth"
            className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
          >
            depth N
          </label>
          <span className="font-mono text-[14px] text-accent tabular-nums">
            {depth}
          </span>
        </div>
        <input
          id="weight-init-depth"
          type="range"
          min={1}
          max={48}
          step={1}
          value={depth}
          onChange={(e) => setDepth(parseInt(e.target.value, 10))}
          className="w-full accent-[rgb(var(--accent))]"
        />
      </div>

      {/* Status pill */}
      <div className="rounded-lg border border-border bg-bg/40 p-3 mb-4 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          var(activation) at layer {depth}
        </span>
        <span
          className={clsx(
            'font-mono text-[16px] tabular-nums',
            status.color,
          )}
        >
          {formatVar(finalVar)} <span className="text-dim">({status.label})</span>
        </span>
      </div>

      <VariancePlot variances={variances} />

      <p className="mt-3 text-[11px] text-dim font-mono">
        log<sub>10</sub>(variance) per layer · width d = {d} · ReLU activation.
        Kaiming&apos;s √(2/d) is the only scheme that keeps the variance near 1 across depth.
      </p>
    </SimFrame>
  );
}

function classify(v: number): { label: string; color: string } {
  if (v < 1e-6)
    return { label: 'vanished', color: 'text-[rgb(var(--negative))]' };
  if (v > 1e6)
    return { label: 'exploded', color: 'text-[rgb(var(--negative))]' };
  if (v < 0.1 || v > 10)
    return { label: 'drifting', color: 'text-amber-500 dark:text-amber-400' };
  return { label: 'stable', color: 'text-accent' };
}

function formatVar(v: number): string {
  if (v === 0) return '0';
  if (v < 1e-3 || v > 1e3) return v.toExponential(2);
  return v.toFixed(3);
}

function VariancePlot({ variances }: { variances: readonly number[] }) {
  const W = 520;
  const H = 200;
  const PAD_X = 28;
  const PAD_Y = 12;
  const LO = -30;
  const HI = 30;
  const n = variances.length;

  const log = (v: number) => {
    const lv = Math.log10(Math.max(v, 1e-40));
    return Math.max(LO, Math.min(HI, lv));
  };
  const yToPx = (lv: number) =>
    PAD_Y + ((HI - lv) / (HI - LO)) * (H - PAD_Y * 2);
  const xToPx = (i: number) =>
    PAD_X + (i / Math.max(1, n - 1)) * (W - PAD_X * 2);

  const zeroY = yToPx(0);
  let pathD = '';
  for (let i = 0; i < n; i += 1) {
    const px = xToPx(i);
    const py = yToPx(log(variances[i] as number));
    pathD += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ' ' + py.toFixed(2) + ' ';
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
      {/* gridlines */}
      {[30, 20, 10, 0, -10, -20, -30].map((lv) => (
        <g key={lv}>
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={yToPx(lv)}
            y2={yToPx(lv)}
            className={lv === 0 ? 'stroke-border-strong' : 'stroke-border'}
            strokeWidth={lv === 0 ? 1 : 0.5}
            strokeDasharray={lv === 0 ? '' : '2 4'}
          />
          <text
            x={PAD_X - 4}
            y={yToPx(lv) + 3}
            textAnchor="end"
            fontSize={9}
            fontFamily="monospace"
            className="fill-fg-subtle"
          >
            1e{lv >= 0 ? '+' : ''}
            {lv}
          </text>
        </g>
      ))}
      {/* "stable" band */}
      <rect
        x={PAD_X}
        y={yToPx(1)}
        width={W - PAD_X * 2}
        height={Math.abs(yToPx(-1) - yToPx(1))}
        className="fill-accent"
        fillOpacity={0.05}
      />
      {/* var=1 line */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={zeroY}
        y2={zeroY}
        className="stroke-accent"
        strokeWidth={0.75}
        strokeDasharray="4 2"
        opacity={0.5}
      />
      <path
        d={pathD}
        fill="none"
        className="stroke-accent"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {variances.map((v, i) => (
        <circle
          key={i}
          cx={xToPx(i)}
          cy={yToPx(log(v))}
          r={2.5}
          className="fill-accent"
        />
      ))}
      {/* x-axis ticks at start, mid, end */}
      <text
        x={xToPx(0)}
        y={H - 2}
        fontSize={9}
        fontFamily="monospace"
        textAnchor="middle"
        className="fill-fg-subtle"
      >
        layer 0
      </text>
      <text
        x={xToPx(n - 1)}
        y={H - 2}
        fontSize={9}
        fontFamily="monospace"
        textAnchor="middle"
        className="fill-fg-subtle"
      >
        layer {n - 1}
      </text>
    </svg>
  );
}
