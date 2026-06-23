'use client';

import { useMemo, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { sinusoidalPE1D } from '@/lib/math/positional';

export interface PositionalSineWavePreset {
  maxPos?: number;
  d?: number;
}

/**
 * A 1D line plot of one dimension of the positional encoding as a
 * function of position. The frequency slider picks the dimension
 * index to plot.
 */
export function PositionalSineWave({ preset }: { preset?: PositionalSineWavePreset }) {
  const [maxPos, setMaxPos] = useState(preset?.maxPos ?? 32);
  const [d, setD] = useState(preset?.d ?? 16);
  const [dim, setDim] = useState(0);

  const series = useMemo(() => {
    const arr: number[] = [];
    for (let pos = 0; pos < maxPos; pos += 1) {
      arr.push(sinusoidalPE1D(pos, d)[dim] ?? 0);
    }
    return arr;
  }, [maxPos, d, dim]);

  const W = 600;
  const H = 180;
  const PAD = 24;
  const plotW = W - 2 * PAD;
  const plotH = H - 2 * PAD;

  const points = series
    .map((v, pos) => {
      const x = PAD + (pos / (series.length - 1 || 1)) * plotW;
      const y = PAD + (1 - (v + 1) / 2) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  const reset = () => {
    setMaxPos(preset?.maxPos ?? 32);
    setD(preset?.d ?? 16);
    setDim(0);
  };

  return (
    <SimFrame title="Pick a dim · plot sin/cos across positions" onReset={reset}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <rect x={0} y={0} width={W} height={H} className="fill-bg/40" />
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="text-border" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} className="text-border" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} className="text-border" stroke="currentColor" strokeWidth={0.5} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
            <polyline
              points={points}
              fill="none"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            <text x={W - PAD} y={PAD + 12} textAnchor="end" className="fill-dim font-mono" fontSize={10} style={{ fontSize: 10 }}>
              dim {dim} · pair {Math.floor(dim / 2)} · wavelength ≈ {Math.round(2 * Math.PI * Math.pow(10000, Math.floor(dim / 2) / (d / 2)))}
            </text>
            <text x={W - PAD} y={H - PAD - 6} textAnchor="end" className="fill-dim font-mono" fontSize={10} style={{ fontSize: 10 }}>
              pos {maxPos - 1}
            </text>
          </svg>
        </div>
        <div className="space-y-2 font-mono text-[12px]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Dimension index
            </div>
            <input
              type="range"
              min={0}
              max={d - 1}
              step={1}
              value={dim}
              onChange={(e) => setDim(parseInt(e.target.value, 10))}
              className="slider w-full"
              style={{ ['--fill' as string]: `${(dim / Math.max(1, d - 1)) * 100}%` }}
              aria-label="Dimension index"
            />
            <div className="text-ink tabular-nums text-right">{dim}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Max position
            </div>
            <input
              type="range"
              min={4}
              max={64}
              step={1}
              value={maxPos}
              onChange={(e) => setMaxPos(parseInt(e.target.value, 10))}
              className="slider w-full"
              style={{ ['--fill' as string]: `${((maxPos - 4) / 60) * 100}%` }}
              aria-label="Max position"
            />
            <div className="text-ink tabular-nums text-right">{maxPos}</div>
          </div>
        </div>
      </div>
    </SimFrame>
  );
}
