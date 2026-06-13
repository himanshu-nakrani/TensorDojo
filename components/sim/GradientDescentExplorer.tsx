'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { gradient, loss, run, type Point } from '@/lib/math/gradient-descent';

const PLOT_W = 360;
const PLOT_H = 320;
const X_RANGE: [number, number] = [-2, 2];
const Y_RANGE: [number, number] = [-2, 2];

interface Preset {
  id: string;
  label: string;
  start: Point;
  eta: number;
  description: string;
}

const PRESETS: readonly Preset[] = [
  {
    id: 'converges',
    label: 'Converges',
    start: [0.5, 0.5],
    eta: 0.05,
    description: 'Small η from inside the basin → walks straight to the minimum.',
  },
  {
    id: 'oscillates',
    label: 'Oscillates',
    start: [0.5, 0.5],
    eta: 0.5,
    description: 'η too large → steps overshoot, bounce across the basin, never settle.',
  },
  {
    id: 'diverges',
    label: 'Diverges',
    start: [0, 0.5],
    eta: 1.5,
    description: 'η way too large → trajectory explodes off the surface.',
  },
];

function toScreenX(x: number): number {
  return ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * PLOT_W;
}
function toScreenY(y: number): number {
  return PLOT_H - ((y - Y_RANGE[0]) / (Y_RANGE[1] - Y_RANGE[0])) * PLOT_H;
}

/**
 * Centerpiece: a 2D loss landscape (toy — see
 * `lib/math/gradient-descent.ts`) with the reader's starting
 * point, a learning-rate slider, and a step/run control. The
 * trajectory is plotted on the landscape with the final point
 * highlighted.
 *
 * Three preset "modes" (converges, oscillates, diverges) load
 * pre-tuned starting points and η values so the reader can see
 * all three failure modes of gradient descent in one screen.
 */
