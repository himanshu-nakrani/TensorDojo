

import { useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { BarChart } from '@/components/sim/primitives/BarChart';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  constant,
  cosineDecay,
  linearDecay,
  sampleSchedule,
  warmupCosine,
} from '@/lib/math/schedules';

type ScheduleKind = 'constant' | 'linear' | 'cosine' | 'warmup-cosine';

/**
 * Centerpiece for the learning-rate schedules lesson. Sliders
 * for total steps, peak LR, and warmup steps, plus a
 * schedule-kind selector (constant / linear / cosine /
 * warmup+cosine). The top plot shows the schedule shape; the
 * bottom plot is a simulated loss trajectory under that
 * schedule (a fixed synthetic loss curve, with a noisy
 * gradient signal the optimizer walks down). The reader
 * watches the schedule change the loss trajectory in real
 * time.
 */

const SCHEDULES: ReadonlyArray<{ value: ScheduleKind; label: string }> = [
  { value: 'constant', label: 'Constant' },
  { value: 'linear', label: 'Linear' },
  { value: 'cosine', label: 'Cosine' },
  { value: 'warmup-cosine', label: 'Warmup + cosine' },
];

/**
 * A synthetic "loss landscape" that the optimizer walks down
 * with a noisy gradient. The landscape is a sum of two
 * wells so the trajectory has some structure: an early
 * minimum, a saddle, and a deeper minimum. The gradient is
 * deterministic + a small noise term that the LR scales.
 */
function syntheticGradient(t: number, lr: number, total: number): number {
  // Two components: a "useful" descent that decreases over
  // time, plus a small oscillation that the LR damps.
  const useful = 0.5 * Math.exp(-3 * t / total);
  const osc = 0.05 * Math.sin(8 * t / total);
  return (useful + osc) * lr;
}

