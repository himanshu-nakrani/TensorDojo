

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  dequantize,
  quantizationError,
  quantize,
  weightBytes,
} from '@/lib/math/quantization';

/**
 * Centerpiece sim for the quantization lesson. Shows a single
 * group of weights (240 samples from an LLM-like distribution)
 * as a dot strip before and after quantization. As the bit slider
 * drops, the post-quantization strip collapses into a small set
 * of vertical "combs" — the 2^bits representable levels.
 *
 * Right panel: weight memory for one of three model sizes (7B /
 * 13B / 70B) at the chosen precision, with fp16 for reference.
 * Plus the RMS quantization error readout.
 */

const N_WEIGHTS = 240;
const BIT_OPTIONS = [2, 3, 4, 6, 8] as const;
const MODEL_OPTIONS = [
  { label: '7B', params: 7e9 },
  { label: '13B', params: 13e9 },
  { label: '70B', params: 70e9 },
] as const;
type ModelOption = (typeof MODEL_OPTIONS)[number];

/** Deterministic LLM-ish weight distribution: tight Gaussian + a few outliers. */
function makeWeights(seed: number): number[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: number[] = [];
  for (let i = 0; i < N_WEIGHTS; i++) {
    const u1 = Math.max(1e-9, rand());
    const u2 = rand();
    out.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.18);
  }
  // A handful of outliers — characteristic of trained LLM weights.
  out[11] = 1.05;
  out[57] = -0.92;
  out[131] = 0.86;
  out[198] = -1.18;
  return out;
}

export function QuantizationDistribution() {
  const [bits, setBits] = useState<(typeof BIT_OPTIONS)[number]>(4);
  const [model, setModel] = useState<ModelOption>(MODEL_OPTIONS[0]!);

  const weights = useMemo(() => makeWeights(11), []);

  const { reconstructed, rms } = useMemo(() => {
    const q = quantize(weights, bits, 'symmetric');
    const r = dequantize(q);
    const err = quantizationError(weights, r);
    return { reconstructed: r, rms: err.rms };
  }, [weights, bits]);

  const fp16Bytes = weightBytes(model.params, 16);
  const quantBytes = weightBytes(model.params, bits);
  const ratio = fp16Bytes / quantBytes;

  const reset = () => {
    setBits(4);
    setModel(MODEL_OPTIONS[0]!);
  };

  return (
    <SimFrame
      title="Weight distribution: before vs after quantization"
      onReset={reset}
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {BIT_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBits(b)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  bits === b
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {b}-bit
              </button>
            ))}
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
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-6">
        <div>
          <DistributionStrip
            label={`Original (fp16) — ${N_WEIGHTS.toLocaleString()} distinct values`}
            values={weights}
            variant="original"
          />
          <div className="h-3" />
          <DistributionStrip
            label={`Quantized (${bits}-bit) — ${1 << bits} distinct levels`}
            values={reconstructed}
            variant="quantized"
          />
          <p className="mt-3 text-[11px] text-dim font-mono leading-relaxed">
            Every dot in the lower strip is one of {1 << bits} quantization
            levels. Multiple original weights now share the same code; the
            distance from each dot's original position to its quantized
            position is the per-weight error.
          </p>
        </div>

        {/* Right: memory & error panel */}
        <div className="border border-border rounded p-4 bg-surface space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
                Model size
              </span>
              <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
                {MODEL_OPTIONS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setModel(m)}
                    className={clsx(
                      'px-2 py-0.5 transition-colors focus-ring',
                      model.label === m.label
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:text-ink',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <MemoryBar
                label="fp16 (reference)"
                bytes={fp16Bytes}
                refBytes={fp16Bytes}
                variant="muted"
              />
              <MemoryBar
                label={`${bits}-bit`}
                bytes={quantBytes}
                refBytes={fp16Bytes}
                variant="accent"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-2 font-mono text-[11px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-0.5">
                Memory ratio
              </div>
              <div className="text-accent tabular-nums text-[14px]">
                {ratio.toFixed(ratio < 10 ? 1 : 0)}× smaller
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-0.5">
                RMS quantization error
              </div>
              <div className="text-ink tabular-nums">{rms.toFixed(4)}</div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-5 pt-4 border-t border-border text-[11px] text-dim font-mono leading-relaxed">
        At <span className="text-ink">8-bit</span> the comb is dense enough
        that the eye can't tell it apart from the original. At{' '}
        <span className="text-ink">4-bit</span> only{' '}
        <span className="text-ink">16</span> distinct values are available
        across the entire range — most of the apparent precision is gone, and
        yet 4-bit-quantized 7B models score within a point of fp16 on most
        benchmarks. At <span className="text-ink">2-bit</span> the error
        becomes large enough to break model quality; that's the cliff
        production-grade quantization sits just above.
      </p>
    </SimFrame>
  );
}

function DistributionStrip({
  label,
  values,
  variant,
}: {
  label: string;
  values: readonly number[];
  variant: 'original' | 'quantized';
}) {
  const W = 480;
  const H = 70;
  const PAD = 12;

  // Use a symmetric range from the data extents so the two strips
  // share the same axis.
  const absMax = values.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const xMin = -Math.max(absMax, 1.2);
  const xMax = -xMin;
  const x = (v: number) => PAD + ((v - xMin) / (xMax - xMin)) * (W - 2 * PAD);

  const yJitter = (i: number) => 0.35 + ((i * 2654435761) % 100) / 100 * 0.3;
  const yPx = (i: number) => H - 10 - yJitter(i) * (H - 24);

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
        {label}
      </div>
      <div className="border border-border rounded bg-surface">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
          {/* Axis */}
          <line
            x1={PAD}
            y1={H - 6}
            x2={W - PAD}
            y2={H - 6}
            stroke="rgb(var(--border-strong))"
            strokeWidth={0.6}
          />
          {[-1, 0, 1].map((tx) => (
            <g key={tx}>
              <line
                x1={x(tx)}
                y1={H - 9}
                x2={x(tx)}
                y2={H - 3}
                stroke="rgb(var(--border-strong))"
                strokeWidth={0.6}
              />
              <text
                x={x(tx)}
                y={H - 12}
                textAnchor="middle"
                fontSize={8}
                className="fill-dim font-mono"
              >
                {tx.toFixed(1)}
              </text>
            </g>
          ))}
          {/* Dots */}
          {values.map((v, i) => (
            <circle
              key={i}
              cx={x(v)}
              cy={yPx(i)}
              r={1.3}
              fill={variant === 'original' ? 'rgb(var(--fg) / 0.55)' : 'rgb(var(--accent))'}
              opacity={variant === 'original' ? 0.65 : 0.8}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function MemoryBar({
  label,
  bytes,
  refBytes,
  variant,
}: {
  label: string;
  bytes: number;
  refBytes: number;
  variant: 'muted' | 'accent';
}) {
  const pct = Math.max(0.5, (bytes / refBytes) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] font-mono mb-1">
        <span className={variant === 'muted' ? 'text-dim' : 'text-accent'}>{label}</span>
        <span className="text-dim tabular-nums">{formatBytes(bytes)}</span>
      </div>
      <div className="relative h-5 rounded border border-border bg-bg-elevated overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all duration-200',
            variant === 'muted'
              ? 'bg-[rgb(var(--fg)/0.18)]'
              : 'bg-accent-soft border-r border-accent/40',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
