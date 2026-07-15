'use client';

import { useEffect, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { PRETRAINED_PARAMS } from '@/lib/math/pretrain-init';

/**
 * Secondary interactive for lesson 28 (freezing vs full fine-tuning).
 *
 * Pre-computes all 8 freeze-mask configurations on mount (staggered with
 * setTimeout to let the browser paint between runs). Renders a horizontal
 * bar chart sorted by params-updated ascending so readers can see the
 * accuracy trade-off as they freeze more and more.
 *
 * If a run diverges, the row is labeled "diverged" and the bar is grayed.
 */

// ── Constants ──────────────────────────────────────────────────────────────

const DATASET_SIZE = 64;
const TEST_OFFSET = 100;
const TEST_SIZE = 64;
const STEPS = 150;
const WARMUP_STEPS = 15;

// Layer parameter counts mirroring freeze-mask.ts
const L1_LEN = 8 * 2 + 8; // 24
const L2_LEN = 8 * 8 + 8; // 72
const L3_LEN = 3 * 8 + 3; // 27
const N_PARAMS_TOTAL = L1_LEN + L2_LEN + L3_LEN; // 123

// ── Types ──────────────────────────────────────────────────────────────────

type FreezeMask = import('@/lib/math/freeze-mask').FreezeMask;
type TrainWithFreezeMaskFn =
  typeof import('@/lib/math/training').trainWithFreezeMask;
type SyntheticClassificationFn =
  typeof import('@/lib/math/training').syntheticClassification;
type FreezeParamCountFn =
  typeof import('@/lib/math/freeze-mask').freezeParamCount;

interface Mods {
  trainWithFreezeMask: TrainWithFreezeMaskFn;
  syntheticClassification: SyntheticClassificationFn;
  freezeParamCount: FreezeParamCountFn;
}

interface ConfigResult {
  mask: FreezeMask;
  label: string;
  paramsUpdated: number;
  finalAccuracy: number;
  diverged: boolean;
}

// ── All 8 freeze configurations ────────────────────────────────────────────

function maskLabel(mask: FreezeMask): string {
  const frozen: string[] = [];
  if (mask.layer1) frozen.push('L1');
  if (mask.layer2) frozen.push('L2');
  if (mask.layer3) frozen.push('L3');
  if (frozen.length === 0) return 'no freeze';
  return `freeze ${frozen.join('+')}`;
}

const ALL_MASKS: FreezeMask[] = [
  { layer1: false, layer2: false, layer3: false },
  { layer1: true,  layer2: false, layer3: false },
  { layer1: false, layer2: true,  layer3: false },
  { layer1: false, layer2: false, layer3: true  },
  { layer1: true,  layer2: true,  layer3: false },
  { layer1: true,  layer2: false, layer3: true  },
  { layer1: false, layer2: true,  layer3: true  },
  { layer1: true,  layer2: true,  layer3: true  },
];

// ── ConfigBar ──────────────────────────────────────────────────────────────

function ConfigBar({ row, maxAcc }: { row: ConfigResult; maxAcc: number }) {
  const barPct = maxAcc > 0 ? (row.finalAccuracy / maxAcc) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <div
        className="w-28 shrink-0 font-mono text-[11px] truncate"
        style={{ color: row.diverged ? 'rgb(var(--dim))' : 'rgb(var(--ink))' }}
      >
        {row.label}
      </div>
      {/* Params updated */}
      <div
        className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums"
        style={{ color: 'rgb(var(--dim))' }}
      >
        {row.paramsUpdated}
      </div>
      {/* Bar */}
      <div className="flex-1 h-3 rounded-full overflow-hidden bg-border/40">
        {row.diverged ? (
          <div
            className="h-full w-full rounded-full"
            style={{ background: 'rgb(var(--dim))', opacity: 0.4 }}
          />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barPct.toFixed(1)}%`,
              background: 'rgb(var(--accent))',
            }}
          />
        )}
      </div>
      {/* Accuracy label */}
      <div
        className="w-12 shrink-0 font-mono text-[11px] tabular-nums"
        style={{ color: row.diverged ? 'rgb(var(--dim))' : 'rgb(var(--ink))' }}
      >
        {row.diverged ? 'diverged' : `${(row.finalAccuracy * 100).toFixed(1)}%`}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ParamsVsAccuracyTable() {
  const [mods, setMods] = useState<Mods | null>(null);
  const [results, setResults] = useState<ConfigResult[] | null>(null);
  const [progress, setProgress] = useState<number>(0); // 0..8

  // Load modules once
  useEffect(() => {
    Promise.all([
      import('@/lib/math/training'),
      import('@/lib/math/freeze-mask'),
    ]).then(([training, freezeMod]) => {
      setMods({
        trainWithFreezeMask: training.trainWithFreezeMask,
        syntheticClassification: training.syntheticClassification,
        freezeParamCount: freezeMod.freezeParamCount,
      });
    });
  }, []);

  // Precompute all 8 configs once mods are ready, staggered by setTimeout
  useEffect(() => {
    if (!mods) return;
    if (results !== null) return; // already computed

    const { trainWithFreezeMask, syntheticClassification, freezeParamCount } = mods;
    const full = syntheticClassification(0);
    const dataset = full.slice(0, DATASET_SIZE);
    const testSet = full.slice(TEST_OFFSET, TEST_OFFSET + TEST_SIZE);

    const accumulated: ConfigResult[] = [];
    let idx = 0;

    const runNext = () => {
      if (idx >= ALL_MASKS.length) {
        // Sort ascending by paramsUpdated
        accumulated.sort((a, b) => a.paramsUpdated - b.paramsUpdated);
        setResults([...accumulated]);
        return;
      }

      const mask = ALL_MASKS[idx]!;
      const paramsUpdated = freezeParamCount(mask);

      // Use a per-mask seed offset for reproducibility
      const r = trainWithFreezeMask({
        initParams: [...PRETRAINED_PARAMS],
        dataset,
        testSet,
        optimizer: 'adam',
        schedule: 'warmup-cosine',
        peakLr: 0.005,
        batchSize: 16,
        numSteps: STEPS,
        warmupSteps: WARMUP_STEPS,
        seed: idx, // per-mask seed offset
        freezeMask: mask,
      });

      const finalAccuracy = r.diverged
        ? 0
        : (r.testAcc[r.testAcc.length - 1] ?? 0);

      accumulated.push({
        mask,
        label: maskLabel(mask),
        paramsUpdated,
        finalAccuracy,
        diverged: r.diverged,
      });

      idx += 1;
      setProgress(idx);

      // Yield to the browser between each CPU-bound run
      setTimeout(runNext, 30);
    };

    // Kick off the first run after a short delay so the component can paint
    setTimeout(runNext, 30);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once when mods arrive
  }, [mods]);

  const maxAcc = results
    ? Math.max(...results.filter((r) => !r.diverged).map((r) => r.finalAccuracy), 0.01)
    : 1;

  const isDone = results !== null;

  return (
    <SimFrame title="Params updated vs final accuracy — all 8 freeze configs">
      <div className="space-y-4">
        {/* Note */}
        <p className="font-mono text-[11px] text-fg-subtle leading-relaxed">
          Each row is one full training run. Configs are ordered by params
          updated.
        </p>

        {/* Progress / chart */}
        {!isDone && (
          <div className="font-mono text-[11px] text-fg-subtle tabular-nums">
            {mods
              ? `training config ${progress} / ${ALL_MASKS.length}…`
              : 'loading…'}
          </div>
        )}

        {isDone && results && (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-3 border-b border-border pb-1.5 mb-1">
              <div className="w-28 shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-dim">
                config
              </div>
              <div className="w-12 shrink-0 text-right font-mono text-[11px] uppercase tracking-[0.15em] text-dim">
                params
              </div>
              <div className="flex-1 font-mono text-[11px] uppercase tracking-[0.15em] text-dim">
                test accuracy
              </div>
              <div className="w-12 shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-dim">
                &nbsp;
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-2.5">
              {results.map((row) => (
                <ConfigBar
                  key={row.label}
                  row={row}
                  maxAcc={maxAcc}
                />
              ))}
            </div>

            {/* Axis label */}
            <div className="flex items-center gap-3">
              <div className="w-28 shrink-0" />
              <div className="w-12 shrink-0" />
              <div className="flex-1 flex justify-between font-mono text-[11px] text-dim tabular-nums">
                <span>0%</span>
                <span>{(maxAcc * 100).toFixed(0)}%</span>
              </div>
              <div className="w-12 shrink-0" />
            </div>

            {/* Total params reminder */}
            <div className="font-mono text-[11px] text-fg-subtle tabular-nums">
              Total params: {N_PARAMS_TOTAL}
            </div>
          </>
        )}
      </div>
    </SimFrame>
  );
}
