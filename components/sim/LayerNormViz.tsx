'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { layerNorm } from '@/lib/math/layernorm';

/**
 * A small before/after visualization of layernorm. Pick an input
 * scale; the same input vector is drawn once at that scale and
 * once after layernorm. The direction is preserved; only the
 * magnitude and offset change.
 */
export function LayerNormViz() {
  const [scale, setScale] = useState(1);

  // A fixed direction in 2D
  const dir: [number, number] = [0.7, 0.3];
  const dirMag = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
  const unit: [number, number] = [dir[0] / dirMag, dir[1] / dirMag];

  // Apply the scale: the input vector has magnitude `scale * 2`,
  // starting from offset [0.5, 0.2].
  const offset: [number, number] = [0.5, 0.2];
  const x: [number, number] = [
    offset[0] + unit[0] * scale * 2,
    offset[1] + unit[1] * scale * 2,
  ];
  const y: number[] = layerNorm(x);

  // SVG viewport
  const W = 480;
  const H = 220;
  const PAD = 30;
  const plotW = (W - 3 * PAD) / 2;
  const plotH = H - 2 * PAD;
  const maxVal = 5;
  const toSvg = (v: number, axis: 'x' | 'y') => {
    const range = 2 * maxVal;
    const offset = maxVal;
    const pos = v + offset;
    return (pos / range) * (axis === 'x' ? plotW : plotH);
  };

  const drawArrow = (v: number[], color: string) => {
    const x = toSvg(v[0] ?? 0, 'x');
    const y = plotH - toSvg(v[1] ?? 0, 'y');
    return (
      <g pointerEvents="none">
        <line x1={0} y1={0} x2={x} y2={y} stroke={color} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <polygon
          points={`${x},${y} ${x - 6},${y - 4} ${x - 6},${y + 4}`}
          fill={color}
        />
      </g>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          LayerNorm: same direction, different scale
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
        <div>
          <div className="grid grid-cols-2 gap-3" style={{ transform: 'translate(0, 0)' }}>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">Before</div>
              <svg viewBox={`0 0 ${plotW} ${plotH}`} className="w-full h-auto bg-bg/40 rounded">
                <line x1={0} y1={plotH / 2} x2={plotW} y2={plotH / 2} className="text-border" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={plotW / 2} y1={0} x2={plotW / 2} y2={plotH} className="text-border" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <g transform={`translate(${plotW / 2}, ${plotH / 2})`}>
                  {drawArrow(x, 'rgb(var(--fg-muted))')}
                </g>
              </svg>
              <div className="text-[10px] text-dim font-mono text-center">
                ‖x‖ = {Math.sqrt((x[0] ?? 0) ** 2 + (x[1] ?? 0) ** 2).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">After layernorm</div>
              <svg viewBox={`0 0 ${plotW} ${plotH}`} className="w-full h-auto bg-bg/40 rounded">
                <line x1={0} y1={plotH / 2} x2={plotW} y2={plotH / 2} className="text-border" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={plotW / 2} y1={0} x2={plotW / 2} y2={plotH} className="text-border" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <g transform={`translate(${plotW / 2}, ${plotH / 2})`}>
                  {drawArrow(y, 'rgb(var(--accent))')}
                </g>
              </svg>
              <div className="text-[10px] text-dim font-mono text-center">
                ‖y‖ = {Math.sqrt((y[0] ?? 0) ** 2 + (y[1] ?? 0) ** 2).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2 font-mono text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
              Input scale
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="slider w-full"
              style={{ ['--fill' as string]: `${((scale - 0.5) / 2.5) * 100}%` }}
            />
            <div className="text-ink tabular-nums text-right">{scale.toFixed(1)}×</div>
          </div>
          <p className="text-[10px] text-dim leading-relaxed">
            Drag the input scale; the "after" arrow always ends at the same length (≈ 1.41) and the same zero-mean offset. The direction is preserved.
          </p>
        </div>
      </div>
    </div>
  );
}
