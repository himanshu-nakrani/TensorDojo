'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { LossLandscape } from '@/components/sim/primitives/LossLandscape';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { adamStep, sgdMomentumStep, sgdStep, type AdamState, type MomentumState } from '@/lib/math/optimizers';

/**
 * Centerpiece for the optimizers lesson. A 2D landscape with
 * a long narrow valley (the pathological case for plain SGD):
 *
 *   L(a, b) = 0.5 · (a - 0.8)² + 4.0 · (b + 0.4)²
 *
 * The valley runs along the b axis (steep) and a (gentle).
 * Three optimizers — SGD, SGD+momentum, Adam — run from the
 * same starting point and leave colored traces. Plain SGD
 * oscillates across the valley; momentum cuts through; Adam
 * adapts step size per dimension and races down the valley
 * floor.
 *
 * Secondary: a β slider (momentum coefficient, 0 to 0.99) on
 * the momentum optimizer alone, showing the β → step-size
 * tradeoff.
 */

const NUM_STEPS = 60;
const PEAK_LR = 0.05;

function valley(a: number, b: number): number {
  return 0.5 * (a - 0.8) * (a - 0.8) + 4.0 * (b + 0.4) * (b + 0.4);
}

interface OptimizerTrace {
  id: string;
  label: string;
  color: string;
  /** (a, b) trajectory. */
  points: Array<readonly [number, number]>;
  losses: number[];
}

function runSGD(start: [number, number]): OptimizerTrace {
  const points: Array<readonly [number, number]> = [start];
  const losses = [valley(start[0], start[1])];
  let a = start[0];
  let b = start[1];
  for (let t = 0; t < NUM_STEPS; t += 1) {
    const dLda = 1.0 * (a - 0.8);
    const dLdb = 8.0 * (b + 0.4);
    const r = sgdStep([a, b], [dLda, dLdb], PEAK_LR);
    a = r.params[0]!;
    b = r.params[1]!;
    points.push([a, b]);
    losses.push(valley(a, b));
  }
  return { id: 'sgd', label: 'SGD', color: 'rgb(var(--series-2))', points, losses };
}

function runMomentum(start: [number, number], beta: number): OptimizerTrace {
  const points: Array<readonly [number, number]> = [start];
  const losses = [valley(start[0], start[1])];
  let state: MomentumState = { kind: 'momentum', velocity: [0, 0] };
  let a = start[0];
  let b = start[1];
  for (let t = 0; t < NUM_STEPS; t += 1) {
    const dLda = 1.0 * (a - 0.8);
    const dLdb = 8.0 * (b + 0.4);
    const r = sgdMomentumStep([a, b], [dLda, dLdb], PEAK_LR, beta, state);
    a = r.params[0]!;
    b = r.params[1]!;
    state = r.state;
    points.push([a, b]);
    losses.push(valley(a, b));
  }
  return { id: 'momentum', label: 'SGD + momentum', color: 'rgb(var(--series-3))', points, losses };
}

function runAdam(start: [number, number]): OptimizerTrace {
  const points: Array<readonly [number, number]> = [start];
  const losses = [valley(start[0], start[1])];
  let state: AdamState = {
    kind: 'adam',
    m: [0, 0],
    v: [0, 0],
    t: 0,
  };
  let a = start[0];
  let b = start[1];
  for (let t = 0; t < NUM_STEPS; t += 1) {
    const dLda = 1.0 * (a - 0.8);
    const dLdb = 8.0 * (b + 0.4);
    const r = adamStep([a, b], [dLda, dLdb], PEAK_LR, 0.9, 0.999, 1e-8, state);
    a = r.params[0]!;
    b = r.params[1]!;
    state = r.state;
    points.push([a, b]);
    losses.push(valley(a, b));
  }
  return { id: 'adam', label: 'Adam', color: 'rgb(var(--series-1))', points, losses };
}

