'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { LossLandscape } from '@/components/sim/primitives/LossLandscape';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  batchLoss,
  gradientEmpiricalStats,
  runSgd,
  syntheticDataset,
  trueGradient,
  type ToyModel,
} from '@/lib/math/sgd';

/**
 * Centerpiece for the SGD lesson. A 2D regression problem
 * (f(x, y) = sin(2x)·cos(2y), 30 noisy samples) with a small
 * 3-parameter linear model ŷ = a·x + b·y + c. The loss is
 * mean ½(ŷ − t)² over a sampled batch. A batch-size slider
 * controls the SGD step.
 *
 * The same start point is launched under four batch sizes
 * (1, 4, 16, full) so the reader can see all four failure
 * modes at once: one-sample zigzags, mini-batch is a clean
 * curve, full-batch is a smooth trajectory, and the loss-vs-step
 * curve below shows the noise vs throughput tradeoff.
 */

const BATCH_PRESETS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: '1' },
  { value: 4, label: '4' },
  { value: 16, label: '16' },
  { value: 30, label: 'all' },
];

// A simple 2D quadratic in (a, b) that captures the SGD intuition.
// (c is fixed at 0.5 to keep the lesson focused on the
// batch-size effect on the trajectory; the loss surface is
// 2D in (a, b).)
const FIXED_C = 0.5;
function lossAB(a: number, b: number): number {
  // Hand-tuned so the surface has a clear minimum and the
  // mini-batch trajectories don't all snap to the same line.
  return 0.4 * (a - 0.8) ** 2 + 0.6 * (b + 0.4) ** 2 + 0.2 * a * b;
}

const NUM_STEPS = 30;
const ETA = 0.4;

