'use client';

import { useMemo, useState } from 'react';
import {
  defaultParams,
  forwardAndBackward,
  numericalGradientScalar,
  type MlpParams,
  type ParamPath,
} from '@/lib/math/backprop';

/**
 * Secondary widget for the backprop lesson. The reader picks
 * one weight (or bias), and we plot the loss as a function of
 * that single parameter across a sweep, with a marker at the
 * current value of the parameter. The marker also shows the
 * analytical gradient (∂L/∂) reported by backprop, plus a
 * small line at that slope. The reader sees that the slope
 * matches the loss curve's tangent at the current point —
 * the gradient is just the slope of the loss along the
 * chosen direction.
 */

interface ParamChoice {
  path: ParamPath;
  label: string;
  layer: 'W1' | 'b1' | 'W2' | 'b2' | 'W3' | 'b3';
}

const PARAM_CHOICES: readonly ParamChoice[] = [
  { path: { kind: 'W1', i: 0, j: 0 }, label: 'W1[0][0]', layer: 'W1' },
  { path: { kind: 'W1', i: 0, j: 1 }, label: 'W1[0][1]', layer: 'W1' },
  { path: { kind: 'W1', i: 1, j: 0 }, label: 'W1[1][0]', layer: 'W1' },
  { path: { kind: 'b1', i: 0 }, label: 'b1[0]', layer: 'b1' },
  { path: { kind: 'W2', i: 0, j: 0 }, label: 'W2[0][0]', layer: 'W2' },
  { path: { kind: 'W2', i: 1, j: 3 }, label: 'W2[1][3]', layer: 'W2' },
  { path: { kind: 'W3', i: 0, j: 0 }, label: 'W3[0][0]', layer: 'W3' },
  { path: { kind: 'b3', i: 0 }, label: 'b3[0]', layer: 'b3' },
];

function getParam(params: MlpParams, path: ParamPath): number {
  switch (path.kind) {
    case 'W1': return params.W1[path.i]![path.j]!;
    case 'b1': return params.b1[path.i]!;
    case 'W2': return params.W2[path.i]![path.j]!;
    case 'b2': return params.b2[path.i]!;
    case 'W3': return params.W3[path.i]![path.j]!;
    case 'b3': return params.b3[path.i]!;
  }
}

