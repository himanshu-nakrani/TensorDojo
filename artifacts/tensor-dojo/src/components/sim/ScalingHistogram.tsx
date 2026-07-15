

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { sampleDotProducts } from '@/lib/math/random';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

export interface ScalingHistogramPreset {
  dK?: number;
  scale?: boolean;
}

const N_PAIRS = 4000;

/** Log-scale choices for the d_k slider (1 → 128). */
const D_K_CHOICES = [1, 2, 4, 8, 16, 32, 64, 128] as const;

const BIN_WIDTH = 0.25; // in raw units; we'll scale the axis to fit
const N_BINS = 41; // covers -5 to +5 in raw units
const MAX_RAW = 5;
const SAMPLES_KEY = (d: number, scale: boolean) => `hist:${d}:${scale ? 1 : 0}`;

/**
 * Bins dot product values into a histogram.
 * `scale` is whether the inputs are already divided by √d_k.
 */
function buildHistogram(values: number[], scale: boolean): number[] {
  const bins = new Array<number>(N_BINS).fill(0);
  for (const v of values) {
    const scaled = scale ? v / Math.sqrt(MAX_RAW) : v; // no-op for unscaled (we pass raw)
    const idx = Math.floor((scaled + MAX_RAW) / BIN_WIDTH);
    if (idx < 0 || idx >= N_BINS) continue;
    bins[idx] = (bins[idx] ?? 0) + 1;
  }
  return bins;
}

