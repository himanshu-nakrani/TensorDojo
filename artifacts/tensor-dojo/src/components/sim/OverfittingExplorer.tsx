

import { useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  evalPolyVector,
  mse,
  polyFit,
  syntheticRegression,
} from '@/lib/math/polynomial-fit';

/**
 * Centerpiece for the overfitting lesson.
 *
 * A polynomial regression toy on a fixed 20-point dataset. The
 * reader drags the degree slider (1–15) and watches the fitted
 * curve weave through the data; the train + test loss curves
 * show the classic U-shape: both fall, then test loss bottoms
 * out around degree 4–5 and climbs back up while train loss
 * keeps falling. That gap is overfitting.
 *
 *   - Data: sin(2x) target with deterministic noise.
 *   - Train: first 14 points; test: last 6 points.
 *   - Fit: closed-form least-squares (polyFit). Re-runs on every
 *     degree change (the design matrix is small — at most 16×16).
 */

const DEG_MIN = 1;
// Cap at 12: 14 training points, so degree 13 is a square (ill-conditioned)
// design and polyFit returns null. Degree 12 still overfits visibly.
const DEG_MAX = 12;
const X_RANGE: [number, number] = [-1, 1];
const Y_RANGE: [number, number] = [-1.6, 1.6];

const PLOT_W = 420;
const PLOT_H = 220;
const PAD = 28;

function toScreenX(x: number): number {
  return PAD + ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * (PLOT_W - 2 * PAD);
}
function toScreenY(y: number): number {
  return PLOT_H - PAD - ((y - Y_RANGE[0]) / (Y_RANGE[1] - Y_RANGE[0])) * (PLOT_H - 2 * PAD);
}

// ⚡ Bolt Optimization: Pre-compute all entirely static geometry and models
// Build the dataset once (seed 0) — the lesson is the *fit*,
// not the data. Train on the first 14, test on the last 6.
const STATIC_D = syntheticRegression(20, 0);
const STATIC_SPLIT = {
  xsTrain: STATIC_D.xs.slice(0, 14),
  ysTrain: STATIC_D.ys.slice(0, 14),
  xsTest: STATIC_D.xs.slice(14),
  ysTest: STATIC_D.ys.slice(14),
  clean: STATIC_D.clean,
  xsAll: STATIC_D.xs,
  ysAll: STATIC_D.ys,
};

// Smooth curve for the fit: evaluate on a dense x grid.
const STATIC_X_DENSE: number[] = [];
const N_DENSE = 60;
for (let i = 0; i < N_DENSE; i += 1) {
  STATIC_X_DENSE.push(X_RANGE[0] + (i / (N_DENSE - 1)) * (X_RANGE[1] - X_RANGE[0]));
}
const STATIC_CLEAN_DENSE = STATIC_X_DENSE.map((x) => Math.sin(2 * x));

// Fits cached by degree: pre-computed sweeps so we don't recompute on render
const STATIC_SWEEP: { deg: number; train: number; test: number }[] = [];
const STATIC_FIT_DENSE: Record<number, number[]> = {};

for (let d = 1; d <= DEG_MAX; d += 1) {
  const w = polyFit(STATIC_SPLIT.xsTrain, STATIC_SPLIT.ysTrain, d);
  if (!w) {
    STATIC_SWEEP.push({ deg: d, train: NaN, test: NaN });
    STATIC_FIT_DENSE[d] = [];
    continue;
  }
  STATIC_FIT_DENSE[d] = evalPolyVector(w, STATIC_X_DENSE);
  const trainPred = evalPolyVector(w, STATIC_SPLIT.xsTrain);
  const testPred = evalPolyVector(w, STATIC_SPLIT.xsTest);
  STATIC_SWEEP.push({ deg: d, train: mse(STATIC_SPLIT.ysTrain, trainPred), test: mse(STATIC_SPLIT.ysTest, testPred) });
}