export function SGDBatchExplorer() {
  const dataset = useMemo(() => syntheticDataset(), []);
  const [batchSize, setBatchSize] = useState<number>(4);
  const [step, setStep] = useState<number>(0); // bumps to re-run
  const [runLength, setRunLength] = useState<number>(NUM_STEPS);

  // The full trajectory under the chosen batch size.
  const trajectory = useMemo(() => {
    const start: ToyModel = { a: 0, b: 0, c: FIXED_C };
    return runSgd(start, dataset, batchSize, ETA, runLength, step);
  }, [dataset, batchSize, step, runLength]);

  // We also run mini-trajectories at all four batch sizes so the
  // reader can see the comparison on one plot. The 1-sample
  // trajectory is the noisiest.
  const allTrajectories = useMemo(() => {
    const start: ToyModel = { a: 0, b: 0, c: FIXED_C };
    return BATCH_PRESETS.map((bp) => ({
      id: `b${bp.value}`,
      batchSize: bp.value,
      label: bp.label,
      result: runSgd(start, dataset, bp.value, ETA, runLength, step),
    }));
  }, [dataset, step, runLength]);

  const colors = [
    'rgb(var(--series-1))',
    'rgb(var(--series-2))',
    'rgb(var(--series-3))',
    'rgb(var(--series-4))',
  ];

  const chosen = allTrajectories.find((t) => t.batchSize === batchSize)!;
  const finalLoss = chosen.result.losses[chosen.result.losses.length - 1]!;

  return (
    <SimFrame
      title="Mini-batch SGD on a noisy landscape"
      onReset={() => setStep((s) => s + 1)}
      resetLabel="Re-run"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5">
        {/* Loss surface + trajectories */}
        <div>
          <LossLandscape
            loss={([a, b]) => lossAB(a, b)}
            trajectories={allTrajectories.map((tr, i) => ({
              id: tr.id,
              points: tr.result.trajectory.map((m) => [m.a, m.b] as [number, number]),
              color: colors[i % colors.length]!,
              label: `batch ${tr.label}`,
            }))}
            marker={{ x: 0.8, y: -0.4, color: 'rgb(var(--fg-muted))' }}
            ariaLabel="2D loss surface (a, b) with SGD trajectories at four batch sizes."
          />
          <div className="flex flex-wrap items-center gap-3 mt-3 font-mono text-[10px]">
            {BATCH_PRESETS.map((bp, i) => (
              <span key={bp.value} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block w-3 h-0.5"
                  style={{ background: colors[i % colors.length] }}
                />
                batch {bp.label}
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

        {/* Controls */}
        <div className="space-y-4 font-mono text-[12px]">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Batch size
              </span>
              <span className="text-ink tabular-nums">
                {batchSize === 30 ? 'all (30)' : batchSize}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {BATCH_PRESETS.map((bp) => (
                <button
                  key={bp.value}
                  type="button"
                  onClick={() => setBatchSize(bp.value)}
                  className={
                    'text-[10px] uppercase tracking-[0.18em] font-mono py-1 rounded border focus-ring transition-colors ' +
                    (batchSize === bp.value
                      ? 'border-accent text-accent'
                      : 'border-border text-muted hover:text-ink')
                  }
                  aria-pressed={batchSize === bp.value}
                >
                  {bp.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Steps
              </span>
              <span className="text-ink tabular-nums">{runLength}</span>
            </div>
            <Slider
              value={runLength}
              min={5}
              max={80}
              step={5}
              onChange={(v) => setRunLength(Math.round(v))}
              formatValue={(v) => String(Math.round(v))}
              ariaLabel="Number of steps"
            />
          </div>

          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Start loss</span>
              <span className="text-ink tabular-nums">
                {trajectory.losses[0]!.toFixed(3)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">End loss (b={batchSize === 30 ? 'all' : batchSize})</span>
              <span
                className={
                  finalLoss < trajectory.losses[0]! / 2
                    ? 'text-accent tabular-nums'
                    : 'text-ink tabular-nums'
                }
              >
                {finalLoss.toFixed(3)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Dataset</span>
              <span className="text-ink tabular-nums">{dataset.length} pts</span>
            </div>
          </div>

          <LossTrace
            label="Loss vs step (this batch)"
            losses={chosen.result.losses}
            color={colors[BATCH_PRESETS.findIndex((p) => p.value === batchSize)]!}
          />
        </div>
      </div>
    </SimFrame>
  );
}

function LossTrace({
  label,
  losses,
  color,
}: {
  label: string;
  losses: readonly number[];
  color: string;
}) {
  const w = 200;
  const h = 60;
  const finite = losses.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  const max = Math.max(...finite);
  const min = Math.min(...finite);
  const range = Math.max(max - min, 1e-6);
  const path = losses
    .map((v, i) => {
      if (!Number.isFinite(v)) return null;
      const x = (i / Math.max(1, losses.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');
  return (
    <div className="pt-3 border-t border-border">
      <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
        {label}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-label={label}>
        <line
          x1={0}
          y1={h}
          x2={w}
          y2={h}
          stroke="rgb(var(--border))"
          strokeWidth={1}
        />
        <polyline points={path} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    </div>
  );
}

/**
 * Secondary widget: a histogram of mini-batch gradient estimates
 * at a chosen batch size, with the true full-batch gradient marked.
 * Tells the same story as the centerpiece's "variance shrinks
 * with batch size" intuition, with actual numbers.
 */
export function SGDVarianceHistogram() {
  const dataset = useMemo(() => syntheticDataset(), []);
  const [batchSize, setBatchSize] = useState<number>(4);
  const m: ToyModel = { a: 0.5, b: -0.2, c: FIXED_C };
  const trueG = useMemo(() => trueGradient(m, dataset), [dataset]);
  const stats = useMemo(
    () => gradientEmpiricalStats(m, dataset, batchSize, 100, 7),
    [dataset, batchSize],
  );

  // Build a histogram of the 'a' coordinate (the rest are similar).
  const samples = stats.samples.map((s) => s.a);
  const lo = Math.min(...samples, trueG.a);
  const hi = Math.max(...samples, trueG.a);
  const NB = 20;
  const counts = new Array<number>(NB).fill(0);
  const binW = (hi - lo) / NB;
  for (const s of samples) {
    const b = Math.min(NB - 1, Math.max(0, Math.floor((s - lo) / binW)));
    counts[b]! += 1;
  }
  const maxC = Math.max(...counts);
  const w = 360;
  const h = 80;
  const barW = w / NB;

  return (
    <SimFrame title="Gradient estimate variance">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5">
        <div>
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-label="Histogram of mini-batch gradient estimates (a).">
            {counts.map((c, i) => {
              const barH = (c / maxC) * (h - 8);
              return (
                <rect
                  key={i}
                  x={i * barW}
                  y={h - barH}
                  width={barW - 1}
                  height={barH}
                  fill="rgb(var(--border-strong))"
                />
              );
            })}
            {/* True gradient line */}
            {(() => {
              const x = ((trueG.a - lo) / (hi - lo)) * w;
              return (
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={h}
                  stroke="rgb(var(--accent))"
                  strokeWidth={1.5}
                />
              );
            })()}
          </svg>
          <div className="flex items-center justify-between text-[10px] text-dim font-mono mt-1">
            <span className="tabular-nums">{lo.toFixed(3)}</span>
            <span>gradient estimate (a)</span>
            <span className="tabular-nums">{hi.toFixed(3)}</span>
          </div>
          <div className="text-[10px] text-fg-subtle font-mono mt-1">
            Vertical line: true full-batch gradient. Bars: 100 mini-batch estimates.
          </div>
        </div>
        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
              Batch size
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[1, 4, 16, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBatchSize(n)}
                  className={
                    'text-[10px] uppercase tracking-[0.18em] font-mono py-1 rounded border focus-ring transition-colors ' +
                    (batchSize === n
                      ? 'border-accent text-accent'
                      : 'border-border text-muted hover:text-ink')
                  }
                  aria-pressed={batchSize === n}
                >
                  {n === 30 ? 'all' : n}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Var(a)</span>
              <span className="text-ink tabular-nums">
                {stats.variance.a.toExponential(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Var(b)</span>
              <span className="text-ink tabular-nums">
                {stats.variance.b.toExponential(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Var(c)</span>
              <span className="text-ink tabular-nums">
                {stats.variance.c.toExponential(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Loss at (a, b, c)</span>
              <span className="text-ink tabular-nums">
                {batchLoss(m, dataset).toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SimFrame>
  );
}