export function OptimizerRace() {
  const [seed, setSeed] = useState<number>(0);
  const start: [number, number] = [-0.5, 0.8];
  const traces = useMemo(() => {
    return [runSGD(start), runMomentum(start, 0.9), runAdam(start)];
  }, [seed]);

  return (
    <SimFrame
      title="Optimizer race on a narrow valley"
      onReset={() => setSeed((s) => s + 1)}
      resetLabel="Re-run"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5">
        <div>
          <LossLandscape
            loss={([a, b]) => valley(a, b)}
            trajectories={traces.map((tr) => ({
              id: tr.id,
              points: tr.points,
              color: tr.color,
              label: tr.label,
            }))}
            marker={{ x: 0.8, y: -0.4, color: 'rgb(var(--fg-muted))' }}
            ariaLabel="2D loss surface (narrow valley) with three optimizer trajectories."
          />
          <div className="flex flex-wrap items-center gap-3 mt-3 font-mono text-[10px]">
            {traces.map((tr) => (
              <span key={tr.id} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block w-3 h-0.5"
                  style={{ background: tr.color }}
                />
                {tr.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: 'rgb(var(--fg-muted))' }}
              />
              true minimum
            </span>
          </div>
        </div>

        <div className="space-y-3 font-mono text-[12px]">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
            Final loss (after {NUM_STEPS} steps)
          </div>
          {traces.map((tr) => (
            <div key={tr.id} className="flex items-baseline justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: tr.color }}
                />
                {tr.label}
              </span>
              <span className="text-ink tabular-nums">
                {tr.losses[tr.losses.length - 1]!.toExponential(2)}
              </span>
            </div>
          ))}
          <LossTrace
            traces={traces}
            width={220}
            height={70}
          />
        </div>
      </div>
    </SimFrame>
  );
}

function LossTrace({
  traces,
  width,
  height,
}: {
  traces: OptimizerTrace[];
  width: number;
  height: number;
}) {
  // Combine all losses for shared y-axis.
  const all = traces.flatMap((t) => t.losses);
  const finite = all.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  const max = Math.max(...finite);
  const min = Math.min(...finite, 0);
  const range = Math.max(max - min, 1e-6);
  return (
    <div className="pt-3 border-t border-border">
      <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
        Loss vs step
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-label="Loss vs step (all three optimizers).">
        <line
          x1={0}
          y1={height}
          x2={width}
          y2={height}
          stroke="rgb(var(--border))"
          strokeWidth={1}
        />
        {traces.map((tr) => {
          const path = tr.losses
            .map((v, i) => {
              if (!Number.isFinite(v)) return null;
              const x = (i / Math.max(1, tr.losses.length - 1)) * width;
              const y = height - ((Math.min(v, max) - min) / range) * height;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .filter(Boolean)
            .join(' ');
          return (
            <polyline
              key={tr.id}
              points={path}
              fill="none"
              stroke={tr.color}
              strokeWidth={1.25}
              opacity={0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Secondary widget: just the momentum optimizer at varying β.
 * Plain β=0 oscillates; higher β smooths out and accelerates
 * through the valley; β close to 1 dampens too much and slows.
 */
export function MomentumSweep() {
  const [beta, setBeta] = useState<number>(0.9);
  const start: [number, number] = [-0.5, 0.8];
  const trace = useMemo(() => runMomentum(start, beta), [beta]);
  return (
    <SimFrame title="Momentum coefficient β">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5">
        <div>
          <LossLandscape
            loss={([a, b]) => valley(a, b)}
            trajectories={[
              {
                id: 'm',
                points: trace.points,
                color: 'rgb(var(--series-3))',
                label: `β = ${beta.toFixed(2)}`,
              },
            ]}
            marker={{ x: 0.8, y: -0.4, color: 'rgb(var(--fg-muted))' }}
            ariaLabel="Momentum trajectory at a chosen beta."
          />
        </div>
        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                β
              </span>
              <span className="text-ink tabular-nums">{beta.toFixed(2)}</span>
            </div>
            <Slider
              value={beta}
              min={0}
              max={0.99}
              step={0.01}
              onChange={setBeta}
              formatValue={(v) => v.toFixed(2)}
              ariaLabel="Momentum coefficient beta"
            />
          </div>
          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Start loss</span>
              <span className="text-ink tabular-nums">
                {trace.losses[0]!.toFixed(3)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">End loss</span>
              <span
                className={
                  trace.losses[trace.losses.length - 1]! < 0.1
                    ? 'text-accent tabular-nums'
                    : 'text-ink tabular-nums'
                }
              >
                {trace.losses[trace.losses.length - 1]!.toExponential(2)}
              </span>
            </div>
            <p className="text-[10px] text-fg-subtle mt-2">
              β=0 reduces to plain SGD. β close to 1 damps out new
              information and the velocity accumulates slowly. The
              sweet spot is usually around 0.9.
            </p>
          </div>
        </div>
      </div>
    </SimFrame>
  );
}
