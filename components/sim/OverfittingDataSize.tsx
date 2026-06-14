'use client';

import { useEffect, useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';

const X_RANGE: [number, number] = [-1, 1];
const Y_RANGE: [number, number] = [-1.6, 1.6];
const PLOT_W = 420;
const PLOT_H = 220;
const PAD = 28;
const DEG = 12;

function toScreenX(x: number): number {
  return PAD + ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * (PLOT_W - 2 * PAD);
}
function toScreenY(y: number): number {
  return PLOT_H - PAD - ((y - Y_RANGE[0]) / (Y_RANGE[1] - Y_RANGE[0])) * (PLOT_H - 2 * PAD);
}

/**
 * Secondary widget for the overfitting lesson: dataset size slider.
 * Same fixed-degree high-variance polynomial fit (degree 12, on
 * a 20-point sin(2x) + noise dataset). With fewer points the test
 * loss is much higher; with more points it shrinks. Demonstrates
 * that *more data* fixes overfitting where a smaller model
 * wouldn't.
 */
export function OverfittingDataSize() {
  const [n, setN] = useState<number>(14);
  const [sweep, setSweep] = useState<{ n: number; train: number; test: number }[]>([]);
  const [fitModule, setFitModule] = useState<typeof import('@/lib/math/polynomial-fit') | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/math/polynomial-fit').then((m) => {
      if (!cancelled) setFitModule(() => m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-compute the loss sweep on n change. The original 20-point
  // dataset is generated from the same seed; we sub-sample to `n`
  // for the train set and use a fixed held-out test of the same 6
  // points (the last 6 of the original 20).
  useEffect(() => {
    if (!fitModule) return;
    const all = fitModule.syntheticRegression(20, 0);
    const xsTrain = all.xs.slice(0, n);
    const ysTrain = all.ys.slice(0, n);
    const xsTest = all.xs.slice(14);
    const ysTest = all.ys.slice(14);
    const w = fitModule.polyFit(xsTrain, ysTrain, DEG);
    if (!w) return;
    const trainPred = fitModule.evalPolyVector(w, xsTrain);
    const testPred = fitModule.evalPolyVector(w, xsTest);
    const entry = {
      n,
      train: fitModule.mse(ysTrain, trainPred),
      test: fitModule.mse(ysTest, testPred),
    };
    setSweep((prev) => {
      // Keep unique n entries; sorted by n.
      const without = prev.filter((s) => s.n !== n);
      return [...without, entry].sort((a, b) => a.n - b.n);
    });
  }, [n, fitModule]);

  const finite = sweep.filter((s) => Number.isFinite(s.train) && Number.isFinite(s.test));
  const current = sweep.find((s) => s.n === n);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Same model, more or less data
        </h3>
        <div className="text-[10px] text-dim font-mono">
          degree {DEG} · test set is fixed at the last 6 points
        </div>
      </div>

      <div className="space-y-3 font-mono text-[12px]">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
              Training-set size
            </span>
            <span className="text-ink tabular-nums">{n}</span>
          </div>
          <Slider
            value={n}
            min={4}
            max={14}
            step={1}
            onChange={(v) => setN(Math.round(v))}
            formatValue={(v) => String(Math.round(v))}
            ariaLabel="Training-set size"
          />
        </div>

        <div className="pt-3 border-t border-border space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-dim">Train loss</span>
            <span className="text-ink tabular-nums">
              {current ? current.train.toFixed(3) : '—'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dim">Test loss</span>
            <span
              className={
                current && current.test > current.train * 1.5
                  ? 'text-[rgb(var(--negative))] tabular-nums'
                  : 'text-ink tabular-nums'
              }
            >
              {current ? current.test.toFixed(3) : '—'}
            </span>
          </div>
        </div>

        {finite.length > 1 && (
          <div className="pt-3 border-t border-border">
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
              Test loss as the training set grows
            </div>
            <SizeSweep sweep={finite} currentN={n} />
          </div>
        )}

        <p className="text-[10px] text-fg-subtle font-mono leading-relaxed pt-2">
          Same high-variance fit (degree {DEG}). Drag the size slider; the
          test-loss trace below records every n you visit. More data
          closes the train-test gap.
        </p>
      </div>
    </div>
  );
}

function SizeSweep({
  sweep,
  currentN,
}: {
  sweep: readonly { n: number; train: number; test: number }[];
  currentN: number;
}) {
  const maxY = Math.max(...sweep.map((s) => Math.max(s.train, s.test)));
  const yMax = Math.max(maxY, 0.1);
  const x0 = PAD;
  const x1 = PLOT_W - PAD;
  const y0 = PLOT_H - PAD;
  const y1 = PAD;
  const N_MIN = 4;
  const N_MAX = 14;
  const xs = (n: number) =>
    x0 + ((n - N_MIN) / (N_MAX - N_MIN)) * (x1 - x0);
  const ys = (v: number) => y0 - (v / yMax) * (y0 - y1);
  const trainPath = sweep
    .map((s) => `${xs(s.n).toFixed(1)},${ys(s.train).toFixed(1)}`)
    .join(' ');
  const testPath = sweep
    .map((s) => `${xs(s.n).toFixed(1)},${ys(s.test).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Train and test MSE as a function of training-set size."
    >
      <line
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y0}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
      <line
        x1={x0}
        y1={y0}
        x2={x0}
        y2={y1}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
      <polyline
        points={testPath}
        fill="none"
        stroke="rgb(var(--negative))"
        strokeWidth={1.5}
      />
      <polyline
        points={trainPath}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
      />
      <line
        x1={xs(currentN)}
        y1={y1}
        x2={xs(currentN)}
        y2={y0}
        stroke="rgb(var(--fg-muted))"
        strokeWidth={0.8}
        strokeDasharray="2 3"
        opacity={0.7}
      />
    </svg>
  );
}
