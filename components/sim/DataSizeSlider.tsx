'use client';

import { useEffect, useRef, useState } from 'react';
import { PRETRAINED_PARAMS } from '@/lib/math/pretrain-init';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

const N_VALUES = [8, 16, 32, 64, 128, 256] as const;
type NValue = (typeof N_VALUES)[number];

const STEPS = 200;
const TEST_SIZE = 64;

interface CacheEntry {
  scratchLoss: number;
  pretrainedLoss: number;
}

// ── Dynamic-import types ────────────────────────────────────────────────────

type TrainMod = {
  train: typeof import('@/lib/math/training').train;
  syntheticClassification: typeof import('@/lib/math/training').syntheticClassification;
  defaultInitParams: typeof import('@/lib/math/training').defaultInitParams;
};

// ── GapChart ────────────────────────────────────────────────────────────────

function GapChart({
  cache,
  activeN,
}: {
  cache: Record<number, CacheEntry>;
  activeN: NValue;
}) {
  const width = 420;
  const height = 160;
  const padL = 36;
  const padR = 12;
  const padT = 10;
  const padB = 20;

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  // Collect all cached loss values to set y-axis range.
  const allLosses: number[] = [];
  for (const entry of Object.values(cache)) {
    allLosses.push(entry.scratchLoss, entry.pretrainedLoss);
  }
  const finiteLosses = allLosses.filter(Number.isFinite);
  const yMax = finiteLosses.length > 0 ? Math.max(...finiteLosses) * 1.1 : 1;
  const yMin = 0;
  const yRange = Math.max(yMax - yMin, 1e-6);

  // Map N index → x position (evenly spaced across 6 positions).
  const xPos = (idx: number) => padL + (idx / (N_VALUES.length - 1)) * plotW;

  // Map loss value → y position.
  const yPos = (v: number) =>
    padT + plotH - ((v - yMin) / yRange) * plotH;

  // Build polyline points for a given series.
  const seriesPoints = (key: keyof CacheEntry) =>
    N_VALUES.map((n, i) => {
      const entry = cache[n];
      if (!entry) return null;
      if (!Number.isFinite(entry[key])) return null;
      return { x: xPos(i), y: yPos(entry[key]) };
    }).filter((p): p is { x: number; y: number } => p !== null);

  const toPolyline = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const scratchPts = seriesPoints('scratchLoss');
  const pretrainedPts = seriesPoints('pretrainedLoss');

  // Y-axis tick count.
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((t) => t * yMax);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto bg-bg/40 rounded"
      aria-label="Final loss vs dataset size for scratch and pretrained runs."
    >
      {/* Y-axis ticks + gridlines */}
      {yTicks.map((v) => {
        const y = yPos(v);
        return (
          <g key={v}>
            <line
              x1={padL}
              y1={y}
              x2={padL + plotW}
              y2={y}
              stroke="rgb(var(--border))"
              strokeWidth={0.5}
              strokeDasharray="2 3"
            />
            <text
              x={padL - 4}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="rgb(var(--dim))"
              fontSize={8}
              fontFamily="monospace"
              className="tabular-nums"
            >
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* X-axis baseline */}
      <line
        x1={padL}
        y1={padT + plotH}
        x2={padL + plotW}
        y2={padT + plotH}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />

      {/* X-axis labels (N values) */}
      {N_VALUES.map((n, i) => (
        <text
          key={n}
          x={xPos(i)}
          y={padT + plotH + 12}
          textAnchor="middle"
          fill={n === activeN ? 'rgb(var(--ink))' : 'rgb(var(--dim))'}
          fontSize={8}
          fontFamily="monospace"
          className="tabular-nums"
        >
          {n}
        </text>
      ))}

      {/* Y-axis label */}
      <text
        x={8}
        y={padT + plotH / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgb(var(--dim))"
        fontSize={7}
        fontFamily="monospace"
        transform={`rotate(-90, 8, ${padT + plotH / 2})`}
      >
        final loss
      </text>

      {/* Scratch line */}
      {scratchPts.length >= 2 && (
        <polyline
          points={toPolyline(scratchPts)}
          fill="none"
          stroke="rgb(var(--dim))"
          strokeWidth={1.5}
          opacity={0.85}
        />
      )}

      {/* Pretrained line */}
      {pretrainedPts.length >= 2 && (
        <polyline
          points={toPolyline(pretrainedPts)}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={1.5}
          opacity={0.9}
        />
      )}

      {/* Dots for each cached point — scratch */}
      {scratchPts.map((p, i) => (
        <circle
          key={`s-${i}`}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="rgb(var(--dim))"
          opacity={0.85}
        />
      ))}

      {/* Dots for each cached point — pretrained */}
      {pretrainedPts.map((p, i) => (
        <circle
          key={`pt-${i}`}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="rgb(var(--accent))"
          opacity={0.9}
        />
      ))}
    </svg>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 font-mono text-[10px]">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-3 h-0.5"
          style={{ background: 'rgb(var(--dim))' }}
        />
        from scratch
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-3 h-0.5"
          style={{ background: 'rgb(var(--accent))' }}
        />
        pretrained
      </span>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function DataSizeSlider() {
  const [mods, setMods] = useState<TrainMod | null>(null);
  const [nIdx, setNIdx] = useState<number>(2);
  const [cache, setCache] = useState<Record<number, CacheEntry>>({});
  const [pending, setPending] = useState<boolean>(false);
  const [divergedAt, setDivergedAt] = useState<number | null>(null);
  const cacheRef = useRef(cache);

  // Load training module once.
  useEffect(() => {
    import('@/lib/math/training').then((mod) => {
      setMods({
        train: mod.train,
        syntheticClassification: mod.syntheticClassification,
        defaultInitParams: mod.defaultInitParams,
      });
    });
  }, []);

  // Keep cacheRef in sync so the training effect can read freshness without depending on cache.
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // Run both trainings for the current N when mods are ready and cache is cold.
  useEffect(() => {
    if (!mods) return;
    const n = N_VALUES[nIdx]!;
    if (cacheRef.current[n]) return; // already cached
    if (pending) return;  // a run is already in flight

    setDivergedAt(null);
    setPending(true);

    setTimeout(() => {
      const { train, syntheticClassification, defaultInitParams } = mods;
      const full = syntheticClassification(0); // 200 samples
      const fineTune = full.slice(0, n);
      const testSet = full.slice(100, 100 + TEST_SIZE);
      const batchSize = Math.min(16, n);

      const sharedConfig = {
        dataset: fineTune,
        testSet,
        optimizer: 'adam' as const,
        schedule: 'warmup-cosine' as const,
        peakLr: 0.005,
        batchSize,
        numSteps: STEPS,
        warmupSteps: 20,
        seed: 0,
      };

      const scratchResult = train({
        ...sharedConfig,
        initParams: defaultInitParams(7),
      });

      const pretrainedResult = train({
        ...sharedConfig,
        initParams: [...PRETRAINED_PARAMS],
      });

      if (scratchResult.diverged || pretrainedResult.diverged) {
        setDivergedAt(n);
        setPending(false);
        return;
      }

      const scratchLoss = scratchResult.losses.at(-1) ?? Infinity;
      const pretrainedLoss = pretrainedResult.losses.at(-1) ?? Infinity;

      setCache((prev) => ({ ...prev, [n]: { scratchLoss, pretrainedLoss } }));
      setPending(false);
    }, 30);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cache read via cacheRef to avoid spurious re-fires
  }, [mods, nIdx, pending]);

  const activeN = N_VALUES[nIdx]!;

  const reset = () => {
    setNIdx(2);
  };

  return (
    <SimFrame title="Fine-tune dataset size vs final loss" onReset={reset}>
      <div className="space-y-4">
        {/* Slider */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Fine-tune dataset size
          </div>
          <Slider
            value={nIdx}
            min={0}
            max={N_VALUES.length - 1}
            step={1}
            onChange={(v) => setNIdx(Math.round(v))}
            formatValue={() => `${activeN} samples`}
            ariaLabel="Fine-tune dataset size"
            valueMinWidth="8ch"
          />
        </div>

        {/* Gap chart */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Final loss vs N
          </div>
          <GapChart cache={cache} activeN={activeN} />
        </div>

        {/* Legend */}
        <Legend />

        {/* Status line */}
        <div className="font-mono text-[10px] text-fg-subtle tabular-nums h-4">
          {pending
            ? `training at N=${activeN}…`
            : divergedAt !== null && divergedAt === activeN
            ? `N=${activeN} diverged`
            : ''}
        </div>
      </div>
    </SimFrame>
  );
}
