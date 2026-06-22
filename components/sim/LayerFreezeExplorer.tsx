'use client';

import { useEffect, useRef, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { PRETRAINED_PARAMS } from '@/lib/math/pretrain-init';

/**
 * Centerpiece interactive for lesson 28 (freezing vs full fine-tuning).
 *
 * Reader toggles which of the three MLP layers to freeze, clicks Train,
 * and observes:
 *   - The training-loss curve (single animated line).
 *   - Per-layer gradient-norm bars (frozen layers show zero).
 *   - Final accuracy and "params updated" count.
 *
 * Math: calls `trainWithFreezeMask` from training.ts; gradient norms are
 * computed from a single analytic batch gradient (before masking) so the
 * comparison between layers is honest.
 */

// ── Constants ─────────────────────────────────────────────────────────────

const DATASET_SIZE = 64;
const TEST_OFFSET = 100;
const TEST_SIZE = 64;
const STEPS = 150;
const WARMUP_STEPS = 15;

// Layer parameter counts, mirroring freeze-mask.ts (N_IN=2, N_HID=8, N_OUT=3)
const L1_LEN = 8 * 2 + 8; // W1 + b1 = 24
const L2_LEN = 8 * 8 + 8; // W2 + b2 = 72
const L3_LEN = 3 * 8 + 3; // W3 + b3 = 27

// ── Types ──────────────────────────────────────────────────────────────────

type TrainWithFreezeMaskFn =
  typeof import('@/lib/math/training').trainWithFreezeMask;
type BackwardOneAnalyticFn =
  typeof import('@/lib/math/training').backwardOneAnalytic;
type SyntheticClassificationFn =
  typeof import('@/lib/math/training').syntheticClassification;
type DefaultInitParamsFn =
  typeof import('@/lib/math/training').defaultInitParams;
type FreezeParamCountFn =
  typeof import('@/lib/math/freeze-mask').freezeParamCount;
type FreezeMask = import('@/lib/math/freeze-mask').FreezeMask;

interface Mods {
  trainWithFreezeMask: TrainWithFreezeMaskFn;
  backwardOneAnalytic: BackwardOneAnalyticFn;
  syntheticClassification: SyntheticClassificationFn;
  defaultInitParams: DefaultInitParamsFn;
  freezeParamCount: FreezeParamCountFn;
}

interface TrainRunResult {
  losses: number[];
  testAcc: number[];
  finalAccuracy: number;
  diverged: boolean;
  paramsUpdated: number;
}

interface GradientNorms {
  l1: number;
  l2: number;
  l3: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function l2Norm(v: readonly number[], from: number, to: number): number {
  let s = 0;
  for (let i = from; i < to; i += 1) s += (v[i] ?? 0) ** 2;
  return Math.sqrt(s);
}

// ── LossCurve ─────────────────────────────────────────────────────────────

function LossCurve({
  result,
  displayStep,
}: {
  result: TrainRunResult | null;
  displayStep: number;
}) {
  const width = 420;
  const height = 160;

  if (!result) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto bg-bg/40 rounded"
        aria-label="Loss curve — press Train to see it."
      >
        <line
          x1={0} y1={height} x2={width} y2={height}
          stroke="rgb(var(--border))" strokeWidth={1}
        />
        <text
          x={width / 2} y={height / 2}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgb(var(--dim))" fontSize={10} fontFamily="monospace"
        >
          press Train to start
        </text>
      </svg>
    );
  }

  const visible = result.losses.slice(0, displayStep + 1).filter(Number.isFinite);
  if (visible.length === 0) return null;

  const max = Math.max(...visible);
  const min = Math.min(...visible, 0);
  const range = Math.max(max - min, 1e-6);

  const toPoints = (losses: number[], upTo: number): string =>
    losses
      .slice(0, upTo + 1)
      .map((v, i) => {
        if (!Number.isFinite(v)) return null;
        const x = (i / Math.max(1, losses.length - 1)) * width;
        const y = height - ((Math.min(v, max) - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto bg-bg/40 rounded"
      aria-label="Training loss vs step."
    >
      <polyline
        points={toPoints(result.losses, displayStep)}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
        opacity={0.9}
      />
      <line
        x1={0} y1={height} x2={width} y2={height}
        stroke="rgb(var(--border))" strokeWidth={1}
      />
    </svg>
  );
}

// ── GradientNormBars ───────────────────────────────────────────────────────

function GradientNormBars({
  norms,
  mask,
}: {
  norms: GradientNorms | null;
  mask: FreezeMask;
}) {
  const height = 120;
  const width = 420;
  const padL = 52;
  const padR = 12;
  const padT = 8;
  const padB = 8;
  const rowH = (height - padT - padB) / 3;

  const items: Array<{
    key: keyof GradientNorms;
    label: string;
    frozen: boolean;
  }> = [
    { key: 'l1', label: 'L1 ∇', frozen: mask.layer1 },
    { key: 'l2', label: 'L2 ∇', frozen: mask.layer2 },
    { key: 'l3', label: 'L3 ∇', frozen: mask.layer3 },
  ];

  // Max norm across all layers (pre-mask) for scale
  const maxNorm = norms
    ? Math.max(norms.l1, norms.l2, norms.l3, 1e-9)
    : 1;

  const plotW = width - padL - padR;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto bg-bg/40 rounded"
      aria-label="Per-layer gradient norms. Frozen layers show zero."
    >
      {items.map(({ key, label, frozen }, idx) => {
        const rawNorm = norms ? (norms[key] ?? 0) : 0;
        const displayNorm = frozen ? 0 : rawNorm;
        const barW = (displayNorm / maxNorm) * plotW;
        const cy = padT + idx * rowH + rowH / 2;
        const barH = Math.min(rowH * 0.55, 14);
        const barY = cy - barH / 2;
        const color = frozen ? 'rgb(var(--dim))' : 'rgb(var(--accent))';

        return (
          <g key={key}>
            {/* Label */}
            <text
              x={padL - 6}
              y={cy}
              textAnchor="end"
              dominantBaseline="middle"
              fill={frozen ? 'rgb(var(--dim))' : 'rgb(var(--ink))'}
              fontSize={9}
              fontFamily="monospace"
            >
              {label}
            </text>
            {/* Background track */}
            <rect
              x={padL}
              y={barY}
              width={plotW}
              height={barH}
              rx={2}
              fill="rgb(var(--border))"
              opacity={0.4}
            />
            {/* Bar */}
            {barW > 0 && (
              <rect
                x={padL}
                y={barY}
                width={Math.max(barW, 0)}
                height={barH}
                rx={2}
                fill={color}
                opacity={0.9}
              />
            )}
            {/* Frozen badge */}
            {frozen && (
              <text
                x={padL + 6}
                y={cy}
                dominantBaseline="middle"
                fill="rgb(var(--dim))"
                fontSize={8}
                fontFamily="monospace"
              >
                frozen
              </text>
            )}
            {/* Norm value */}
            {!frozen && norms && (
              <text
                x={padL + Math.max(barW, 0) + 4}
                y={cy}
                dominantBaseline="middle"
                fill="rgb(var(--dim))"
                fontSize={8}
                fontFamily="monospace"
                className="tabular-nums"
              >
                {rawNorm.toFixed(4)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function LayerFreezeExplorer() {
  const [mods, setMods] = useState<Mods | null>(null);
  const [mask, setMask] = useState<FreezeMask>({
    layer1: false,
    layer2: false,
    layer3: false,
  });
  const [result, setResult] = useState<TrainRunResult | null>(null);
  const [gradNorms, setGradNorms] = useState<GradientNorms | null>(null);
  const [displayStep, setDisplayStep] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);

  const rafRef = useRef<number | null>(null);

  // Load modules once
  useEffect(() => {
    Promise.all([
      import('@/lib/math/training'),
      import('@/lib/math/freeze-mask'),
    ]).then(([training, freezeMod]) => {
      setMods({
        trainWithFreezeMask: training.trainWithFreezeMask,
        backwardOneAnalytic: training.backwardOneAnalytic,
        syntheticClassification: training.syntheticClassification,
        defaultInitParams: training.defaultInitParams,
        freezeParamCount: freezeMod.freezeParamCount,
      });
    });
  }, []);

  // RAF animation
  useEffect(() => {
    if (!running) return;
    const startTime = performance.now();
    const DURATION = 1500;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      setDisplayStep(Math.round(progress * STEPS));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  const handleTrain = () => {
    if (!mods) return;
    setRunning(true);
    setResult(null);
    setGradNorms(null);
    setDisplayStep(0);

    setTimeout(() => {
      const {
        trainWithFreezeMask,
        backwardOneAnalytic,
        syntheticClassification,
        freezeParamCount,
      } = mods;

      const full = syntheticClassification(0);
      const dataset = full.slice(0, DATASET_SIZE);
      const testSet = full.slice(TEST_OFFSET, TEST_OFFSET + TEST_SIZE);
      const initParams = [...PRETRAINED_PARAMS];

      // ── Training run ─────────────────────────────────────────────────────
      const trainResult = trainWithFreezeMask({
        initParams,
        dataset,
        testSet,
        optimizer: 'adam',
        schedule: 'warmup-cosine',
        peakLr: 0.005,
        batchSize: 16,
        numSteps: STEPS,
        warmupSteps: WARMUP_STEPS,
        seed: 0,
        freezeMask: mask,
      });

      const finalAccuracy = trainResult.testAcc[trainResult.testAcc.length - 1] ?? 0;
      const paramsUpdated = freezeParamCount(mask);

      setResult({
        losses: trainResult.losses,
        testAcc: trainResult.testAcc,
        finalAccuracy,
        diverged: trainResult.diverged,
        paramsUpdated,
      });

      // ── Gradient norms — single batch, pre-mask (raw) ────────────────────
      // Compute the analytic gradient for a fixed 16-sample batch.
      const batchIndices: number[] = [];
      for (let i = 0; i < 16; i += 1) batchIndices.push(i % dataset.length);
      const batch = batchIndices.map((i) => dataset[i]!);

      // Mean gradient across the batch (same as what train() does)
      const grads = batch.map((e) => backwardOneAnalytic(initParams, e.x, e.label));
      const meanGrad = new Array<number>(grads[0]!.length).fill(0);
      for (const g of grads) {
        for (let i = 0; i < g.length; i += 1) meanGrad[i] = (meanGrad[i] ?? 0) + (g[i] ?? 0);
      }
      for (let i = 0; i < meanGrad.length; i += 1) meanGrad[i] = (meanGrad[i] ?? 0) / grads.length;

      setGradNorms({
        l1: l2Norm(meanGrad, 0, L1_LEN),
        l2: l2Norm(meanGrad, L1_LEN, L1_LEN + L2_LEN),
        l3: l2Norm(meanGrad, L1_LEN + L2_LEN, L1_LEN + L2_LEN + L3_LEN),
      });
      // running stays true; RAF effect clears it when animation ends
    }, 30);
  };

  const handleReset = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setResult(null);
    setGradNorms(null);
    setDisplayStep(0);
    setRunning(false);
  };

  const trainReady = mods !== null;
  const showBars = !running && result !== null;
  const paramsUpdated = mods ? mods.freezeParamCount(mask) : null;

  return (
    <SimFrame
      title="Layer freeze explorer"
      headerAction={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTrain}
            disabled={running || !trainReady}
            className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-sm hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {running ? 'Training…' : 'Train'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={running}
            className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-sm hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Layer checkboxes */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Freeze layers
          </div>
          <div className="flex flex-wrap gap-4">
            {(
              [
                { key: 'layer1' as const, label: 'Layer 1 (W1, b1)', count: L1_LEN },
                { key: 'layer2' as const, label: 'Layer 2 (W2, b2)', count: L2_LEN },
                { key: 'layer3' as const, label: 'Layer 3 (W3, b3)', count: L3_LEN },
              ] as const
            ).map(({ key, label, count }) => (
              <label
                key={key}
                className="flex items-center gap-2 font-mono text-sm cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={mask[key]}
                  disabled={running}
                  onChange={(e) =>
                    setMask((m) => ({ ...m, [key]: e.target.checked }))
                  }
                  className="accent-[rgb(var(--accent))]"
                />
                <span className={mask[key] ? 'text-dim' : 'text-ink'}>
                  {label}
                </span>
                <span className="text-[11px] text-dim tabular-nums">
                  ({count} params)
                </span>
              </label>
            ))}
          </div>
          {paramsUpdated !== null && (
            <div className="mt-1.5 font-mono text-[11px] text-fg-subtle tabular-nums">
              Params updated:{' '}
              <span className="text-ink">{paramsUpdated}</span> / 123
            </div>
          )}
        </div>

        {/* Loss curve */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Training loss vs step
          </div>
          <LossCurve result={result} displayStep={displayStep} />
          {(running || showBars) && (
            <div className="mt-1 font-mono text-[11px] text-fg-subtle tabular-nums">
              step {displayStep} / {STEPS}
            </div>
          )}
        </div>

        {/* Gradient norm bars */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Gradient norms per layer{' '}
            <span className="normal-case">(at init, before mask)</span>
          </div>
          <GradientNormBars norms={gradNorms} mask={mask} />
        </div>

        {/* Final accuracy */}
        {showBars && result && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
              Final test accuracy
            </div>
            {result.diverged && (
              <div className="inline-flex items-center gap-1.5 rounded border border-border bg-bg-elevated px-2 py-0.5 font-mono text-[11px] text-dim">
                diverged
              </div>
            )}
            {!result.diverged && (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between font-mono text-[11px]">
                  <span className="text-fg-subtle">
                    {mask.layer1 && mask.layer2 && mask.layer3
                      ? 'all layers frozen'
                      : mask.layer1 || mask.layer2 || mask.layer3
                      ? 'partial freeze'
                      : 'full fine-tune'}
                  </span>
                  <span className="text-ink tabular-nums">
                    {(result.finalAccuracy * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-border/40 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(result.finalAccuracy * 100).toFixed(1)}%`,
                      background: 'rgb(var(--accent))',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SimFrame>
  );
}
