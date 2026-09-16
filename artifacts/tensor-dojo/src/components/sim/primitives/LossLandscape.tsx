

import { useMemo } from 'react';

const PLOT_W = 360;
const PLOT_H = 320;
const X_RANGE: [number, number] = [-2, 2];
const Y_RANGE: [number, number] = [-2, 2];
const NX = 60;
const NY = 60;

const STATIC_CELLS = (() => {
  const cells: { dsX: number; dsY: number; scX: number; scY: number }[] = [];
  for (let i = 0; i < NY; i += 1) {
    const y = Y_RANGE[0] + (i / (NY - 1)) * (Y_RANGE[1] - Y_RANGE[0]);
    for (let j = 0; j < NX; j += 1) {
      const x = X_RANGE[0] + (j / (NX - 1)) * (X_RANGE[1] - X_RANGE[0]);
      cells.push({
        dsX: x,
        dsY: y,
        scX: ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * PLOT_W,
        scY: PLOT_H - ((y - Y_RANGE[0]) / (Y_RANGE[1] - Y_RANGE[0])) * PLOT_H,
      });
    }
  }
  return cells;
})();

export interface LossLandscapeProps {
  /**
   * Loss function. Both points are in design-space coordinates
   * (the same coordinate system as X_RANGE / Y_RANGE), not
   * screen coordinates. Implementations should be deterministic
   * — the same input always returns the same value.
   */
  loss: (p: readonly [number, number]) => number;
  /**
   * Trajectories to overlay. Each trajectory is a list of
   * (x, y) points in design-space. The first point is treated
   * as the start; the last is the end. Non-finite points are
   * dropped silently.
   */
  trajectories?: ReadonlyArray<{
    /** Stable identifier used as React key and for color picking. */
    id: string;
    /** The polyline. */
    points: ReadonlyArray<readonly [number, number]>;
    /** Stroke color (full rgb(...) string). */
    color: string;
    /** Label for the legend; the legend row shows it. */
    label?: string;
  }>;
  /**
   * Optional accent marker drawn on top of the surface. Use to
   * highlight the current optimum the lesson is steering toward.
   */
  marker?: { x: number; y: number; color: string; label?: string };
  /** Aria label for the surface. */
  ariaLabel?: string;
}

function toScreenX(x: number): number {
  const clamped =
    Number.isFinite(x) ? Math.max(X_RANGE[0], Math.min(X_RANGE[1], x)) : X_RANGE[0];
  return ((clamped - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * PLOT_W;
}
function toScreenY(y: number): number {
  const clamped =
    Number.isFinite(y) ? Math.max(Y_RANGE[0], Math.min(Y_RANGE[1], y)) : Y_RANGE[0];
  return PLOT_H - ((clamped - Y_RANGE[0]) / (Y_RANGE[1] - Y_RANGE[0])) * PLOT_H;
}

/**
 * Reusable 2D loss surface + overlaid trajectories. Shared
 * by the gradient-descent lesson's centerpiece and the new
 * SGD / optimizer lessons' centerpieces. The colormap is
 * blue (low) → red (high) using the theme's --accent and
 * --negative tokens, with opacity scaled by the per-cell
 * value.
 *
 * Coordinates: x is the horizontal axis, y is the vertical
 * axis. The plot is squared with x ∈ [-2, 2], y ∈ [-2, 2].
 */
export function LossLandscape({
  loss,
  trajectories = [],
  marker,
  ariaLabel,
}: LossLandscapeProps) {
  // Pre-compute and memoize the 3600 `<rect>` cell elements.
  // By depending strictly on a stable `loss` function reference, this avoids
  // remapping and reallocating all 3600 elements on every animation frame/render.
  const surfaceCells = useMemo(() => {
    // 1. Compute loss values and max.
    const vals = new Float32Array(STATIC_CELLS.length);
    let max = -Infinity;
    for (let i = 0; i < STATIC_CELLS.length; i++) {
      const c = STATIC_CELLS[i]!;
      const v = loss([c.dsX, c.dsY]);
      vals[i] = v;
      if (v > max) max = v;
    }

    // 2. Build the cell elements.
    const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
    const w = PLOT_W / (NX - 1) + 0.5;
    const h = PLOT_H / (NY - 1) + 0.5;

    return STATIC_CELLS.map((c, i) => {
      const v = vals[i]!;
      let fill = 'rgb(var(--accent))';
      let opacity = 0;
      if (v > max * 0.6) {
        const t = Math.min(1, v / max);
        fill = 'rgb(var(--negative))';
        opacity = round4(t * 0.7);
      } else {
        const t = Math.max(0, 1 - v / (max * 0.5));
        opacity = round4(t * 0.4);
      }
      return (
        <rect
          key={i}
          x={c.scX}
          y={c.scY}
          width={w}
          height={h}
          fill={fill}
          opacity={opacity}
        />
      );
    });
  }, [loss]);

  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label={ariaLabel ?? '2D loss surface with overlaid trajectories.'}
    >
      {/* Surface cells */}
      {surfaceCells}
      {/* Trajectories */}
      {trajectories.map((tr) => {
        const finite = tr.points.filter(
          ([x, y]) => Number.isFinite(x) && Number.isFinite(y),
        );
        return (
          <g key={tr.id}>
            <polyline
              points={finite
                .map(([x, y]) => `${toScreenX(x).toFixed(1)},${toScreenY(y).toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke={tr.color}
              strokeWidth={1.5}
              opacity={0.85}
            />
            {/* End dot */}
            {finite.length > 0 && (() => {
              const last = finite[finite.length - 1]!;
              return (
                <circle
                  cx={toScreenX(last[0])}
                  cy={toScreenY(last[1])}
                  r={3.5}
                  fill={tr.color}
                  stroke="rgb(var(--bg))"
                  strokeWidth={1.5}
                />
              );
            })()}
          </g>
        );
      })}
      {/* Marker (e.g. the true minimum the lesson is steering toward) */}
      {marker && (
        <g>
          <circle
            cx={toScreenX(marker.x)}
            cy={toScreenY(marker.y)}
            r={4.5}
            fill={marker.color}
            stroke="rgb(var(--bg))"
            strokeWidth={1.5}
          />
        </g>
      )}
      {/* Axes */}
      <line
        x1={toScreenX(0)}
        y1={0}
        x2={toScreenX(0)}
        y2={PLOT_H}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
      <line
        x1={0}
        y1={toScreenY(0)}
        x2={PLOT_W}
        y2={toScreenY(0)}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
      <text x={PLOT_W - 4} y={toScreenY(0) - 4} textAnchor="end" className="fill-dim font-mono" fontSize={10}>
        x
      </text>
      <text x={toScreenX(0) + 4} y={12} className="fill-dim font-mono" fontSize={10}>
        y
      </text>
    </svg>
  );
}
