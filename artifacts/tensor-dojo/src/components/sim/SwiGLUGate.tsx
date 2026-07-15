

import { useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { silu, swiglu } from '@/lib/math/activations';

const RANGE = 4;

/**
 * SwiGLU gating, made legible. Two scalar inputs `a` (gate channel)
 * and `b` (value channel). The output is `silu(a) * b`. Three bars:
 * b on the left, silu(a) in the middle, and the product on the
 * right. Dragging either slider makes the multiplication visible:
 * when `a` is very negative, silu(a) ≈ 0 and the product is
 * suppressed regardless of `b`; when `a` is large and positive,
 * silu(a) ≈ a and the product passes b through (scaled).
 */
export function SwiGLUGate() {
  const [a, setA] = useState(1.2);
  const [b, setB] = useState(0.8);

  const gate = silu(a);
  const out = swiglu(a, b);

  return (
    <SimFrame title="SwiGLU Gate" onReset={() => { setA(1.2); setB(0.8); }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <SliderRow
          id="swiglu-a"
          label="a  (gate channel)"
          value={a}
          onChange={setA}
        />
        <SliderRow
          id="swiglu-b"
          label="b  (value channel)"
          value={b}
          onChange={setB}
        />
      </div>

      {/* Three signed bars, side-by-side. */}
      <div className="grid grid-cols-3 gap-3">
        <SignedBar label="b" value={b} accent={false} />
        <SignedBar label="silu(a)" value={gate} accent={false} />
        <SignedBar label="silu(a) · b" value={out} accent />
      </div>

      <p className="mt-5 pt-4 border-t border-border text-[12px] text-fg-muted font-mono leading-relaxed">
        Drag a far negative. silu(a) collapses toward zero, so the
        product collapses toward zero regardless of b. That is the
        gate: a decides how much of b gets through.
      </p>
    </SimFrame>
  );
}

function SliderRow({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
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
        min={-RANGE}
        max={RANGE}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-valuetext={value.toFixed(2)}
        className="w-full accent-[rgb(var(--accent))]"
      />
    </div>
  );
}

function SignedBar({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: boolean;
}) {
  // Bar scale: ±RANGE × 1.0 (silu can exceed RANGE slightly; the
  // product can hit ~RANGE^2). Use 2*RANGE so common values fit.
  const SCALE = RANGE * 2;
  const frac = Math.max(-1, Math.min(1, value / SCALE));
  const half = 50;
  const widthPct = Math.abs(frac) * half;
  const isPositive = frac >= 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          {label}
        </span>
        <span
          className={
            (accent ? 'text-accent ' : 'text-ink ') +
            'font-mono text-[12px] tabular-nums'
          }
        >
          {value.toFixed(2)}
        </span>
      </div>
      <div className="relative h-5 rounded-sm bg-bg/40 overflow-hidden">
        <div
          className="absolute inset-y-0 w-px bg-border-strong"
          style={{ left: `${half}%` }}
        />
        <div
          className={
            'absolute inset-y-0 transition-all duration-150 ease-out ' +
            (accent
              ? isPositive
                ? 'bg-accent'
                : 'bg-[var(--negative-bg)]'
              : isPositive
                ? 'bg-fg-subtle'
                : 'bg-[var(--negative-bg)]')
          }
          style={
            isPositive
              ? { left: `${half}%`, width: `${widthPct}%` }
              : { left: `${half - widthPct}%`, width: `${widthPct}%` }
          }
        />
      </div>
    </div>
  );
}
