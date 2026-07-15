'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { applyRope, dot } from '@/lib/math/rope';

/**
 * Secondary sim for the RoPE lesson. Plots the rotated dot
 * product as a function of the relative position offset
 * (posQ - posK), averaged over many random unit (q, k) pairs.
 * One curve per dimension pair index, showing how different
 * pairs contribute at different "wavelengths":
 *   - pair 0 oscillates fast — captures fine-grained position
 *   - high pairs change slowly — capture far-apart structure
 *
 * Reset re-randomizes the (q, k) samples. The curves are noisy
 * single-sample reads only when there's no averaging; with the
 * default N_SAMPLES they're already smooth.
 */

const OFFSET_MIN = -32;
const OFFSET_MAX = 32;
const N_PAIRS_DISPLAYED = 4;
const N_SAMPLES = 64;
const D = N_PAIRS_DISPLAYED * 2;

type Mode = 'single-pair' | 'all-pairs';

function randomUnit(d: number, rng: () => number): number[] {
  // Box-Muller for normal samples; then normalize.
  const v: number[] = [];
  for (let i = 0; i < d; i += 2) {
    const u1 = Math.max(1e-9, rng());
    const u2 = rng();
    const r = Math.sqrt(-2 * Math.log(u1));
    v.push(r * Math.cos(2 * Math.PI * u2));
    v.push(r * Math.sin(2 * Math.PI * u2));
  }
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / mag);
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function RoPERelativity() {
  const [seed, setSeed] = useState(1);
  const [mode, setMode] = useState<Mode>('all-pairs');

  // Compute curves. For each pair index k, sample N pairs of unit
  // q and k vectors *restricted to that pair* (length-2 vectors),
  // then evaluate rotated-dot at every offset and average. We
  // pack each pair as a length-D vector with zeros elsewhere so
  // applyRope's frequency for pair k is the same as it would be
  // in a full-D run.
  const curves = useMemo(() => {
    const rng = mulberry32(seed);
    const samples = Array.from({ length: N_SAMPLES }, () =>
      randomUnit(D, rng),
    );
    const offsets: number[] = [];
    for (let o = OFFSET_MIN; o <= OFFSET_MAX; o++) offsets.push(o);

    return Array.from({ length: N_PAIRS_DISPLAYED }, (_, k) => {
      const values = offsets.map((off) => {
        let sum = 0;
        for (const sample of samples) {
          // Isolate this pair: zero out everything else.
          const isolated = sample.map((v, i) =>
            Math.floor(i / 2) === k ? v : 0,
          );
          const q = isolated;
          const kVec = isolated;
          sum += dot(applyRope(q, off), applyRope(kVec, 0));
        }
        return sum / samples.length;
      });
      return { k, offsets, values };
    });
  }, [seed]);

  const reset = () => {
    setSeed((s) => s + 1);
    setMode('all-pairs');
  };

  // SVG geometry.
  const W = 640;
  const H = 240;
  const PAD_X = 36;
  const PAD_Y = 24;
  const xMin = OFFSET_MIN;
  const xMax = OFFSET_MAX;
  // Y-range: the dot product on a length-D unit vector is in [-1, 1],
  // and per-pair contributions are smaller. Clamp to [-0.6, 1.0] for
  // a tight, readable axis.
  const yMin = -0.6;
  const yMax = 1.05;

  const xScale = (x: number) =>
    PAD_X + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD_X);
  const yScale = (y: number) =>
    H - PAD_Y - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD_Y);

  const visible = mode === 'all-pairs' ? curves : curves.slice(0, 1);

  // Colors: pair 0 = accent; later pairs fade towards ink.
  const pairColor = (k: number) => {
    if (k === 0) return 'rgb(var(--accent))';
    const t = k / (N_PAIRS_DISPLAYED - 1);
    return `rgb(var(--fg) / ${0.85 - t * 0.4})`;
  };

  return (
    <SimFrame
      title="Rotated q · k as a function of m − n"
      onReset={reset}
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {(['single-pair', 'all-pairs'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  mode === m
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {m === 'single-pair' ? 'pair 0 only' : 'all 4 pairs'}
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Axes */}
        <line
          x1={PAD_X}
          y1={yScale(0)}
          x2={W - PAD_X}
          y2={yScale(0)}
          stroke="rgb(var(--border-strong))"
          strokeWidth={0.8}
        />
        <line
          x1={xScale(0)}
          y1={PAD_Y}
          x2={xScale(0)}
          y2={H - PAD_Y}
          stroke="rgb(var(--border-strong))"
          strokeWidth={0.8}
        />

        {/* Axis ticks (x) */}
        {[-32, -16, 0, 16, 32].map((x) => (
          <g key={`tx${x}`}>
            <line
              x1={xScale(x)}
              y1={yScale(0) - 3}
              x2={xScale(x)}
              y2={yScale(0) + 3}
              stroke="rgb(var(--border-strong))"
            />
            <text
              x={xScale(x)}
              y={yScale(0) + 14}
              textAnchor="middle"
              fontSize={10}
              className="fill-dim font-mono"
            >
              {x}
            </text>
          </g>
        ))}

        {/* Axis label */}
        <text
          x={W - PAD_X}
          y={yScale(0) + 14}
          textAnchor="end"
          fontSize={10}
          className="fill-dim font-mono"
        >
          m − n
        </text>

        {/* Curves */}
        {visible.map(({ k, offsets, values }) => {
          const d = offsets
            .map((x, i) => `${i === 0 ? 'M' : 'L'} ${xScale(x)} ${yScale(values[i]!)}`)
            .join(' ');
          return (
            <path
              key={k}
              d={d}
              fill="none"
              stroke={pairColor(k)}
              strokeWidth={k === 0 ? 1.6 : 1.1}
            />
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px]">
        {visible.map(({ k }) => (
          <div key={k} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-0.5"
              style={{ backgroundColor: pairColor(k) }}
              aria-hidden
            />
            <span className="text-dim">pair {k}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Each curve is the rotated dot product averaged over{' '}
        <span className="text-ink">{N_SAMPLES}</span> random unit (q, k)
        pairs, plotted against the offset m − n. Pair 0 oscillates fast — one
        full turn per ~6 positions. Higher pairs change much more slowly. Real
        RoPE adds them all up: low pairs encode fine-grained nearby structure,
        high pairs encode coarse far-apart structure. Same geometric-frequency
        idea as sinusoidal PE, just applied as rotation instead of addition.
      </p>
    </SimFrame>
  );
}
