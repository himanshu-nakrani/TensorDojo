'use client';

import { useEffect, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { l2PolyFit } from '@/lib/math/regularization';
import { evalPolyVector, mse, syntheticRegression } from '@/lib/math/polynomial-fit';

const LAMBDA_MIN = 1e-4;
const LAMBDA_MAX = 1e1;

/**
 * Secondary widget for the weight-decay lesson: train + test
 * loss vs λ on a log-scale x-axis. The classic U-shape
 * reappears, but with the overfitting-style dip on the right
 * (small λ) replaced by an underfitting-style rise on the left
 * (large λ). The reader finds the right λ by inspection.
 */
export function WeightDecaySweep() {
  const [lambda, setLambda] = useState<number>(0.01);
  const [point, setPoint] = useState<{ lambda: number; train: number; test: number } | null>(null);
  const [sweep, setSweep] = useState<{ lambda: number; train: number; test: number }[]>([]);
  const [mod, setMod] = useState<{
    polyFit: typeof import('@/lib/math/polynomial-fit').polyFit;
    evalPolyVector: typeof import('@/lib/math/polynomial-fit').evalPolyVector;
    mse: typeof import('@/lib/math/polynomial-fit').mse;
    syntheticRegression: typeof import('@/lib/math/polynomial-fit').syntheticRegression;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/math/polynomial-fit').then((m) => {
      if (!cancelled) {
        setMod({
          polyFit: m.polyFit,
          evalPolyVector: m.evalPolyVector,
          mse: m.mse,
          syntheticRegression: m.syntheticRegression,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mod) return;
    const d = mod.syntheticRegression(20, 1);
    const xsTrain = d.xs.slice(0, 14);
    const ysTrain = d.ys.slice(0, 14);
    const xsTest = d.xs.slice(14);
    const ysTest = d.ys.slice(14);
    const w = l2PolyFit(xsTrain, ysTrain, 12, lambda);
    if (!w) {
      setPoint(null);
      return;
    }
    const train = mod.mse(ysTrain, mod.evalPolyVector(w, xsTrain));
    const test = mod.mse(ysTest, mod.evalPolyVector(w, xsTest));
    setPoint({ lambda, train, test });
    setSweep((prev) => {
      const without = prev.filter((s) => Math.abs(s.lambda - lambda) > 1e-9);
      return [...without, { lambda, train, test }].sort((a, b) => a.lambda - b.lambda);
    });
  }, [lambda, mod]);

  const sorted = [...sweep].sort((a, b) => a.lambda - b.lambda);
  const finite = sorted.filter((s) => Number.isFinite(s.train) && Number.isFinite(s.test));
  const maxY = finite.length
    ? Math.max(...finite.map((s) => Math.max(s.train, s.test)))
    : 1;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Train + test loss vs λ
        </h3>
        <div className="text-[10px] text-dim font-mono">
          degree 12 · log-scale x-axis · the recorded sweep persists
        </div>
      </div>

      <div className="space-y-3 font-mono text-[12px]">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
              λ
            </span>
            <span className="text-ink tabular-nums">{lambda.toExponential(1)}</span>
          </div>
          <Slider
            value={lambda}
            min={LAMBDA_MIN}
            max={LAMBDA_MAX}
            step={0.001}
            onChange={setLambda}
            formatValue={(v) => v.toExponential(1)}
            ariaLabel="Weight-decay coefficient (sweep)"
            valueMinWidth="7ch"
          />
        </div>

        {point && (
          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Train loss at this λ</span>
              <span className="text-ink tabular-nums">{point.train.toFixed(3)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Test loss at this λ</span>
              <span
                className={
                  point.test > point.train * 1.5
                    ? 'text-[rgb(var(--negative))] tabular-nums'
                    : 'text-ink tabular-nums'
                }
              >
                {point.test.toFixed(3)}
              </span>
            </div>
          </div>
        )}

        {finite.length > 1 && (
          <div className="pt-3 border-t border-border">
            <LossSweep
              points={finite}
              maxY={Math.max(maxY, 0.1)}
              currentLambda={lambda}
            />
          </div>
        )}

        <p className="text-[10px] text-fg-subtle font-mono leading-relaxed pt-2">
          Visit three or four λ values to see the curve. The sweet
          spot is where the test loss (red) is lowest while the
          train loss (teal) is still small.
        </p>
      </div>
    </div>
  );
}

const PLOT_W = 420;
const PLOT_H = 180;
const PAD = 28;
const LAM_MIN = Math.log10(LAMBDA_MIN);
const LAM_MAX = Math.log10(LAMBDA_MAX);

function LossSweep({
  points,
  maxY,
  currentLambda,
}: {
  points: readonly { lambda: number; train: number; test: number }[];
  maxY: number;
  currentLambda: number;
}) {
  const x0 = PAD;
  const x1 = PLOT_W - PAD;
  const y0 = PLOT_H - PAD;
  const y1 = PAD;
  const xs = (l: number) =>
    x0 + ((Math.log10(l) - LAM_MIN) / (LAM_MAX - LAM_MIN)) * (x1 - x0);
  const ys = (v: number) => y0 - (v / maxY) * (y0 - y1);
  const trainPath = points
    .map((p) => `${xs(p.lambda).toFixed(1)},${ys(p.train).toFixed(1)}`)
    .join(' ');
  const testPath = points
    .map((p) => `${xs(p.lambda).toFixed(1)},${ys(p.test).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Train and test MSE as a function of weight-decay coefficient λ."
    >
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgb(var(--border))" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgb(var(--border))" strokeWidth={1} />
      <polyline points={testPath} fill="none" stroke="rgb(var(--negative))" strokeWidth={1.5} />
      <polyline points={trainPath} fill="none" stroke="rgb(var(--accent))" strokeWidth={1.5} />
      <line
        x1={xs(currentLambda)}
        y1={y1}
        x2={xs(currentLambda)}
        y2={y0}
        stroke="rgb(var(--fg-muted))"
        strokeWidth={0.8}
        strokeDasharray="2 3"
        opacity={0.7}
      />
      {[LAM_MIN, (LAM_MIN + LAM_MAX) / 2, LAM_MAX].map((logL) => (
        <text
          key={logL}
          x={xs(Math.pow(10, logL))}
          y={y0 + 14}
          textAnchor="middle"
          className="fill-dim font-mono"
          fontSize={9}
        >
          {`1e${Math.round(logL)}`}
        </text>
      ))}
    </svg>
  );
}