export function ScheduleExplorer() {
  const [total, setTotal] = useState<number>(200);
  const [peak, setPeak] = useState<number>(0.05);
  const [warmupSteps, setWarmupSteps] = useState<number>(10);
  const [schedule, setSchedule] = useState<ScheduleKind>('warmup-cosine');

  const scheduleFn = useMemo(() => {
    const f = (t: number): number => {
      switch (schedule) {
        case 'constant':
          return constant(t, total, peak);
        case 'linear':
          return linearDecay(t, total, peak);
        case 'cosine':
          return cosineDecay(t, total, peak);
        case 'warmup-cosine':
          return warmupCosine(t, total, peak, warmupSteps);
      }
    };
    return f;
  }, [schedule, total, peak, warmupSteps]);

  const sampled = useMemo(
    () => sampleSchedule(scheduleFn, total, 200),
    [scheduleFn, total],
  );

  // Simulate the loss trajectory: start at L=1.0, each step
  // subtracts syntheticGradient(t, lr, total), with a clamp at
  // zero. This is a stand-in for "what the loss curve looks
  // like under this schedule" — not a real training run.
  const lossTrajectory = useMemo(() => {
    let l = 1.0;
    const out = [l];
    for (let t = 0; t < total; t += 1) {
      const lr = scheduleFn(t);
      const g = syntheticGradient(t, lr, total);
      l = Math.max(0, l - g);
      out.push(l);
    }
    return out;
  }, [scheduleFn, total]);

  const reset = () => {
    setTotal(200);
    setPeak(0.05);
    setWarmupSteps(10);
    setSchedule('warmup-cosine');
  };

  return (
    <SimFrame title="LR over training · loss falls under it" onReset={reset}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5">
        <div className="space-y-4">
          {/* LR schedule plot */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Learning rate over time
            </div>
            <LineChart
              x={sampled.steps}
              y={sampled.lrs}
              color="rgb(var(--accent))"
              yMax={peak * 1.1}
              width={420}
              height={120}
              ariaLabel="Learning rate schedule over time."
            />
          </div>
          {/* Loss trajectory */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Simulated loss trajectory
            </div>
            <LineChart
              x={lossTrajectory.map((_, i) => i)}
              y={lossTrajectory}
              color="rgb(var(--fg-muted))"
              yMax={1.1}
              width={420}
              height={120}
              ariaLabel="Simulated loss over time."
            />
          </div>
        </div>

        <div className="space-y-4 font-mono text-[12px]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Schedule
            </div>
            <div className="grid grid-cols-2 gap-1">
              {SCHEDULES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSchedule(s.value)}
                  className={
                    'text-[11px] uppercase tracking-[0.12em] font-mono py-1 rounded border focus-ring transition-colors ' +
                    (schedule === s.value
                      ? 'border-accent text-accent'
                      : 'border-border text-muted hover:text-ink')
                  }
                  aria-pressed={schedule === s.value}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
                Total steps
              </span>
              <span className="text-ink tabular-nums">{total}</span>
            </div>
            <Slider
              value={total}
              min={50}
              max={1000}
              step={10}
              onChange={(v) => setTotal(Math.round(v))}
              formatValue={(v) => String(Math.round(v))}
              ariaLabel="Total steps"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
                Peak LR
              </span>
              <span className="text-ink tabular-nums">{peak.toFixed(3)}</span>
            </div>
            <Slider
              value={peak}
              min={0.001}
              max={0.2}
              step={0.001}
              onChange={setPeak}
              formatValue={(v) => v.toFixed(3)}
              ariaLabel="Peak learning rate"
            />
          </div>

          {schedule === 'warmup-cosine' && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
                  Warmup steps
                </span>
                <span className="text-ink tabular-nums">{warmupSteps}</span>
              </div>
              <Slider
                value={warmupSteps}
                min={0}
                max={Math.max(0, Math.floor(total / 2))}
                step={1}
                onChange={(v) => setWarmupSteps(Math.round(v))}
                formatValue={(v) => String(Math.round(v))}
                ariaLabel="Warmup steps"
              />
            </div>
          )}

          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">End loss (sim)</span>
              <span className="text-ink tabular-nums">
                {lossTrajectory[lossTrajectory.length - 1]!.toFixed(3)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">LR at end</span>
              <span className="text-ink tabular-nums">
                {scheduleFn(total).toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SimFrame>
  );
}

function LineChart({
  x,
  y,
  color,
  yMax,
  width,
  height,
  ariaLabel,
}: {
  x: readonly number[];
  y: readonly number[];
  color: string;
  yMax: number;
  width: number;
  height: number;
  ariaLabel: string;
}) {
  if (x.length === 0) return null;
  const xMin = x[0]!;
  const xMax = x[x.length - 1]!;
  const xRange = Math.max(xMax - xMin, 1e-6);
  const yClamped = yMax > 0 ? yMax : 1;
  const path = y
    .map((v, i) => {
      if (!Number.isFinite(v)) return null;
      const xp = ((x[i]! - xMin) / xRange) * width;
      const yp = height - (Math.min(v, yClamped) / yClamped) * height;
      return `${xp.toFixed(1)},${yp.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto bg-bg/40 rounded"
      aria-label={ariaLabel}
    >
      <line
        x1={0}
        y1={height}
        x2={width}
        y2={height}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
      <polyline points={path} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

/**
 * Secondary widget: three schedules side-by-side on the same
 * synthetic loss problem. Three columns, each runs 300 steps
 * and reports the final loss. Demonstrates why warmup + cosine
 * wins.
 */
export function ScheduleComparison() {
  const [total, setTotal] = useState<number>(300);
  const [peak, setPeak] = useState<number>(0.05);

  const results = useMemo(() => {
    const warmup = Math.floor(total * 0.05);
    const run = (fn: (t: number) => number) => {
      let l = 1.0;
      for (let t = 0; t < total; t += 1) {
        const lr = fn(t);
        const g = syntheticGradient(t, lr, total);
        l = Math.max(0, l - g);
      }
      return l;
    };
    return [
      { label: 'Constant', final: run((t) => constant(t, total, peak)) },
      { label: 'Cosine', final: run((t) => cosineDecay(t, total, peak)) },
      { label: 'Warmup + cosine', final: run((t) => warmupCosine(t, total, peak, warmup)) },
    ];
  }, [total, peak]);

  const minFinal = Math.min(...results.map((r) => r.final));

  const reset = () => {
    setTotal(300);
    setPeak(0.05);
  };

  return (
    <SimFrame title="Three schedules, same problem" onReset={reset}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[12px]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Total steps
            </div>
            <Slider
              value={total}
              min={50}
              max={1000}
              step={10}
              onChange={(v) => setTotal(Math.round(v))}
              formatValue={(v) => String(Math.round(v))}
              ariaLabel="Total steps"
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1 tabular-nums">
              Peak LR ({peak.toFixed(3)})
            </div>
            <Slider
              value={peak}
              min={0.001}
              max={0.2}
              step={0.001}
              onChange={setPeak}
              formatValue={(v) => v.toFixed(3)}
              ariaLabel="Peak learning rate"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {results.map((r) => {
            const isBest = r.final === minFinal;
            return (
              <div
                key={r.label}
                className={
                  'rounded-md border p-4 ' +
                  (isBest
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-bg-elevated')
                }
              >
                <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
                  {r.label}
                </div>
                <div
                  className={
                    isBest
                      ? 'text-accent text-2xl font-mono tabular-nums'
                      : 'text-ink text-2xl font-mono tabular-nums'
                  }
                >
                  {r.final.toFixed(3)}
                </div>
                <div className="text-[11px] text-fg-subtle font-mono mt-1">
                  final loss{isBest ? ' (best)' : ''}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-fg-subtle font-mono">
          The same synthetic loss problem, three schedules,
          same total steps and peak LR. Warmup + cosine lets
          the model reach a better minimum because the LR is
          large enough to explore early, then shrinks to let
          the model settle.
        </p>
      </div>
    </SimFrame>
  );
}