export function OverfittingExplorer() {
  const [degree, setDegree] = useState<number>(12);

  const fitDense = STATIC_FIT_DENSE[degree] ?? [];
  const currentTrain = STATIC_SWEEP[degree - 1]?.train ?? NaN;
  const currentTest = STATIC_SWEEP[degree - 1]?.test ?? NaN;

  const reset = () => {
    setDegree(12);
  };

  return (
    <SimFrame
      title="Crank polynomial degree · watch test loss climb"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-dim font-mono">
            fit on {STATIC_SPLIT.xsTrain.length} of {STATIC_SPLIT.xsAll.length} points · test set size{' '}
            {STATIC_SPLIT.xsTest.length}
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
      headerWrap
    >
      <div className="sim-split" style={{ ['--sim-aside-w' as string]: '220px' }}>
      <div className="sim-split__grid">
        <div>
          <FitPlot
            xDense={STATIC_X_DENSE}
            cleanDense={STATIC_CLEAN_DENSE}
            fitDense={fitDense}
            xsTrain={STATIC_SPLIT.xsTrain}
            ysTrain={STATIC_SPLIT.ysTrain}
            xsTest={STATIC_SPLIT.xsTest}
            ysTest={STATIC_SPLIT.ysTest}
          />
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Train + test loss vs degree
            </div>
            <LossSweep
              sweep={STATIC_SWEEP}
              currentDegree={degree}
            />
          </div>
        </div>

        <div className="sim-split__aside space-y-3 font-mono text-[12px]">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
                Polynomial degree
              </span>
              <span className="text-ink tabular-nums">{degree}</span>
            </div>
            <Slider
              value={degree}
              min={DEG_MIN}
              max={DEG_MAX}
              step={1}
              onChange={(v) => setDegree(Math.round(v))}
              formatValue={(v) => String(Math.round(v))}
              ariaLabel="Polynomial degree"
            />
          </div>

          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Train loss</span>
              <span className="text-ink tabular-nums">
                {Number.isFinite(currentTrain) ? currentTrain.toFixed(3) : '—'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Test loss</span>
              <span
                className={
                  Number.isFinite(currentTest) && currentTest > currentTrain * 1.5
                    ? 'text-[rgb(var(--negative))] tabular-nums'
                    : 'text-ink tabular-nums'
                }
              >
                {Number.isFinite(currentTest) ? currentTest.toFixed(3) : '—'}
              </span>
            </div>
            <p className="text-[11px] text-fg-subtle font-mono mt-2 leading-relaxed">
              Gray dashed is the true sin(2x) curve. The blue line is the
              polynomial fit; circles are the data. Train = filled blue,
              test = filled red.
            </p>
          </div>
        </div>
      </div>
      </div>
    </SimFrame>
  );
}

function FitPlot({
  xDense,
  cleanDense,
  fitDense,
  xsTrain,
  ysTrain,
  xsTest,
  ysTest,
}: {
  xDense: readonly number[];
  cleanDense: readonly number[];
  fitDense: readonly number[];
  xsTrain: readonly number[];
  ysTrain: readonly number[];
  xsTest: readonly number[];
  ysTest: readonly number[];
}) {
  const fitPath = xDense
    .map((x, i) => `${toScreenX(x).toFixed(1)},${toScreenY(fitDense[i] ?? 0).toFixed(1)}`)
    .join(' ');
  const cleanPath = xDense
    .map((x, i) => `${toScreenX(x).toFixed(1)},${toScreenY(cleanDense[i] ?? 0).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Polynomial fit on a noisy sin(2x) dataset. The gray dashed curve is the true function; the blue curve is the fit; filled blue circles are training points, filled red circles are test points."
    >
      {/* Axes */}
      <line
        x1={PAD}
        y1={toScreenY(0)}
        x2={PLOT_W - PAD}
        y2={toScreenY(0)}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
      <line
        x1={toScreenX(0)}
        y1={PAD}
        x2={toScreenX(0)}
        y2={PLOT_H - PAD}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
      {/* True curve (gray dashed) */}
      <polyline
        points={cleanPath}
        fill="none"
        stroke="rgb(var(--fg-muted))"
        strokeWidth={1.2}
        strokeDasharray="3 3"
        opacity={0.7}
      />
      {/* Fit curve (accent) */}
      <polyline
        points={fitPath}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={2}
      />
      {/* Test points (red filled) */}
      {xsTest.map((x, i) => (
        <circle
          key={`test-${i}`}
          cx={toScreenX(x)}
          cy={toScreenY(ysTest[i] ?? 0)}
          r={3.5}
          fill="rgb(var(--negative))"
          opacity={0.85}
        />
      ))}
      {/* Train points (accent filled) */}
      {xsTrain.map((x, i) => (
        <circle
          key={`train-${i}`}
          cx={toScreenX(x)}
          cy={toScreenY(ysTrain[i] ?? 0)}
          r={3.5}
          fill="rgb(var(--accent))"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

function LossSweep({
  sweep,
  currentDegree,
}: {
  sweep: readonly { deg: number; train: number; test: number }[];
  currentDegree: number;
}) {
  const finite = sweep.filter((s) => Number.isFinite(s.train) && Number.isFinite(s.test));
  if (finite.length === 0) return null;
  const maxY = Math.max(...finite.map((s) => Math.max(s.train, s.test)));
  const minY = 0;
  const yMax = Math.max(maxY, 0.1);
  const x0 = PAD;
  const x1 = PLOT_W - PAD;
  const y0 = PLOT_H - PAD;
  const y1 = PAD;
  const xs = (d: number) => x0 + ((d - DEG_MIN) / (DEG_MAX - DEG_MIN)) * (x1 - x0);
  const ys = (v: number) => y0 - ((v - minY) / (yMax - minY)) * (y0 - y1);

  const trainPath = sweep
    .map((s) => {
      if (!Number.isFinite(s.train)) return null;
      return `${xs(s.deg).toFixed(1)},${ys(s.train).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');
  const testPath = sweep
    .map((s) => {
      if (!Number.isFinite(s.test)) return null;
      return `${xs(s.deg).toFixed(1)},${ys(s.test).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Train and test MSE as a function of polynomial degree."
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
      {/* Current-degree marker */}
      <line
        x1={xs(currentDegree)}
        y1={y1}
        x2={xs(currentDegree)}
        y2={y0}
        stroke="rgb(var(--fg-muted))"
        strokeWidth={0.8}
        strokeDasharray="2 3"
        opacity={0.7}
      />
      {/* Legend swatch */}
      <line
        x1={x0 + 6}
        y1={y0 - 14}
        x2={x0 + 20}
        y2={y0 - 14}
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
      />
      <text
        x={x0 + 24}
        y={y0 - 11}
        className="fill-dim font-mono"
        fontSize={9}
      >
        train
      </text>
      <line
        x1={x0 + 70}
        y1={y0 - 14}
        x2={x0 + 84}
        y2={y0 - 14}
        stroke="rgb(var(--negative))"
        strokeWidth={1.5}
      />
      <text
        x={x0 + 88}
        y={y0 - 11}
        className="fill-dim font-mono"
        fontSize={9}
      >
        test
      </text>
    </svg>
  );
}
