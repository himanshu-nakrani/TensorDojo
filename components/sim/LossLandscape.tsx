'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  SURFACES,
  listSurfaces,
  sgdTrajectory,
  type SurfaceId,
} from '@/lib/math/loss-landscape';

const GRID = 48; // heatmap resolution: GRID × GRID cells.
const W = 320; // svg width in viewBox units.
const H = 320;

/**
 * Loss-landscape visualizer. Renders the chosen 2D surface as a
 * heatmap, lets the reader click anywhere to drop a starting
 * point, then animates SGD walking from there to a stationary
 * point. A learning-rate slider exposes the convergence vs.
 * overshoot tradeoff.
 */
export function LossLandscape() {
  const [surfaceId, setSurfaceId] = useState<SurfaceId>('bowl');
  const surface = SURFACES[surfaceId];
  const [lr, setLR] = useState(surface.defaultLR);
  const [start, setStart] = useState<[number, number] | null>(null);

  // Reset LR + path when the surface changes.
  useEffect(() => {
    setLR(SURFACES[surfaceId].defaultLR);
    setStart(null);
  }, [surfaceId]);

  // Precompute the heatmap values and a min/max for shading.
  const { cells, fMin, fMax } = useMemo(() => {
    const cells: number[][] = [];
    let fMin = Infinity;
    let fMax = -Infinity;
    const step = (2 * surface.extent) / GRID;
    for (let i = 0; i < GRID; i++) {
      const row: number[] = [];
      const yi = -surface.extent + (i + 0.5) * step;
      for (let j = 0; j < GRID; j++) {
        const xj = -surface.extent + (j + 0.5) * step;
        const v = surface.f(xj, yi);
        row.push(v);
        if (v < fMin) fMin = v;
        if (v > fMax) fMax = v;
      }
      cells.push(row);
    }
    return { cells, fMin, fMax };
  }, [surface]);

  // Full SGD path from the chosen start point.
  const path = useMemo(() => {
    if (!start) return null;
    return sgdTrajectory(surface, start, lr);
  }, [surface, start, lr]);

  // Animate the path by revealing one step at a time.
  const [shown, setShown] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!path) return;
    setShown(1);
    let i = 1;
    const tick = () => {
      i = Math.min(i + 1, path.length);
      setShown(i);
      if (i < path.length) {
        rafRef.current = window.setTimeout(tick, 60) as unknown as number;
      }
    };
    rafRef.current = window.setTimeout(tick, 60) as unknown as number;
    return () => {
      if (rafRef.current != null) {
        window.clearTimeout(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [path]);

  const xToPx = (x: number) =>
    ((x + surface.extent) / (2 * surface.extent)) * W;
  const yToPx = (y: number) =>
    // SVG y increases downward; flip so positive y is up.
    H - ((y + surface.extent) / (2 * surface.extent)) * H;
  const pxToX = (px: number) =>
    (px / W) * 2 * surface.extent - surface.extent;
  const pxToY = (py: number) =>
    surface.extent - (py / H) * 2 * surface.extent;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    setStart([pxToX(px), pxToY(py)]);
  };

  const cellSize = W / GRID;
  const range = fMax - fMin || 1;

  return (
    <SimFrame
      title="Loss Landscape"
      headerWrap
      headerAction={
        <button
          type="button"
          onClick={() => setStart(null)}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink focus-ring transition-colors"
        >
          Reset
        </button>
      }
    >
      {/* Surface picker */}
      <div
        role="radiogroup"
        aria-label="Choose a loss surface"
        className="flex flex-wrap gap-1.5 mb-4"
      >
        {listSurfaces().map((s) => {
          const active = s.id === surfaceId;
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={active}
              onClick={() => setSurfaceId(s.id)}
              className={clsx(
                'focus-ring text-[11px] uppercase tracking-[0.18em] font-mono px-2.5 py-1 rounded border transition-colors',
                active
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-muted hover:text-ink hover:border-border-strong',
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Description of the active surface */}
      <p className="text-[12px] text-muted leading-relaxed mb-4">
        {surface.description}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-5 items-start">
        {/* Heatmap */}
        <div className="rounded-md border border-border bg-bg/30 p-2">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="auto"
            onClick={handleClick}
            role="img"
            aria-label="Loss surface heatmap. Click anywhere to drop a starting point for SGD."
            className="cursor-crosshair block"
          >
            {cells.flatMap((row, i) =>
              row.map((v, j) => {
                // Normalize loss into [0, 1] for shading; clamp.
                const t = Math.max(
                  0,
                  Math.min(1, (v - fMin) / range),
                );
                // Light → dark teal gradient. Low loss = dark, high
                // loss = light. Using inline rgba on the accent
                // channel so it themes with the rest of the page.
                const alpha = 0.15 + (1 - t) * 0.55; // dark in basins
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={j * cellSize}
                    y={H - (i + 1) * cellSize}
                    width={cellSize + 0.5}
                    height={cellSize + 0.5}
                    fill={`rgba(var(--accent) / ${alpha.toFixed(3)})`}
                  />
                );
              }),
            )}
            {/* Axes */}
            <line
              x1={W / 2}
              x2={W / 2}
              y1={0}
              y2={H}
              className="stroke-border"
              strokeWidth={0.5}
            />
            <line
              x1={0}
              x2={W}
              y1={H / 2}
              y2={H / 2}
              className="stroke-border"
              strokeWidth={0.5}
            />

            {/* SGD trajectory */}
            {path && shown > 1 && (
              <polyline
                points={path
                  .slice(0, shown)
                  .map(([x, y]) => `${xToPx(x)},${yToPx(y)}`)
                  .join(' ')}
                fill="none"
                stroke="rgb(var(--accent))"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
            )}
            {/* Path dots */}
            {path &&
              path.slice(0, shown).map(([x, y], i) => (
                <circle
                  key={i}
                  cx={xToPx(x)}
                  cy={yToPx(y)}
                  r={i === 0 || i === shown - 1 ? 4 : 1.8}
                  fill={
                    i === 0
                      ? 'rgb(var(--accent))'
                      : i === shown - 1
                        ? 'rgb(var(--accent))'
                        : 'rgba(var(--accent) / 0.7)'
                  }
                  stroke={
                    i === 0 || i === shown - 1
                      ? 'rgb(var(--bg))'
                      : 'none'
                  }
                  strokeWidth={1}
                />
              ))}
          </svg>
        </div>

        {/* Side panel */}
        <div>
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-1.5">
              <label
                htmlFor="lr-slider"
                className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono"
              >
                learning rate
              </label>
              <span className="font-mono text-[13px] text-accent tabular-nums">
                {lr.toFixed(3)}
              </span>
            </div>
            <input
              id="lr-slider"
              type="range"
              min={0.005}
              max={1.5}
              step={0.005}
              value={lr}
              onChange={(e) => setLR(parseFloat(e.target.value))}
              className="w-full accent-[rgb(var(--accent))]"
            />
            <div className="flex justify-between text-[10px] text-fg-subtle font-mono tabular-nums mt-0.5">
              <span>0.005</span>
              <span>1.5</span>
            </div>
          </div>

          <div className="rounded-md border border-border bg-bg/30 px-3 py-2 font-mono text-[12px] space-y-1.5">
            <div className="flex justify-between text-fg-muted">
              <span>start</span>
              <span className="tabular-nums">
                {start
                  ? `(${start[0].toFixed(2)}, ${start[1].toFixed(2)})`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between text-fg-muted">
              <span>steps</span>
              <span className="tabular-nums">
                {path ? path.length - 1 : 0}
              </span>
            </div>
            <div className="flex justify-between text-fg-muted">
              <span>final loss</span>
              <span className="text-accent tabular-nums">
                {path
                  ? surface
                      .f(
                        path[path.length - 1]![0],
                        path[path.length - 1]![1],
                      )
                      .toFixed(3)
                  : '—'}
              </span>
            </div>
          </div>

          {!start && (
            <p className="mt-3 text-[11px] text-fg-muted font-mono leading-relaxed">
              Click the heatmap to drop a starting point. SGD will
              walk to a stationary point from there.
            </p>
          )}
        </div>
      </div>
    </SimFrame>
  );
}
