

import { useEffect, useRef, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { PRETRAINED_PARAMS } from '@/lib/math/pretrain-init';

/**
 * Centerpiece interactive for lesson 27 (fine-tuning).
 *
 * Two parallel training runs on the same small fine-tune set (32 samples
 * from `syntheticClassification(0)`). One run starts from random init
 * (scratch), the other from PRETRAINED_PARAMS. The small dataset
 * deliberately magnifies the head-start the pretrained weights provide.
 *
 * Layout:
 *   - Train / Reset buttons
 *   - Shared loss-curve SVG (both runs, animated reveal)
 *   - Final accuracy bars (shown after training completes)
 *   - Legend
 */

interface RunResult {
  losses: number[];
  testAcc: number[];
}

const FINETUNE_SIZE = 32; // small N magnifies the pretrain gap
const TEST_SIZE = 64;
const STEPS = 200;

// ── Internal sub-components ────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
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

function LossCurves({
  scratchRun,
  pretrainedRun,
  displayStep,
}: {
  scratchRun: RunResult | null;
  pretrainedRun: RunResult | null;
  displayStep: number;
}) {
  const width = 420;
  const height = 160;

  const hasData = scratchRun !== null && pretrainedRun !== null;

  if (!hasData) {
    // Empty axes while no data is available
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto bg-bg/40 rounded"
        aria-label="Loss curves will appear after training."
      >
        <line
          x1={0}
          y1={height}
          x2={width}
          y2={height}
          stroke="rgb(var(--border))"
          strokeWidth={1}
        />
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgb(var(--dim))"
          fontSize={10}
          fontFamily="monospace"
        >
          press Train to start
        </text>
      </svg>
    );
  }

  const all = [
    ...scratchRun.losses.slice(0, displayStep + 1),
    ...pretrainedRun.losses.slice(0, displayStep + 1),
  ];
  const finite = all.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;

  const max = Math.max(...finite);
  const min = Math.min(...finite, 0);
  const range = Math.max(max - min, 1e-6);

  const toPoints = (losses: number[], upTo: number) =>
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
      aria-label="Loss vs step for scratch and pretrained runs."
    >
      <polyline
        points={toPoints(scratchRun.losses, displayStep)}
        fill="none"
        stroke="rgb(var(--dim))"
        strokeWidth={1.5}
        opacity={0.85}
      />
      <polyline
        points={toPoints(pretrainedRun.losses, displayStep)}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
        opacity={0.9}
      />
      <line
        x1={0}
        y1={height}
        x2={width}
        y2={height}
        stroke="rgb(var(--border))"
        strokeWidth={1}
      />
    </svg>
  );
}

