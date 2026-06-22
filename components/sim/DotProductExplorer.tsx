'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  VectorCanvas,
  type VectorCanvasVector,
} from '@/components/sim/primitives/VectorCanvas';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { cosTheta, dot, magnitude } from '@/lib/math/linalg';

export interface DotProductPreset {
  a?: readonly [number, number];
  b?: readonly [number, number];
}

const DEFAULT_A: [number, number] = [1.4, 0.6];
const DEFAULT_B: [number, number] = [-0.4, 1.3];

const SCALE = 5; // |a|·|b| upper bound used to scale the signed bar.

function fmt(x: number, digits = 2): string {
  // Avoid "-0.00" noise.
  if (Math.abs(x) < Math.pow(10, -digits)) return (0).toFixed(digits);
  return x.toFixed(digits);
}

/**
 * Centerpiece for the dot-product lesson. Two 2D vectors a, b on a shared
 * plane; drag either tip. Live readouts: |a|, |b|, cos θ, a·b. A signed
 * bar visualizes a·b on a fixed scale so positive vs negative is
 * unambiguous.
 */
export function DotProductExplorer({ preset }: { preset?: DotProductPreset }) {
  const [a, setA] = useState<[number, number]>(() => {
    const v = preset?.a ?? DEFAULT_A;
    return [v[0], v[1]];
  });
  const [b, setB] = useState<[number, number]>(() => {
    const v = preset?.b ?? DEFAULT_B;
    return [v[0], v[1]];
  });

  const dp = useMemo(() => dot(a, b), [a, b]);
  const ma = useMemo(() => magnitude(a), [a]);
  const mb = useMemo(() => magnitude(b), [b]);
  const c = useMemo(() => cosTheta(a, b), [a, b]);

  const vectors: VectorCanvasVector[] = [
    { id: 'a', label: 'a', value: a },
    { id: 'b', label: 'b', value: b },
  ];

  const setVector = (id: string, value: [number, number]) => {
    if (id === 'a') setA(value);
    else if (id === 'b') setB(value);
  };

  const reset = () => {
    setA([...DEFAULT_A]);
    setB([...DEFAULT_B]);
  };

  // Signed bar: center is zero, right is positive, left is negative.
  const barFrac = Math.max(-1, Math.min(1, dp / SCALE));
  const isPositive = barFrac >= 0;
  const half = 50; // percent — center of the bar track
  const widthPct = Math.abs(barFrac) * half;

  return (
    <SimFrame title="Drag a or b · watch a · b" onReset={reset}>
      <VectorCanvas
        vectors={vectors}
        onChange={setVector}
        height={280}
        ariaLabel="2D plane with two draggable vectors a and b."
      />

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-5 font-mono text-[13px]">
        <Readout label="|a|" value={fmt(ma, 2)} />
        <Readout label="|b|" value={fmt(mb, 2)} />
        <Readout label="cos θ" value={fmt(c, 3)} />
        <Readout
          label="a · b"
          value={fmt(dp, 2)}
          accent
        />
      </dl>

      {/* Signed bar */}
      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
          a · b (signed)
        </div>
        <div className="relative h-6 rounded-sm bg-bg/40 overflow-hidden">
          {/* Center mark */}
          <div
            className="absolute inset-y-0 w-px bg-border-strong"
            style={{ left: `${half}%` }}
          />
          {/* Filled bar */}
          <div
            className={clsx(
              'absolute inset-y-0 transition-all duration-200 ease-out',
              isPositive ? 'bg-accent' : 'bg-[var(--negative-bg)]',
            )}
            style={
              isPositive
                ? { left: `${half}%`, width: `${widthPct}%` }
                : { left: `${half - widthPct}%`, width: `${widthPct}%` }
            }
          />
        </div>
        <div className="flex justify-between mt-1 text-[11px] text-dim font-mono tabular-nums">
          <span>−{SCALE}</span>
          <span>0</span>
          <span>+{SCALE}</span>
        </div>
      </div>
    </SimFrame>
  );
}

function Readout({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-dim">
        {label}
      </dt>
      <dd
        className={clsx(
          'tabular-nums',
          accent ? 'text-accent' : 'text-ink',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