export function ScalingHistogram({ preset }: { preset?: ScalingHistogramPreset }) {
  const [dK, setDK] = useState<number>(preset?.dK ?? 16);
  const [scale, setScale] = useState<boolean>(preset?.scale ?? false);

  const rawSamples = useMemo(
    () => sampleDotProducts(N_PAIRS, dK, 0),
    [dK],
  );
  const theoreticalStd = Math.sqrt(dK);

  // When scaling is on, the values are divided by √d_k, so the std
  // drops to 1. The histogram x-axis stays in raw units though — we
  // rescale the axis labels and the bin positions accordingly.
  const scaledSamples = useMemo(
    () => scale ? rawSamples.map((v) => v / theoreticalStd) : rawSamples,
    [rawSamples, scale, theoreticalStd],
  );

  // Empirical std of what's actually displayed (raw or scaled).
  const empiricalStd = useMemo(() => {
    const n = scaledSamples.length;
    if (n === 0) return 0;
    let mean = 0;
    for (const v of scaledSamples) mean += v;
    mean /= n;
    let varSum = 0;
    for (const v of scaledSamples) varSum += (v - mean) ** 2;
    return Math.sqrt(varSum / n);
  }, [scaledSamples]);

  // Bin in raw units when not scaling, in std-units when scaling.
  const bins = useMemo(() => {
    const localBinWidth = scale ? BIN_WIDTH / theoreticalStd : BIN_WIDTH;
    const localMaxRaw = scale ? MAX_RAW / theoreticalStd : MAX_RAW;
    const localNBins = Math.ceil((2 * localMaxRaw) / localBinWidth) + 1;
    const out = new Array<number>(localNBins).fill(0);
    for (const v of scaledSamples) {
      const idx = Math.floor((v + localMaxRaw) / localBinWidth);
      if (idx < 0 || idx >= localNBins) continue;
      out[idx] = (out[idx] ?? 0) + 1;
    }
    return { counts: out, binWidth: localBinWidth, maxRaw: localMaxRaw };
  }, [scaledSamples, scale, theoreticalStd]);

  const maxCount = Math.max(1, ...bins.counts);

  // Width of the plot in viewBox units; bar width follows.
  const plotW = 440;
  const plotH = 200;
  const barGap = 1;
  const barW = bins.counts.length > 0 ? plotW / bins.counts.length - barGap : 0;

  return (
    <SimFrame
      title="Variance grows with d_k · 1/√d_k brings it back to 1"
      onReset={() => {
        setDK(16);
        setScale(false);
      }}
    >
      <div className="space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Q · K distribution · {N_PAIRS.toLocaleString()} random pairs
          </div>
          <div className="text-[11px] text-muted font-mono mb-1 tabular-nums">
            empirical std = {empiricalStd.toFixed(2)}
            <span className="text-dim">
              {' '}
              (theoretical: {scale ? '1.00' : `√${dK} = ${theoreticalStd.toFixed(2)}`})
            </span>
          </div>
          <svg
            viewBox={`0 0 ${plotW} ${plotH + 24}`}
            preserveAspectRatio="none"
            className="block w-full h-auto"
            role="img"
            aria-label="Histogram of dot product distribution"
          >
            {/* Baseline */}
            <line
              x1={0}
              x2={plotW}
              y1={plotH}
              y2={plotH}
              className="text-border"
              stroke="currentColor"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
            {/* Zero line */}
            {bins.maxRaw > 0 && (
              <line
                x1={(bins.maxRaw / (2 * bins.maxRaw)) * plotW}
                x2={(bins.maxRaw / (2 * bins.maxRaw)) * plotW}
                y1={0}
                y2={plotH}
                className="text-border-strong"
                stroke="currentColor"
                strokeWidth={0.4}
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {/* Bars */}
            {bins.counts.map((c, i) => {
              const h = (c / maxCount) * plotH;
              const x = (i * (plotW / bins.counts.length)) + barGap / 2;
              return (
                <rect
                  key={i}
                  x={x}
                  y={plotH - h}
                  width={Math.max(0, barW)}
                  height={h}
                  className="fill-accent transition-all duration-150"
                />
              );
            })}
            {/* X-axis labels */}
            {[-bins.maxRaw, -bins.maxRaw / 2, 0, bins.maxRaw / 2, bins.maxRaw].map(
              (label, i) => {
                const x = ((label + bins.maxRaw) / (2 * bins.maxRaw)) * plotW;
                return (
                  <text
                    key={i}
                    x={x}
                    y={plotH + 14}
                    textAnchor="middle"
                    className="fill-dim font-mono"
                    fontSize={9}
                    style={{ fontSize: 9 }}
                  >
                    {label === 0 ? '0' : label.toFixed(1)}
                  </text>
                );
              },
            )}
          </svg>
          <div className="text-[11px] text-dim font-mono mt-1 text-center">
            Q · K{scale ? ' / √d_k' : ''} ({(scale ? 'scaled' : 'raw')})
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
              Dimension d_k
            </div>
            <div className="flex items-center gap-2">
              {D_K_CHOICES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDK(d)}
                  className={clsx(
                    'px-2.5 py-1 rounded font-mono text-[11px] tabular-nums focus-ring transition-colors',
                    d === dK
                      ? 'bg-accent text-bg'
                      : 'bg-bg/40 text-muted hover:text-ink border border-border',
                  )}
                  aria-pressed={d === dK}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-dim font-mono mt-2">
              As d_k grows, Q · K spreads wider. Pre-softmax scores are
              bigger, softmax saturates, gradients vanish.
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
              Scale by 1/√d_k
            </div>
            <button
              type="button"
              onClick={() => setScale((s) => !s)}
              className={clsx(
                'text-[11px] uppercase tracking-[0.12em] font-mono px-3 py-1.5 rounded border focus-ring transition-colors',
                scale
                  ? 'border-accent text-accent bg-accent-faint'
                  : 'border-border text-muted hover:text-ink',
              )}
              aria-pressed={scale}
            >
              {scale ? 'Scaling on (×1/√d_k)' : 'Scale off'}
            </button>
            <div className="text-[11px] text-dim font-mono mt-2">
              Divide every score by √d_k. The histogram snaps back to
              unit scale. Softmax now sees scores with the same scale
              at any dimension.
            </div>
          </div>
        </div>
      </div>
    </SimFrame>
  );
}
