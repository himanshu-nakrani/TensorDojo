

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Stack of N identical layers with per-layer Jacobian spectral
 * norm sigma. Renders the per-layer gradient magnitude flowing
 * from the output (right) to the input (left).
 *
 * Toggle "residual" to switch the per-layer effective spectral
 * norm from sigma to 1 + sigma (the I + J case): the gradient
 * stays bounded regardless of sigma.
 */
export function GradientProduct() {
  const [sigma, setSigma] = useState(0.9);
  const [N, setN] = useState(12);
  const [residual, setResidual] = useState(false);

  const grads = useMemo(() => {
    const effective = residual ? clampNorm(sigma) : sigma;
    const out: number[] = [];
    let g = 1;
    out.push(g);
    for (let i = 0; i < N; i += 1) {
      g *= effective;
      out.push(g);
    }
    return out;
  }, [sigma, N, residual]);

  const layerOneGrad = grads[grads.length - 1] ?? 1;

  return (
    <SimFrame
      title="Gradient through a stack of N layers"
      onReset={() => {
        setSigma(0.9);
        setN(12);
        setResidual(false);
      }}
      headerWrap
      headerAction={
        <ToggleButton on={residual} onToggle={() => setResidual((r) => !r)}>
          Residual connections
        </ToggleButton>
      }
    >
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Slider
          id="grad-sigma"
          label="per-layer spectral norm σ"
          value={sigma}
          min={0.4}
          max={1.4}
          step={0.01}
          onChange={setSigma}
          accent
        />
        <Slider
          id="grad-N"
          label={`stack depth N = ${N}`}
          value={N}
          min={1}
          max={48}
          step={1}
          onChange={(v) => setN(Math.round(v))}
        />
      </div>

      {/* Summary stat */}
      <div className="rounded-lg border border-border bg-bg/40 p-3 mb-4 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          layer-1 gradient magnitude
        </span>
        <span
          className={clsx(
            'font-mono text-[18px] tabular-nums',
            classify(layerOneGrad),
          )}
        >
          {formatGrad(layerOneGrad)}
        </span>
      </div>

      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2 flex items-center justify-between">
        <span>output</span>
        <span className="text-fg-muted normal-case tracking-normal font-mono">
          ← backward pass ←
        </span>
        <span>input</span>
      </div>

      {/* Bar chart of gradient magnitude per layer */}
      <BarStack grads={grads} />

      <p className="mt-3 text-[11px] text-dim font-mono">
        {residual
          ? 'Residual on: each layer adds the identity to its Jacobian. The product stays near 1 even for σ ≠ 1.'
          : `Plain stack: per-layer Jacobian ‖J‖ = ${sigma.toFixed(2)}. After N=${N} layers the gradient is multiplied by σ^N = ${(sigma ** N).toExponential(2)}.`}
      </p>
    </SimFrame>
  );
}

function clampNorm(sigma: number): number {
  // With a residual the per-step factor is well-bounded near 1.
  // We model it as 1 + 0.05*(sigma - 1) so the user can still see a
  // gentle drift but never an explosion or collapse. (The real I+J
  // bound depends on alignment with the identity; this captures the
  // visual intuition without being misleading.)
  return 1 + 0.05 * (sigma - 1);
}

function classify(g: number): string {
  if (g < 0.05) return 'text-[rgb(var(--negative))]';
  if (g > 20) return 'text-[rgb(var(--negative))]';
  if (g < 0.5 || g > 2) return 'text-amber-500 dark:text-amber-400';
  return 'text-accent';
}

function formatGrad(g: number): string {
  if (g === 0) return '0';
  if (Math.abs(g) >= 100 || Math.abs(g) < 0.01) return g.toExponential(2);
  return g.toFixed(3);
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  accent,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label
          htmlFor={id}
          className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
        >
          {label}
        </label>
        {accent && (
          <span className="font-mono text-[14px] text-accent tabular-nums">
            {value.toFixed(2)}
          </span>
        )}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[rgb(var(--accent))]"
      />
    </div>
  );
}

function ToggleButton({
  on,
  onToggle,
  children,
}: {
  on: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={clsx(
        'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
        on
          ? 'border-accent text-accent bg-accent-soft'
          : 'border-border text-muted hover:text-ink hover:border-border-strong',
      )}
    >
      {children}
    </button>
  );
}

function BarStack({ grads }: { grads: readonly number[] }) {
  const W = 480;
  const H = 160;
  const PAD = 8;
  const n = grads.length;
  const cellW = (W - PAD * 2) / n;

  // Log scale, clamped to [-3, 3] (i.e. 1e-3 to 1e3) so the chart
  // doesn't blow out under extreme sigma values.
  const log = (g: number) => {
    const v = Math.log10(Math.max(g, 1e-10));
    return Math.max(-3, Math.min(3, v));
  };
  // Map log10 in [-3, 3] to y in [H-PAD, PAD].
  const yToPx = (lv: number) =>
    PAD + ((3 - lv) / 6) * (H - PAD * 2);

  const zeroLine = yToPx(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
      {/* Log-scale gridlines */}
      {[3, 2, 1, 0, -1, -2, -3].map((lv) => (
        <g key={lv}>
          <line
            x1={PAD}
            x2={W - PAD}
            y1={yToPx(lv)}
            y2={yToPx(lv)}
            className={lv === 0 ? 'stroke-border-strong' : 'stroke-border'}
            strokeWidth={lv === 0 ? 1 : 0.5}
            strokeDasharray={lv === 0 ? '' : '2 4'}
          />
          <text
            x={W - PAD + 2}
            y={yToPx(lv) + 3}
            className="fill-fg-subtle"
            fontSize={8}
            fontFamily="monospace"
          >
            1e{lv >= 0 ? '+' : ''}
            {lv}
          </text>
        </g>
      ))}
      {grads.map((g, i) => {
        const lv = log(g);
        const x = PAD + i * cellW + cellW * 0.18;
        const w = cellW * 0.64;
        const y = lv >= 0 ? yToPx(lv) : zeroLine;
        const h = Math.abs(yToPx(lv) - zeroLine);
        const fill = g > 10 || g < 0.1
          ? 'fill-[rgb(var(--negative))]'
          : g > 2 || g < 0.5
            ? 'fill-amber-500'
            : 'fill-[rgb(var(--accent))]';
        return <rect key={i} x={x} y={y} width={w} height={h} className={fill} />;
      })}
    </svg>
  );
}
