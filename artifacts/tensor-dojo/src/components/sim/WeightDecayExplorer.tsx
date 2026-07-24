

import { useEffect, useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { l2PolyFit } from '@/lib/math/regularization';
import { evalPolyVector, mse, syntheticRegression } from '@/lib/math/polynomial-fit';

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
 * Centerpiece for the weight-decay lesson. The same polynomial
 * regression toy from the overfitting lesson, but now with a
 * λ slider on the closed-form L2 fit. At λ=0 the degree-12 fit
 * overfits wildly (the baseline). As λ grows, the curve
 * smooths out — the higher-frequency wobbles disappear because
 * their coefficients are shrunk. Below the curve, a bar chart
 * shows the current magnitude of each polynomial coefficient.
 */
export function WeightDecayExplorer() {
  const [lambda, setLambda] = useState<number>(0);
  const [split] = useState(() => {
    // Re-import via dynamic load to keep this component's
    // initial render small. (Synthetic data is generated in
    // the effect below.)
    return { nTrain: 14, nTest: 6 };
  });
  const [fit, setFit] = useState<{
    w: number[];
    trainMse: number;
    testMse: number;
  } | null>(null);
  const [mod, setMod] = useState<typeof import('@/lib/math/polynomial-fit') | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/math/polynomial-fit').then((m) => {
      if (!cancelled) setMod(() => m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the dataset + recompute the fit on λ change.
  const { xsTrain, ysTrain, xsTest, ysTest, clean } = useMemo(() => {
    if (!mod) {
      return { xsTrain: [], ysTrain: [], xsTest: [], ysTest: [], clean: [] };
    }
    const d = mod.syntheticRegression(20, 0);
    return {
      xsTrain: d.xs.slice(0, split.nTrain),
      ysTrain: d.ys.slice(0, split.nTrain),
      xsTest: d.xs.slice(split.nTrain),
      ysTest: d.ys.slice(split.nTrain),
      clean: d.clean,
    };
  }, [mod, split]);

  useEffect(() => {
    if (!mod) return;
    const w = l2PolyFit(xsTrain, ysTrain, DEG, lambda);
    if (!w) {
      setFit(null);
      return;
    }
    const trainPred = mod.evalPolyVector(w, xsTrain);
    const testPred = mod.evalPolyVector(w, xsTest);
    setFit({
      w,
      trainMse: mod.mse(ysTrain, trainPred),
      testMse: mod.mse(ysTest, testPred),
    });
  }, [mod, xsTrain, ysTrain, xsTest, ysTest, lambda]);

  // Dense grid for the fitted curve and the true curve.
  const xDense = useMemo(() => {
    const N = 60;
    const out: number[] = [];
    for (let i = 0; i < N; i += 1) out.push(X_RANGE[0] + (i / (N - 1)) * (X_RANGE[1] - X_RANGE[0]));
    return out;
  }, []);

  const fitDense = useMemo(
    () => (fit ? xDense.map((x) => evalPolyCoef(fit.w, x)) : []),
    [fit, xDense],
  );
  const cleanDense = useMemo(() => xDense.map((x) => Math.sin(2 * x)), [xDense]);

  const coefMax = fit
    ? Math.max(0.01, ...fit.w.map((c) => Math.abs(c)))
    : 0.01;

  const reset = () => {
    setLambda(0);
  };

  return (
    <SimFrame
      title="Crank λ · the fit smooths and coefficients shrink"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-dim font-mono">
            degree {DEG} · fit on {xsTrain.length} of {xsTrain.length + xsTest.length} points
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
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5">
        <div>
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            className="w-full h-auto bg-bg/40 rounded"
            role="img"
            aria-label="L2-regularized polynomial fit. Gray dashed is sin(2x); blue is the fit."
          >
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
            <polyline
              points={xDense
                .map((x, i) => `${toScreenX(x).toFixed(1)},${toScreenY(cleanDense[i] ?? 0).toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke="rgb(var(--fg-muted))"
              strokeWidth={1.2}
              strokeDasharray="3 3"
              opacity={0.7}
            />
            {fit && (
              <polyline
                points={xDense
                  .map((x, i) => `${toScreenX(x).toFixed(1)},${toScreenY(fitDense[i] ?? 0).toFixed(1)}`)
                  .join(' ')}
                fill="none"
                stroke="rgb(var(--accent))"
                strokeWidth={2}
              />
            )}
            {xsTrain.map((x, i) => (
              <circle
                key={`train-${i}`}
                cx={toScreenX(x)}
                cy={toScreenY(ysTrain[i] ?? 0)}
                r={3}
                fill="rgb(var(--accent))"
                opacity={0.7}
              />
            ))}
          </svg>

          {fit && (
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
                Polynomial coefficients |w<sub>i</sub>|
              </div>
              <CoefficientBars w={fit.w} coefMax={coefMax} />
            </div>
          )}
        </div>

        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
                λ (weight decay)
              </span>
              <span className="text-ink tabular-nums">{lambda.toExponential(1)}</span>
            </div>
            <Slider
              value={lambda}
              min={0}
              max={1}
              step={0.001}
              onChange={setLambda}
              formatValue={(v) => v.toExponential(1)}
              ariaLabel="Weight-decay coefficient"
              valueMinWidth="7ch"
            />
            <div className="flex justify-between text-[11px] text-dim font-mono mt-1 tabular-nums">
              <span>0 (no decay)</span>
              <span>1 (heavy decay)</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Train loss</span>
              <span className="text-ink tabular-nums">
                {fit ? fit.trainMse.toFixed(3) : '—'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Test loss</span>
              <span
                className={
                  fit && fit.testMse > fit.trainMse * 1.5
                    ? 'text-[rgb(var(--negative))] tabular-nums'
                    : 'text-ink tabular-nums'
                }
              >
                {fit ? fit.testMse.toFixed(3) : '—'}
              </span>
            </div>
            <p className="text-[11px] text-fg-subtle font-mono mt-2 leading-relaxed">
              λ = 0 reproduces the unregularized high-degree fit
              (the overfitting baseline). Push λ up and watch the
              higher-order coefficients shrink first.
            </p>
          </div>
        </div>
      </div>
    </SimFrame>
  );
}

/** Horner evaluation copied inline (the module import is async). */
function evalPolyCoef(w: readonly number[], x: number): number {
  let acc = 0;
  for (let i = w.length - 1; i >= 0; i -= 1) acc = acc * x + (w[i] ?? 0);
  return acc;
}

function CoefficientBars({
  w,
  coefMax,
}: {
  w: readonly number[];
  coefMax: number;
}) {
  const W = 420;
  const H = 100;
  const PAD_L = 30;
  const PAD_B = 18;
  const PAD_T = 6;
  const slotW = (W - PAD_L) / w.length;
  const barH = (v: number) => ((Math.abs(v) / coefMax) * (H - PAD_T - PAD_B));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Magnitude of each polynomial coefficient."
    >
      <line
        x1={PAD_L}
        y1={H - PAD_B}
        x2={W}
        y2={H - PAD_B}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
      {w.map((c, i) => {
        const cx = PAD_L + i * slotW + slotW / 2;
        const h = barH(c);
        const y = H - PAD_B - h;
        return (
          <g key={i}>
            <rect
              x={cx - 6}
              y={y}
              width={12}
              height={Math.max(h, 0)}
              fill={i === 0 ? 'rgb(var(--fg-muted))' : 'rgb(var(--accent))'}
              opacity={i === 0 ? 0.6 : 0.85}
            />
            <text
              x={cx}
              y={H - 4}
              textAnchor="middle"
              className="fill-dim font-mono"
              fontSize={9}
            >
              {`w${i}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
