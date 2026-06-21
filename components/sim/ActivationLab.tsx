'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  gelu,
  geluDeriv,
  relu,
  reluDeriv,
  silu,
  siluDeriv,
} from '@/lib/math/activations';

type ActivationId = 'relu' | 'gelu' | 'silu';

interface ActivationSpec {
  id: ActivationId;
  label: string;
  /** Compact formula displayed under the label. */
  formula: string;
  f: (x: number) => number;
  /** Closed-form derivative; rendered when the overlay is on. */
  fp: (x: number) => number;
}

const ACTIVATIONS: readonly ActivationSpec[] = [
  {
    id: 'relu',
    label: 'ReLU',
    formula: 'max(0, x)',
    f: relu,
    fp: reluDeriv,
  },
  {
    id: 'gelu',
    label: 'GELU',
    formula: '½·x·(1+erf(x/√2))',
    f: gelu,
    fp: geluDeriv,
  },
  {
    id: 'silu',
    label: 'SiLU',
    formula: 'x·σ(x)',
    f: silu,
    fp: siluDeriv,
  },
];

const X_MIN = -4;
const X_MAX = 4;
const Y_MIN = -1.5;
const Y_MAX = 4;

/**
 * The activations lesson centerpiece. One scalar input x on a slider;
 * three side-by-side line plots showing relu / gelu / silu. Each plot
 * has a moving dot at the current x, and an optional overlay of the
 * derivative.
 *
 * The activations are computed at hundreds of sample points to draw
 * the curves and at the single user-controlled x for the readouts.
 * No state beyond x and the derivative toggle.
 */
export function ActivationLab() {
  const [x, setX] = useState(1);
  const [showDeriv, setShowDeriv] = useState(false);

  // 161 sample points across [X_MIN, X_MAX] — dense enough for a
  // smooth curve at any reasonable display size.
  const xs = useMemo(() => {
    const n = 161;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      out.push(X_MIN + (i / (n - 1)) * (X_MAX - X_MIN));
    }
    return out;
  }, []);

  return (
    <SimFrame
      title="Activation Lab"
      headerWrap
      headerAction={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDeriv((d) => !d)}
            aria-pressed={showDeriv}
            className={clsx(
              'text-[11px] uppercase tracking-[0.18em] font-mono focus-ring transition-colors px-2 py-0.5 rounded border',
              showDeriv
                ? 'border-accent text-accent bg-accent-soft'
                : 'border-border text-muted hover:text-ink hover:border-border-strong',
            )}
          >
            f′(x) overlay
          </button>
          <button
            type="button"
            onClick={() => setX(1)}
            className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reset
          </button>
        </div>
      }
    >
      {/* X slider */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <label
            htmlFor="activation-x"
            className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono"
          >
            input x
          </label>
          <span className="font-mono text-[14px] text-accent tabular-nums">
            {x.toFixed(2)}
          </span>
        </div>
        <input
          id="activation-x"
          type="range"
          min={X_MIN}
          max={X_MAX}
          step={0.01}
          value={x}
          onChange={(e) => setX(parseFloat(e.target.value))}
          aria-valuetext={`${x.toFixed(2)}`}
          className="w-full accent-[rgb(var(--accent))]"
        />
        <div className="flex justify-between mt-1 text-[10px] text-dim font-mono tabular-nums">
          <span>{X_MIN}</span>
          <span>0</span>
          <span>+{X_MAX}</span>
        </div>
      </div>

      {/* Three curves */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ACTIVATIONS.map((act) => (
          <CurvePanel
            key={act.id}
            act={act}
            xs={xs}
            x={x}
            showDeriv={showDeriv}
          />
        ))}
      </div>
    </SimFrame>
  );
}

function CurvePanel({
  act,
  xs,
  x,
  showDeriv,
}: {
  act: ActivationSpec;
  xs: readonly number[];
  x: number;
  showDeriv: boolean;
}) {
  const W = 200;
  const H = 160;
  const PAD = 6;

  const xToPx = (xv: number) =>
    PAD + ((xv - X_MIN) / (X_MAX - X_MIN)) * (W - PAD * 2);
  const yToPx = (yv: number) =>
    H - PAD - ((yv - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD * 2);

  const pathF = useMemo(() => {
    let d = '';
    for (let i = 0; i < xs.length; i++) {
      const xv = xs[i]!;
      const yv = act.f(xv);
      const px = xToPx(xv);
      const py = yToPx(yv);
      d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ' ' + py.toFixed(2) + ' ';
    }
    return d;
    // xToPx/yToPx are pure derivations of constants; safe to omit deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, xs]);

  const pathFp = useMemo(() => {
    if (!showDeriv) return '';
    let d = '';
    for (let i = 0; i < xs.length; i++) {
      const xv = xs[i]!;
      const yv = act.fp(xv);
      const px = xToPx(xv);
      const py = yToPx(yv);
      d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ' ' + py.toFixed(2) + ' ';
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, xs, showDeriv]);

  const yAtX = act.f(x);
  const ypAtX = act.fp(x);
  const dotPx = xToPx(x);
  const dotPy = yToPx(yAtX);
  const zeroY = yToPx(0);
  const zeroX = xToPx(0);

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[13px] font-semibold text-ink tracking-[-0.005em]">
          {act.label}
        </div>
        <div className="text-[11px] font-mono text-accent tabular-nums">
          {yAtX.toFixed(3)}
        </div>
      </div>
      <div className="text-[10px] text-dim font-mono mb-2">{act.formula}</div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        className="block"
        aria-hidden="true"
      >
        {/* Axes */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={zeroY}
          y2={zeroY}
          className="stroke-border"
          strokeWidth={1}
        />
        <line
          x1={zeroX}
          x2={zeroX}
          y1={PAD}
          y2={H - PAD}
          className="stroke-border"
          strokeWidth={1}
        />
        {/* Activation curve */}
        <path
          d={pathF}
          fill="none"
          className="stroke-accent"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Derivative overlay */}
        {showDeriv && (
          <path
            d={pathFp}
            fill="none"
            className="stroke-fg-muted"
            strokeWidth={1.25}
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Vertical guide at current x */}
        <line
          x1={dotPx}
          x2={dotPx}
          y1={PAD}
          y2={H - PAD}
          className="stroke-fg-subtle"
          strokeWidth={0.75}
          strokeDasharray="2 3"
        />
        {/* Moving dot */}
        <circle
          cx={dotPx}
          cy={dotPy}
          r={3.5}
          className="fill-accent"
        />
      </svg>

      {showDeriv && (
        <div className="mt-1 text-[10px] font-mono text-fg-muted tabular-nums">
          f′(x) = {ypAtX.toFixed(3)}
        </div>
      )}
    </div>
  );
}
