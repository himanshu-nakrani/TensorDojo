

import { useEffect, useMemo, useRef, useState } from 'react';
import { Heatmap } from '@/components/sim/primitives/Heatmap';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  compose,
  paramCount,
  fitLowRank,
} from '@/lib/math/lora';

// ---------------------------------------------------------------------------
// Target delta matrix (same construction as LoRAReconstruction)
// ---------------------------------------------------------------------------

function makeTargetDelta(): number[][] {
  const N = 8;

  const u1 = [1, 1, 1, 1, 0, 0, 0, 0];
  const v1 = [0, 0, 0, 1, 1, 1, 0, 0];

  const u2 = Array.from({ length: N }, (_, k) => Math.sin((Math.PI * k) / (N - 1)));
  const v2 = Array.from({ length: N }, (_, k) => Math.cos((Math.PI * k) / (N - 1)));

  const u3 = [1, 0, 1, 0, 1, 0, 1, 0];
  const v3 = [0, 1, 0, 1, 0, 1, 0, 1];

  const W: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));

  const components: { u: number[]; v: number[]; w: number }[] = [
    { u: u1, v: v1, w: 1.0 },
    { u: u2, v: v2, w: 0.6 },
    { u: u3, v: v3, w: 0.3 },
  ];

  for (const { u, v, w } of components) {
    for (let i = 0; i < N; i += 1) {
      for (let j = 0; j < N; j += 1) {
        W[i]![j] = (W[i]![j] ?? 0) + w * u[i]! * v[j]!;
      }
    }
  }

  return W;
}

const STATIC_TARGET = makeTargetDelta();

// ---------------------------------------------------------------------------
// Fit hyperparameters
// ---------------------------------------------------------------------------

const FIT_STEPS = 1000;
const FIT_LR = 0.05;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface FitResult {
  A: number[][];
  B: number[][];
  losses: number[];
}

// ---------------------------------------------------------------------------
// Loss curve chart
// ---------------------------------------------------------------------------

const PLOT_W = 420;
const PLOT_H = 140;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

