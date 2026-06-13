'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { sinusoidalPE } from '@/lib/math/positional';

export interface PositionalEncodingHeatmapPreset {
  maxPos?: number;
  d?: number;
}

/**
 * Heatmap of PE[pos, dim] for pos ∈ [0, maxPos), dim ∈ [0, d).
 * Sliders for maxPos and d. The cells use a teal-only colormap
 * (PE values are in [-1, 1], so accent is positive, dim teal is
 * negative, mid is muted).
 */
export function PositionalEncodingHeatmap({ preset }: { preset?: PositionalEncodingHeatmapPreset }) {
  const [maxPos, setMaxPos] = useState(preset?.maxPos ?? 16);
  const [d, setD] = useState(preset?.d ?? 16);
  const [a, setA] = useState(0);
  const [b, setB] = useState(4);

  const pe = useMemo(() => sinusoidalPE(maxPos, d), [maxPos, d]);
  const dotAB = useMemo(() => {
    if (a >= pe.length || b >= pe.length) return 0;
    const va = pe[a]!;
    const vb = pe[b]!;
    let s = 0;
    for (let i = 0; i < va.length; i += 1) s += (va[i] as number) * (vb[i] as number);
    return s;
  }, [pe, a, b]);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Positional encoding
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            PE heatmap ({maxPos} positions × {d} dims)
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${d}, minmax(0, 1fr))` }}>
            {/* Header row of position indices */}
            <div className="text-[9px] text-dim font-mono text-center">pos</div>
            {Array.from({ length: d }, (_, dim) => (
              <div key={dim} className="text-[9px] text-dim font-mono text-center">{dim}</div>
            ))}
            {/* Rows */}
            {pe.map((row, pos) => (
              <>
                <div key={`l${pos}`} className="text-[9px] text-dim font-mono text-center pr-1">{pos}</div>
                {row.map((v, dim) => (
                  <div
                    key={`c${pos}-${dim}`}
                    className="aspect-square rounded-sm"
                    style={{
                      background: v > 0
                        ? `rgba(45, 212, 191, ${Math.min(1, Math.abs(v) * 0.9).toFixed(2)})`
                        : `rgba(248, 113, 113, ${Math.min(1, Math.abs(v) * 0.7).toFixed(2)})`,
                    }}
                    title={`PE(${pos}, ${dim}) = ${v.toFixed(3)}`}
                  />
                ))}
              </>
            ))}
          </div>
        </div>

        <div className="space-y-3 font-mono text-[12px]">
          <SliderRow label="max position" value={maxPos} min={4} max={32} step={1} onChange={setMaxPos} />
          <SliderRow label="d (model dim)" value={d} min={4} max={32} step={2} onChange={(v) => setD(v % 2 === 0 ? v : v + 1)} />

          <div className="pt-3 border-t border-border space-y-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
              Distance probe
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberRow label="pos a" value={a} onChange={setA} max={maxPos - 1} />
              <NumberRow label="pos b" value={b} onChange={setB} max={maxPos - 1} />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-dim">PE(a) · PE(b)</span>
              <span className="text-accent">{dotAB.toFixed(3)}</span>
            </div>
            <p className="text-[10px] text-dim leading-relaxed">
              As |a − b| grows, the dot product changes smoothly — that is how the model "feels" distance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
          {label}
        </span>
        <span className="text-ink tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="slider w-full"
        style={{ ['--fill' as string]: `${((value - min) / (max - min)) * 100}%` }}
        aria-label={label}
      />
    </div>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <label className="block">
      <div className="text-[10px] text-dim font-mono mb-1">{label}</div>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="number-input font-mono w-full"
        aria-label={label}
      />
    </label>
  );
}