export function BackpropCrossSection() {
  const [params] = useState<MlpParams>(() => defaultParams(0));
  const [choice, setChoice] = useState<ParamChoice>(PARAM_CHOICES[0]!);
  const [x, setX] = useState<[number, number]>([0.5, -0.3]);
  const [t, setT] = useState<number>(0.4);

  // Sweep the chosen parameter across [-2, 2] and record the loss.
  const sweep = useMemo(() => {
    const N = 51;
    const out: { v: number; loss: number }[] = [];
    for (let i = 0; i < N; i += 1) {
      const v = -2 + (i / (N - 1)) * 4;
      // Clone params with the chosen scalar set to v.
      const clone = cloneWithParam(params, choice.path, v);
      const { cache } = forwardAndBackward(clone, x, t);
      out.push({ v, loss: cache.loss });
    }
    return out;
  }, [params, choice, x, t]);

  const currentValue = getParam(params, choice.path);
  const currentIndex = sweep.findIndex((s) => s.v >= currentValue);
  const currentLoss =
    currentIndex >= 0
      ? sweep[currentIndex]!.loss
      : sweep[sweep.length - 1]!.loss;

  // Analytic gradient at the *current* value of the parameter.
  const gradAnalytic = useMemo(() => {
    const { grads } = forwardAndBackward(params, x, t);
    return getGrad(grads, choice.path);
  }, [params, choice, x, t]);
  // Numerical gradient at the same point — for the marker line.
  const gradNumerical = useMemo(
    () => numericalGradientScalar(params, x, t, choice.path, 1e-5),
    [params, choice, x, t],
  );

  // Plotting
  const w = 380;
  const h = 140;
  const finite = sweep.filter((s) => Number.isFinite(s.loss));
  if (finite.length === 0) return null;
  const max = Math.max(...finite.map((s) => s.loss));
  const min = Math.min(...finite.map((s) => s.loss));
  const range = Math.max(max - min, 1e-6);
  const path = sweep
    .map((s) => {
      if (!Number.isFinite(s.loss)) return null;
      const xp = ((s.v + 2) / 4) * w;
      const yp = h - ((s.loss - min) / range) * h;
      return `${xp.toFixed(1)},${yp.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');
  const markerX = ((currentValue + 2) / 4) * w;
  const markerY = h - ((currentLoss - min) / range) * h;
  // Slope line: ±0.5 in v ⇒ slope * 0.5 in loss.
  const slopeLen = 0.5;
  const dx = slopeLen;
  const dy = -gradAnalytic * slopeLen;
  const slopeX1 = markerX - (dx / 4) * w;
  const slopeY1 = markerY - (dy / range) * h;
  const slopeX2 = markerX + (dx / 4) * w;
  const slopeY2 = markerY + (dy / range) * h;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Loss cross-section: a single weight
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5">
        <div>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full h-auto bg-bg/40 rounded"
            aria-label="Loss as a function of one parameter."
          >
            <line
              x1={0}
              y1={h}
              x2={w}
              y2={h}
              stroke="rgb(var(--border))"
              strokeWidth={1}
            />
            <polyline
              points={path}
              fill="none"
              stroke="rgb(var(--fg-muted))"
              strokeWidth={1.5}
            />
            {/* Tangent line at the current point */}
            <line
              x1={slopeX1}
              y1={slopeY1}
              x2={slopeX2}
              y2={slopeY2}
              stroke="rgb(var(--accent))"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            {/* Current point */}
            <circle
              cx={markerX}
              cy={markerY}
              r={4.5}
              fill="rgb(var(--accent))"
              stroke="rgb(var(--bg))"
              strokeWidth={1.5}
            />
          </svg>
          <div className="flex items-center justify-between text-[10px] text-dim font-mono mt-1">
            <span>−2</span>
            <span>{choice.label} = {currentValue.toFixed(2)}</span>
            <span>+2</span>
          </div>
        </div>
        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
              Parameter
            </div>
            <div className="grid grid-cols-2 gap-1">
              {PARAM_CHOICES.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setChoice(c)}
                  className={
                    'text-[10px] uppercase tracking-[0.18em] font-mono py-1 rounded border focus-ring transition-colors ' +
                    (choice.label === c.label
                      ? 'border-accent text-accent'
                      : 'border-border text-muted hover:text-ink')
                  }
                  aria-pressed={choice.label === c.label}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Loss at marker</span>
              <span className="text-ink tabular-nums">
                {Number.isFinite(currentLoss) ? currentLoss.toFixed(4) : 'NaN'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">∂L/∂ (backprop)</span>
              <span className="text-accent tabular-nums">
                {gradAnalytic.toFixed(4)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-dim">∂L/∂ (numerical)</span>
              <span className="text-ink tabular-nums">
                {gradNumerical.toFixed(4)}
              </span>
            </div>
            <p className="text-[10px] text-fg-subtle font-mono mt-2">
              The dashed line is the tangent at the marker with
              slope = ∂L/∂. The two gradient values match to
              within numerical precision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function cloneWithParam(p: MlpParams, path: ParamPath, v: number): MlpParams {
  const W1 = p.W1.map((r) => r.slice());
  const W2 = p.W2.map((r) => r.slice());
  const W3 = p.W3.map((r) => r.slice());
  const b1 = p.b1.slice();
  const b2 = p.b2.slice();
  const b3 = p.b3.slice();
  switch (path.kind) {
    case 'W1': W1[path.i]![path.j] = v; break;
    case 'b1': b1[path.i] = v; break;
    case 'W2': W2[path.i]![path.j] = v; break;
    case 'b2': b2[path.i] = v; break;
    case 'W3': W3[path.i]![path.j] = v; break;
    case 'b3': b3[path.i] = v; break;
  }
  return { W1, b1, W2, b2, W3, b3 };
}

function getGrad(grads: ReturnType<typeof forwardAndBackward>['grads'], path: ParamPath): number {
  switch (path.kind) {
    case 'W1': return grads.W1[path.i]![path.j]!;
    case 'b1': return grads.b1[path.i]!;
    case 'W2': return grads.W2[path.i]![path.j]!;
    case 'b2': return grads.b2[path.i]!;
    case 'W3': return grads.W3[path.i]![path.j]!;
    case 'b3': return grads.b3[path.i]!;
  }
}
