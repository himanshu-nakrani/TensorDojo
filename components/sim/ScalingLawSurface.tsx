'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  chinchillaLoss,
  chinchillaOptimalSplit,
} from '@/lib/math/scalinglaws';

/**
 * Centerpiece sim for the scaling-laws lesson. Slider sets the
 * compute budget C. At each budget, plot loss as a function of
 * N along the constraint D = C / (6·N). The curve is U-shaped
 * with the minimum at Chinchilla-optimal N.
 *
 * The reader drags a marker along the x-axis to choose their
 * own N; the readouts show how far they are from optimal and
 * (in compute terms) what their choice "wasted."
 */

const BUDGET_STEPS = [
  { label: '1e20', C: 1e20 },
  { label: '1e21', C: 1e21 },
  { label: '1e22', C: 1e22 },
  { label: '1e23', C: 1e23 },
  { label: '1e24 (≈ GPT-3 / Chinchilla)', C: 1e24 },
  { label: '1e25 (≈ LLaMA-3)', C: 1e25 },
] as const;

// Known real models for x-axis annotations.
const REAL_MODELS = [
  { label: 'GPT-3', N: 175e9 },
  { label: 'Chinchilla', N: 70e9 },
  { label: 'LLaMA-2 70B', N: 70e9 },
] as const;

