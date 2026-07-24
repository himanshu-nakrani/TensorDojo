

import { useMemo, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { layerNorm } from '@/lib/math/layernorm';
import { rms, rmsNorm } from '@/lib/math/rmsnorm';

/**
 * Side-by-side comparison of LayerNorm and RMSNorm on the same
 * input vector. The user can shift the input's mean and scale the
 * input's spread; the two outputs and a per-element diff make the
 * "RMSNorm = LayerNorm without the mean" claim concrete.
 */
const D = 8;
const BASE: readonly number[] = [
  0.8, -1.2, 0.3, 1.4, -0.6, 0.9, -0.4, 0.2,
];

export function RMSNormCompare() {
  const [meanOffset, setMeanOffset] = useState(0);
  const [scale, setScale] = useState(1);

  const input = useMemo(() => {
    return BASE.map((v) => v * scale + meanOffset);
  }, [meanOffset, scale]);

  const lnOut = useMemo(() => layerNorm(input), [input]);
  const rnOut = useMemo(() => rmsNorm(input), [input]);

  const inputMean = useMemo(
    () => input.reduce((s, v) => s + v, 0) / input.length,
    [input],
  );
  const inputRMS = useMemo(() => rms(input), [input]);

  return (
    <SimFrame
      title="LayerNorm vs RMSNorm"
      onReset={() => {
        setMeanOffset(0);
        setScale(1);
      }}
    >
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Slider
          id="rms-mean-offset"
          label="mean offset"
          value={meanOffset}
          min={-2}
          max={2}
          step={0.01}
          onChange={setMeanOffset}
        />
        <Slider
          id="rms-scale"
          label="spread (×)"
          value={scale}
          min={0.2}
          max={2}
          step={0.01}
          onChange={setScale}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-[11px] font-mono">
        <Stat label="μ(x)" value={inputMean.toFixed(3)} />
        <Stat label="RMS(x)" value={inputRMS.toFixed(3)} />
      </div>

      {/* Two bar charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BarPanel
          label="LayerNorm output"
          formula="γ·(x − μ) / √(σ² + ε) + β"
          values={lnOut}
          accent="layernorm"
        />
        <BarPanel
          label="RMSNorm output"
          formula="γ·x / √(mean(x²) + ε)"
          values={rnOut}
          accent="rmsnorm"
        />
      </div>

      {/* Diff row */}
      <div className="mt-4 rounded-lg border border-border bg-bg/40 p-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            element-wise diff (LN − RMS)
          </span>
          <span className="text-[11px] font-mono text-accent tabular-nums">
            max |Δ| ={' '}
            {Math.max(
              ...lnOut.map((v, i) => Math.abs(v - (rnOut[i] as number))),
            ).toFixed(3)}
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-[11px] font-mono tabular-nums">
          {lnOut.map((v, i) => {
            const d = v - (rnOut[i] as number);
            return (
              <div
                key={i}
                className="text-center text-fg-muted"
                title={`Δ${i} = ${d.toFixed(3)}`}
              >
                {d >= 0 ? '+' : ''}
                {d.toFixed(2)}
              </div>
            );
          })}
        </div>
      </div>
    </SimFrame>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
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
        <span className="font-mono text-[14px] text-accent tabular-nums">
          {value.toFixed(2)}
        </span>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-bg/40 px-3 py-2 flex items-baseline justify-between">
      <span className="text-dim">{label}</span>
      <span className="text-accent tabular-nums">{value}</span>
    </div>
  );
}

function BarPanel({
  label,
  formula,
  values,
  accent,
}: {
  label: string;
  formula: string;
  values: readonly number[];
  accent: 'layernorm' | 'rmsnorm';
}) {
  const W = 240;
  const H = 110;
  const PAD = 6;
  const n = values.length;
  const cellW = (W - PAD * 2) / n;
  const maxAbs = Math.max(1.6, ...values.map((v) => Math.abs(v)));
  const yMid = H / 2;
  const scale = (H / 2 - PAD) / maxAbs;
  const fill =
    accent === 'layernorm'
      ? 'fill-[rgb(var(--accent))]'
      : 'fill-[rgb(var(--accent-hover))]';

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="text-[13px] font-semibold text-ink mb-0.5">{label}</div>
      <div className="text-[11px] text-dim font-mono mb-2">{formula}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
        {/* zero axis */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={yMid}
          y2={yMid}
          className="stroke-border"
          strokeWidth={1}
        />
        {values.map((v, i) => {
          const h = Math.abs(v) * scale;
          const x = PAD + i * cellW + cellW * 0.15;
          const w = cellW * 0.7;
          const y = v >= 0 ? yMid - h : yMid;
          return <rect key={i} x={x} y={y} width={w} height={h} className={fill} />;
        })}
      </svg>
      <div className="mt-2 grid grid-cols-8 gap-1 text-[10px] font-mono tabular-nums text-fg-muted">
        {values.map((v, i) => (
          <div key={i} className="text-center">
            {v.toFixed(2)}
          </div>
        ))}
      </div>
    </div>
  );
}