export function GradientDescentExplorer() {
  const [presetId, setPresetId] = useState<string>('converges');
  const [eta, setEta] = useState<number>(PRESETS[0]!.eta);
  const [start, setStart] = useState<Point>(PRESETS[0]!.start);
  const [numSteps, setNumSteps] = useState<number>(40);
  const [seed, setSeed] = useState<number>(0);

  const runResult = useMemo(
    () => run(start, eta, numSteps),
    // seed is the "step" trigger — bumping it re-runs the
    // trajectory with the same parameters but a fresh step
    // count from 0.
    [start, eta, numSteps, seed],
  );

  const setPreset = (id: string) => {
    const p = PRESETS.find((p) => p.id === id);
    if (!p) return;
    setPresetId(id);
    setStart(p.start);
    setEta(p.eta);
  };

  // Pre-compute the loss surface as a colormap (downsampled).
  const surface = useMemo(() => {
    const grid: number[][] = [];
    const NX = 60;
    const NY = 60;
    for (let i = 0; i < NY; i += 1) {
      const row: number[] = [];
      const y = Y_RANGE[0] + (i / (NY - 1)) * (Y_RANGE[1] - Y_RANGE[0]);
      for (let j = 0; j < NX; j += 1) {
        const x = X_RANGE[0] + (j / (NX - 1)) * (X_RANGE[1] - X_RANGE[0]);
        row.push(loss([x, y]));
      }
      grid.push(row);
    }
    const flat = grid.flat();
    const max = Math.max(...flat);
    return { grid, max, NX, NY };
  }, []);

  // Color the surface cells. Low loss → teal; high loss → red.
  const cellColor = (v: number): string => {
    if (v > surface.max * 0.6) {
      const t = Math.min(1, v / surface.max);
      return `rgba(248, 113, 113, ${(t * 0.7).toFixed(2)})`;
    }
    const t = Math.max(0, 1 - v / (surface.max * 0.5));
    return `rgba(45, 212, 191, ${(t * 0.4).toFixed(2)})`;
  };

  const end = runResult.trajectory[runResult.trajectory.length - 1]!;
  const startLoss = loss(start);
  const endLoss = loss(end);
  const diverged = runResult.divergedAt !== null;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Gradient descent
        </h3>
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink transition-colors"
        >
          Step
        </button>
      </div>

      {/* Presets */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mr-1">
          Preset
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={
              'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border transition-colors ' +
              (presetId === p.id
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink')
            }
            aria-pressed={presetId === p.id}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5">
        {/* Loss surface + trajectory */}
        <div>
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            className="w-full h-auto bg-bg/40 rounded"
            role="img"
            aria-label="2D loss surface with a gradient-descent trajectory."
          >
            {/* Surface cells */}
            {surface.grid.map((row, i) =>
              row.map((v, j) => (
                <rect
                  key={`c${i}-${j}`}
                  x={toScreenX(X_RANGE[0] + (j / (surface.NX - 1)) * (X_RANGE[1] - X_RANGE[0]))}
                  y={toScreenY(Y_RANGE[0] + (i / (surface.NY - 1)) * (Y_RANGE[1] - Y_RANGE[0]))}
                  width={PLOT_W / (surface.NX - 1) + 0.5}
                  height={PLOT_H / (surface.NY - 1) + 0.5}
                  fill={cellColor(v)}
                />
              )),
            )}
            {/* Trajectory */}
            <polyline
              points={runResult.trajectory
                .map(([x, y]) => `${toScreenX(x).toFixed(1)},${toScreenY(y).toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke="#0B0D10"
              strokeWidth={1.5}
              opacity={0.7}
            />
            {/* Start */}
            <circle
              cx={toScreenX(start[0])}
              cy={toScreenY(start[1])}
              r={5}
              fill="#0B0D10"
              stroke="#2DD4BF"
              strokeWidth={2}
            />
            {/* End */}
            <circle
              cx={toScreenX(end[0])}
              cy={toScreenY(end[1])}
              r={5}
              fill="#2DD4BF"
              stroke="#0B0D10"
              strokeWidth={2}
            />
            {/* Axes */}
            <line
              x1={toScreenX(0)}
              y1={0}
              x2={toScreenX(0)}
              y2={PLOT_H}
              stroke="#1F242A"
              strokeWidth={1}
            />
            <line
              x1={0}
              y1={toScreenY(0)}
              x2={PLOT_W}
              y2={toScreenY(0)}
              stroke="#1F242A"
              strokeWidth={1}
            />
            {/* Axis labels */}
            <text
              x={PLOT_W - 4}
              y={toScreenY(0) - 4}
              textAnchor="end"
              className="fill-dim font-mono"
              fontSize={10}
            >
              x
            </text>
            <text
              x={toScreenX(0) + 4}
              y={12}
              className="fill-dim font-mono"
              fontSize={10}
            >
              y
            </text>
          </svg>
        </div>

        {/* Controls + readout */}
        <div className="space-y-4 font-mono text-[12px]">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Learning rate η
              </span>
              <span className="text-ink tabular-nums">{eta.toFixed(2)}</span>
            </div>
            <Slider
              value={eta}
              min={0.001}
              max={2}
              step={0.01}
              onChange={setEta}
              formatValue={(v) => v.toFixed(2)}
              ariaLabel="Learning rate"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Steps
              </span>
              <span className="text-ink tabular-nums">{numSteps}</span>
            </div>
            <Slider
              value={numSteps}
              min={1}
              max={200}
              step={1}
              onChange={(v) => setNumSteps(Math.round(v))}
              formatValue={(v) => String(Math.round(v))}
              ariaLabel="Number of steps"
            />
          </div>

          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Start loss</span>
              <span className="text-ink tabular-nums">{startLoss.toFixed(3)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">End loss</span>
              <span
                className={
                  diverged
                    ? 'text-[#F87171] tabular-nums'
                    : endLoss < startLoss
                      ? 'text-accent tabular-nums'
                      : 'text-ink tabular-nums'
                }
              >
                {endLoss.toFixed(3)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">End point</span>
              <span className="text-ink tabular-nums">
                ({end[0].toFixed(2)}, {end[1].toFixed(2)})
              </span>
            </div>
            {diverged && (
              <p className="text-[10px] text-[#F87171] mt-1">
                Diverged at step {runResult.divergedAt}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