export function ScalingLawSurface() {
  const [budgetIdx, setBudgetIdx] = useState(4); // ~Chinchilla budget
  const budget = BUDGET_STEPS[budgetIdx]!;
  const C = budget.C;

  // Marker is the user's chosen N (log).
  // Default to the optimum so they see the bottom of the curve.
  const optimal = useMemo(() => chinchillaOptimalSplit(C, { nSteps: 400 }), [C]);
  const [userLogN, setUserLogN] = useState(() => Math.log10(optimal.N));

  // Recompute the user's N at the current budget.
  const userN = Math.pow(10, userLogN);
  const userD = C / (6 * userN);
  const userLoss = chinchillaLoss(userN, userD);
  const lossGap = userLoss - optimal.loss;
  // "Effective compute waste" = (loss at this point) vs the compute you'd
  // need at the optimum to match this loss. Roughly: loss difference
  // exponentiated through the dominant scaling exponent.
  const effectiveWasteFactor = userLoss / optimal.loss;

  // Curve points: N spans log range so the U-shape is centered.
  const curve = useMemo(() => {
    const points: Array<{ N: number; loss: number }> = [];
    const logNMin = Math.log10(optimal.N) - 2.5;
    const logNMax = Math.log10(optimal.N) + 2.5;
    const STEPS = 100;
    for (let i = 0; i < STEPS; i++) {
      const lN = logNMin + (i / (STEPS - 1)) * (logNMax - logNMin);
      const N = Math.pow(10, lN);
      const D = C / (6 * N);
      if (D <= 0) continue;
      points.push({ N, loss: chinchillaLoss(N, D) });
    }
    return points;
  }, [optimal.N, C]);

  // SVG geometry.
  const W = 600;
  const H = 240;
  const PAD_X = 36;
  const PAD_Y = 24;
  const xMin = Math.log10(curve[0]!.N);
  const xMax = Math.log10(curve[curve.length - 1]!.N);
  const losses = curve.map((p) => p.loss);
  const yMin = Math.min(...losses);
  const yMax = Math.max(...losses);
  const yRange = yMax - yMin;
  const yLow = yMin - yRange * 0.1;
  const yHigh = yMax + yRange * 0.05;
  const xScale = (logN: number) =>
    PAD_X + ((logN - xMin) / (xMax - xMin)) * (W - 2 * PAD_X);
  const yScale = (loss: number) =>
    H - PAD_Y - ((loss - yLow) / (yHigh - yLow)) * (H - 2 * PAD_Y);

  // Clamp user marker into the visible range.
  const userLogClamped = Math.max(xMin, Math.min(xMax, userLogN));

  const reset = () => {
    setBudgetIdx(4);
    setUserLogN(Math.log10(optimal.N));
  };

  return (
    <SimFrame
      title="Loss surface along the compute constraint"
      onReset={reset}
      headerAction={
        <button
          type="button"
          onClick={reset}
          className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
        >
          Reset
        </button>
      }
    >
      <label className="block mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Compute budget C (FLOPs)
          </span>
          <span className="text-[11px] font-mono tabular-nums text-ink">
            {budget.label}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={BUDGET_STEPS.length - 1}
          step={1}
          value={budgetIdx}
          onChange={(e) => {
            const i = Number(e.target.value);
            setBudgetIdx(i);
            // Re-center the marker on the new optimum so the reader
            // doesn't have to chase it.
            const o = chinchillaOptimalSplit(BUDGET_STEPS[i]!.C, { nSteps: 400 });
            setUserLogN(Math.log10(o.N));
          }}
          className="w-full focus-ring"
          aria-label="Compute budget"
        />
        <div className="flex justify-between text-[11px] text-dim font-mono mt-1">
          {BUDGET_STEPS.map((b) => (
            <span key={b.label}>{b.label.split(' ')[0]}</span>
          ))}
        </div>
      </label>

      <div className="border border-border rounded bg-surface p-2 mb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
          {/* Y axis */}
          <line
            x1={PAD_X}
            y1={PAD_Y}
            x2={PAD_X}
            y2={H - PAD_Y}
            stroke="rgb(var(--border-strong))"
            strokeWidth={0.8}
          />
          {/* X axis */}
          <line
            x1={PAD_X}
            y1={H - PAD_Y}
            x2={W - PAD_X}
            y2={H - PAD_Y}
            stroke="rgb(var(--border-strong))"
            strokeWidth={0.8}
          />

          {/* Loss curve */}
          <path
            d={curve
              .map((p, i) => {
                const x = xScale(Math.log10(p.N));
                const y = yScale(p.loss);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth={1.6}
          />

          {/* Optimum marker (ink dot) */}
          <circle
            cx={xScale(Math.log10(optimal.N))}
            cy={yScale(optimal.loss)}
            r={4}
            fill="rgb(var(--accent))"
            stroke="rgb(var(--bg))"
            strokeWidth={1.5}
          />
          <text
            x={xScale(Math.log10(optimal.N))}
            y={yScale(optimal.loss) - 8}
            textAnchor="middle"
            fontSize={9}
            className="fill-accent font-mono"
          >
            optimum
          </text>

          {/* User marker */}
          <line
            x1={xScale(userLogClamped)}
            y1={PAD_Y}
            x2={xScale(userLogClamped)}
            y2={H - PAD_Y}
            stroke="rgb(var(--accent-hover))"
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
          <circle
            cx={xScale(userLogClamped)}
            cy={yScale(userLoss)}
            r={4}
            fill="rgb(var(--bg))"
            stroke="rgb(var(--accent-hover))"
            strokeWidth={2}
          />

          {/* X-axis tick labels at decade boundaries */}
          {Array.from({ length: Math.floor(xMax - xMin) + 1 }, (_, i) => {
            const decade = Math.ceil(xMin) + i;
            if (decade > xMax) return null;
            return (
              <g key={decade}>
                <line
                  x1={xScale(decade)}
                  y1={H - PAD_Y}
                  x2={xScale(decade)}
                  y2={H - PAD_Y + 4}
                  stroke="rgb(var(--border-strong))"
                />
                <text
                  x={xScale(decade)}
                  y={H - PAD_Y + 14}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-dim font-mono"
                >
                  1e{decade}
                </text>
              </g>
            );
          })}
          <text
            x={W - PAD_X}
            y={H - PAD_Y + 14}
            textAnchor="end"
            fontSize={9}
            className="fill-dim font-mono"
          >
            N (params)
          </text>

          {/* Loss axis label */}
          <text
            x={PAD_X - 4}
            y={PAD_Y + 4}
            textAnchor="end"
            fontSize={9}
            className="fill-dim font-mono"
          >
            loss
          </text>
        </svg>
      </div>

      {/* User N slider */}
      <label className="block mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Your N (the model size you'd pick)
          </span>
          <span className="text-[11px] font-mono tabular-nums text-ink">
            {formatBig(userN)} params · {formatBig(userD)} tokens · {(userD / userN).toFixed(1)} tok/param
          </span>
        </div>
        <input
          type="range"
          min={xMin}
          max={xMax}
          step={0.01}
          value={userLogClamped}
          onChange={(e) => setUserLogN(Number(e.target.value))}
          className="w-full focus-ring"
          aria-label="Your N"
        />
      </label>

      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border font-mono text-[11px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Loss at your choice
          </div>
          <div className="text-ink tabular-nums">{userLoss.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Loss at optimum
          </div>
          <div className="text-accent tabular-nums">{optimal.loss.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Loss gap
          </div>
          <div
            className={clsx(
              'tabular-nums',
              lossGap > 0.05
                ? 'text-[rgb(var(--negative))]'
                : 'text-ink',
            )}
          >
            +{lossGap.toFixed(3)} (×{effectiveWasteFactor.toFixed(3)})
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        The curve shows loss along the constraint D = C / (6·N) — every
        point is a different way to spend the same compute budget. The
        bottom of the curve is the Chinchilla-optimal split. Drag the slider
        far left (small N, many tokens) or far right (huge N, few tokens):
        either way the loss climbs. Real models reference points: GPT-3
        sits at N=175B and was wildly under-trained (only 1.7 tok/param);
        Chinchilla at N=70B with 20 tok/param was the corrective; LLaMA-3
        deliberately over-trains at 70B / 15T (~214 tok/param) to make
        inference cheaper.
      </p>
    </SimFrame>
  );
}

function formatBig(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}