function LossCurve({ losses }: { losses: number[] }) {
  if (losses.length === 0) return null;

  const x0 = PAD_LEFT;
  const x1 = PLOT_W - PAD_RIGHT;
  const y0 = PLOT_H - PAD_BOTTOM;
  const y1 = PAD_TOP;
  const maxLoss = Math.max(...losses, 0.001);
  const n = losses.length;

  const xs = (step: number) => x0 + (step / (n - 1)) * (x1 - x0);
  const ys = (loss: number) => y0 - (loss / maxLoss) * (y0 - y1);

  const points = losses
    .map((l, i) => `${xs(i).toFixed(1)},${ys(l).toFixed(1)}`)
    .join(' ');

  // Y-axis tick labels: 0, half, max
  const yTicks = [0, maxLoss / 2, maxLoss];
  // X-axis tick labels: 0, mid, end
  const xTicks = [0, Math.round((n - 1) / 2), n - 1];

  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="MSE loss vs gradient descent step."
    >
      {/* Axes */}
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgb(var(--border))" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgb(var(--border))" strokeWidth={1} />

      {/* Y-axis ticks */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={x0 - 3}
            y1={ys(v)}
            x2={x0}
            y2={ys(v)}
            stroke="rgb(var(--border))"
            strokeWidth={1}
          />
          <text
            x={x0 - 5}
            y={ys(v) + 4}
            textAnchor="end"
            className="fill-dim font-mono"
            fontSize={8}
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X-axis ticks */}
      {xTicks.map((step) => (
        <text
          key={step}
          x={xs(step)}
          y={y0 + 14}
          textAnchor="middle"
          className="fill-dim font-mono"
          fontSize={8}
        >
          {step}
        </text>
      ))}

      {/* X-axis label */}
      <text
        x={(x0 + x1) / 2}
        y={PLOT_H - 2}
        textAnchor="middle"
        className="fill-dim font-mono"
        fontSize={8}
      >
        step
      </text>

      {/* Y-axis label */}
      <text
        x={8}
        y={(y0 + y1) / 2}
        textAnchor="middle"
        className="fill-dim font-mono"
        fontSize={8}
        transform={`rotate(-90, 8, ${(y0 + y1) / 2})`}
      >
        MSE
      </text>

      {/* Loss curve */}
      <polyline
        points={points}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function HeatmapWithLabel({
  label,
  values,
  cellSize = 36,
}: {
  label: string;
  values: readonly (readonly number[])[];
  cellSize?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono text-center">
        {label}
      </div>
      <Heatmap
        values={values}
        colormap="diverging"
        precision={2}
        cellSize={cellSize}
        showValues={false}
        ariaLabel={label}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/** Secondary sim for lesson 30 — gradient-descent low-rank fitting of ΔW. */
export function LoRAFinetuneLoss() {
  const [r, setR] = useState(2);

  // Cache fit results keyed by r so we don't re-run GD on slider revisit
  const cacheRef = useRef<Record<number, FitResult>>({});
  const [fitResult, setFitResult] = useState<FitResult | null>(null);

  useEffect(() => {
    if (cacheRef.current[r]) {
      setFitResult(cacheRef.current[r]!);
      return;
    }
    const result = fitLowRank(STATIC_TARGET, r, FIT_STEPS, FIT_LR);
    cacheRef.current[r] = result;
    setFitResult(result);
  }, [r]);

  const reconstructed = useMemo(() => {
    if (!fitResult) return STATIC_TARGET.map((row) => row.map(() => 0));
    return compose(fitResult.A, fitResult.B);
  }, [fitResult]);

  const paramsUsed = paramCount(8, 8, r);
  const finalLoss = fitResult ? fitResult.losses[fitResult.losses.length - 1] ?? 0 : 0;

  const reset = () => {
    setR(2);
  };

  return (
    <SimFrame title="LoRA: gradient-descent fitting" onReset={reset}>
      <div className="space-y-6">
      {/* Rank slider */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            rank r
          </span>
          <span className="text-ink font-mono text-sm tabular-nums">{r}</span>
        </div>
        <Slider
          value={r}
          min={1}
          max={8}
          step={1}
          onChange={(v) => setR(Math.round(v))}
          formatValue={(v) => String(Math.round(v))}
          ariaLabel="Rank r for gradient-descent fitting"
          valueMinWidth="3ch"
        />
      </div>

      {/* Two heatmaps side by side */}
      <div className="grid grid-cols-2 gap-6 items-start">
        <HeatmapWithLabel label="Target ΔW" values={STATIC_TARGET} />
        <HeatmapWithLabel
          label={`A·B fit — gradient descent (rank ${r})`}
          values={reconstructed}
        />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-mono text-muted border-t border-border pt-2">
        <span>
          params used{' '}
          <span className="text-ink tabular-nums">{paramsUsed}</span>
          {' / 64'}
        </span>
        <span>
          final loss{' '}
          <span className="text-ink tabular-nums">{finalLoss.toFixed(4)}</span>
        </span>
      </div>

      {/* Loss curve */}
      {fitResult && fitResult.losses.length > 1 && (
        <div className="pt-2">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            MSE vs gradient step
          </div>
          <LossCurve losses={fitResult.losses} />
        </div>
      )}

      {/* Caption */}
      <p className="text-[11px] text-muted font-mono leading-relaxed">
        Unlike the SVD approach, gradient descent starts from random A and B and
        minimises ‖A·B − ΔW‖²_F iteratively. At {FIT_STEPS} steps with learning
        rate {FIT_LR}, the loss visibly drops — though GD may not converge to the
        same global optimum as SVD. Changing rank triggers a fresh run (cached on
        re-visit).
      </p>
      </div>
    </SimFrame>
  );
}