function FinalAccuracyBars({
  scratchRun,
  pretrainedRun,
}: {
  scratchRun: RunResult;
  pretrainedRun: RunResult;
}) {
  const scratchAcc = scratchRun.testAcc[scratchRun.testAcc.length - 1] ?? 0;
  const pretrainedAcc =
    pretrainedRun.testAcc[pretrainedRun.testAcc.length - 1] ?? 0;

  const rows: Array<{ label: string; acc: number; color: string }> = [
    { label: 'from scratch', acc: scratchAcc, color: 'rgb(var(--dim))' },
    { label: 'pretrained', acc: pretrainedAcc, color: 'rgb(var(--accent))' },
  ];

  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
        Final test accuracy
      </div>
      {rows.map(({ label, acc, color }) => (
        <div key={label} className="space-y-0.5">
          <div className="flex items-baseline justify-between font-mono text-[11px]">
            <span className="text-fg-subtle">{label}</span>
            <span className="text-ink tabular-nums">
              {(acc * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-border/40 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(acc * 100).toFixed(1)}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type TrainFn = typeof import('@/lib/math/training').train;
type SyntheticClassificationFn =
  typeof import('@/lib/math/training').syntheticClassification;
type DefaultInitParamsFn =
  typeof import('@/lib/math/training').defaultInitParams;

export function PretrainVsScratch() {
  const [trainFn, setTrainFn] = useState<TrainFn | null>(null);
  const [syntheticFn, setSyntheticFn] =
    useState<SyntheticClassificationFn | null>(null);
  const [defaultInitFn, setDefaultInitFn] =
    useState<DefaultInitParamsFn | null>(null);

  const [scratchRun, setScratchRun] = useState<RunResult | null>(null);
  const [pretrainedRun, setPretrainedRun] = useState<RunResult | null>(null);
  const [displayStep, setDisplayStep] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);

  const rafRef = useRef<number | null>(null);

  // Dynamically import the training module so it's not in the home-page chunk.
  useEffect(() => {
    import('@/lib/math/training').then((mod) => {
      setTrainFn(() => mod.train);
      setSyntheticFn(() => mod.syntheticClassification);
      setDefaultInitFn(() => mod.defaultInitParams);
    });
  }, []);

  // Animated reveal: drive displayStep from 0 → STEPS over ~1500 ms.
  useEffect(() => {
    if (!running) return;
    if (scratchRun === null || pretrainedRun === null) return;

    const startTime = performance.now();
    const DURATION = 1500; // ms

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const step = Math.round(progress * STEPS);
      setDisplayStep(step);
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
  }, [running, scratchRun, pretrainedRun]);

  const handleTrain = () => {
    if (!trainFn || !syntheticFn || !defaultInitFn) return;
    setRunning(true);
    setScratchRun(null);
    setPretrainedRun(null);
    setDisplayStep(0);

    // Defer so the UI can reflect the "running" state first.
    setTimeout(() => {
      const full = syntheticFn(0); // 200 samples
      const fineTune = full.slice(0, FINETUNE_SIZE);
      const testSet = full.slice(FINETUNE_SIZE, FINETUNE_SIZE + TEST_SIZE);

      const sharedConfig = {
        dataset: fineTune,
        testSet,
        optimizer: 'adam' as const,
        schedule: 'warmup-cosine' as const,
        peakLr: 0.005,
        batchSize: 16,
        numSteps: STEPS,
        warmupSteps: 20,
        seed: 13,
      };

      const scratch = trainFn({
        ...sharedConfig,
        initParams: defaultInitFn(7),
      });

      const pretrained = trainFn({
        ...sharedConfig,
        initParams: [...PRETRAINED_PARAMS],
      });

      setScratchRun({ losses: scratch.losses, testAcc: scratch.testAcc });
      setPretrainedRun({ losses: pretrained.losses, testAcc: pretrained.testAcc });
      // running stays true; the RAF effect will clear it when animation ends.
    }, 30);
  };

  const handleReset = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setScratchRun(null);
    setPretrainedRun(null);
    setDisplayStep(0);
    setRunning(false);
  };

  const trainReady = trainFn !== null && syntheticFn !== null && defaultInitFn !== null;
  const showBars =
    !running && scratchRun !== null && pretrainedRun !== null;

  return (
    <SimFrame
      title="Pretrained vs from scratch — same fine-tune set"
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
      <div className="space-y-4">
        {/* Loss curves */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Training loss vs step
          </div>
          <LossCurves
            scratchRun={scratchRun}
            pretrainedRun={pretrainedRun}
            displayStep={displayStep}
          />
        </div>

        {/* Legend always visible */}
        <Legend />

        {/* Final accuracy bars — shown only after animation completes */}
        {showBars && (
          <FinalAccuracyBars
            scratchRun={scratchRun}
            pretrainedRun={pretrainedRun}
          />
        )}

        {/* Step counter */}
        {(running || showBars) && (
          <div className="font-mono text-[11px] text-fg-subtle tabular-nums">
            step {displayStep} / {STEPS}
          </div>
        )}
      </div>
    </SimFrame>
  );
}
