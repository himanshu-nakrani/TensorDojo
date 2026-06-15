'use client';

/**
 * MitigationToggles — secondary sim for lesson 29 (catastrophic forgetting).
 *
 * Two switches let the reader try standard mitigations:
 *   1. Lower learning rate in phase B (lrB = 0.05 instead of 1.0).
 *   2. Interleave task A samples during phase B.
 *
 * Toggles re-run trainSequential; results are cached so switching back
 * doesn't retrain.
 *
 * NOTE on accent assignment (INTENTIONAL INVERSION vs SequentialTaskTrainer):
 *   - Task A uses rgb(var(--accent)) — the "retained knowledge" line. This is
 *     the hero of the mitigation story: task A accuracy stays high.
 *   - Task B uses rgb(var(--dim)) — the "newly learned" task.
 *   In SequentialTaskTrainer, task A uses --dim (fading) and task B uses
 *   --accent (the new task being learned). The inversion here is deliberate:
 *   in the mitigation view the lesson is "task A's line no longer collapses."
 */

import { useEffect, useRef, useState } from 'react';
import type { LabeledExample } from '@/lib/math/training';
import type { ForgettingResult } from '@/lib/math/forgetting';

// ── Constants ──────────────────────────────────────────────────────────────

const STEPS_A = 100;
const STEPS_B = 100;
const TRAIN_SIZE = 100;
const TEST_SIZE = 64;

const TOTAL_STEPS = STEPS_A + STEPS_B;

// LR values
const LR_A = 0.05;
const LR_B_HIGH = 1.0;  // "forgetting" config — same as centerpiece
const LR_B_LOW = 0.05;  // mitigation: match phase-A LR

// ── Task B relabeling helper (duplicated from SequentialTaskTrainer) ───────
// ~10 lines of duplication is acceptable; this is lesson-29-specific.

/**
 * Build task B examples by permuting labels: (label + 1) % 3.
 * Same approach as SequentialTaskTrainer — see that file's comment.
 */
function relabeledClassification(
  examples: readonly LabeledExample[],
  n: number,
): LabeledExample[] {
  return examples.slice(0, n).map((e) => ({
    x: e.x,
    label: (e.label + 1) % 3,
  }));
}

// ── Types ──────────────────────────────────────────────────────────────────

type TrainSequentialFn =
  typeof import('@/lib/math/forgetting').trainSequential;
type SyntheticClassificationFn =
  typeof import('@/lib/math/training').syntheticClassification;

interface Mods {
  trainSequential: TrainSequentialFn;
  syntheticClassification: SyntheticClassificationFn;
}

type CacheKey = string; // "${lowLrB}-${interleave}"

function cacheKey(lowLrB: boolean, interleave: boolean): CacheKey {
  return `${lowLrB}-${interleave}`;
}

// ── AccuracyPlot (internal — same structure as SequentialTaskTrainer) ──────

function AccuracyPlot({
  result,
  displayStep,
  pending,
}: {
  result: ForgettingResult | null;
  displayStep: number;
  pending: boolean;
}) {
  const svgW = 420;
  const svgH = 180;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  if (!result) {
    return (
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto bg-bg/40 rounded"
        aria-label="Accuracy plot — loading or waiting for first run."
      >
        <line
          x1={padL} y1={padT + plotH}
          x2={padL + plotW} y2={padT + plotH}
          stroke="rgb(var(--border))" strokeWidth={1}
        />
        <text
          x={padL + plotW / 2} y={padT + plotH / 2}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgb(var(--dim))" fontSize={10} fontFamily="monospace"
        >
          {pending ? 'training…' : 'loading…'}
        </text>
      </svg>
    );
  }

  const { accAOverTime, accBOverTime } = result;
  const totalLen = accAOverTime.length;

  const toX = (step: number) =>
    padL + (step / Math.max(1, totalLen - 1)) * plotW;
  const toY = (acc: number) =>
    padT + plotH - Math.max(0, Math.min(acc, 1)) * plotH;

  const buildPoints = (series: number[], upTo: number): string =>
    series
      .slice(0, upTo + 1)
      .map((v, i) => {
        if (!Number.isFinite(v)) return null;
        return `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');

  const divergedA = accAOverTime.some((v) => !Number.isFinite(v));
  const divergedB = accBOverTime.some((v) => !Number.isFinite(v));

  const markerX = toX(STEPS_A).toFixed(1);

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full h-auto bg-bg/40 rounded"
      aria-label="Task A and Task B accuracy over training steps. Vertical line marks start of phase B."
    >
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = toY(tick).toFixed(1);
        return (
          <g key={tick}>
            <line
              x1={padL} y1={y}
              x2={padL + plotW} y2={y}
              stroke="rgb(var(--border))" strokeWidth={tick === 0 ? 1 : 0.5}
              opacity={tick === 0 ? 1 : 0.5}
            />
            <text
              x={padL - 5} y={y}
              textAnchor="end" dominantBaseline="middle"
              fill="rgb(var(--dim))" fontSize={8} fontFamily="monospace"
              className="tabular-nums"
            >
              {`${Math.round(tick * 100)}%`}
            </text>
          </g>
        );
      })}

      {/* Phase transition marker */}
      <line
        x1={markerX} y1={padT}
        x2={markerX} y2={padT + plotH}
        stroke="rgb(var(--border))"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.8}
      />
      <text
        x={parseFloat(markerX) + 4} y={padT + 4}
        dominantBaseline="hanging"
        fill="rgb(var(--dim))" fontSize={8} fontFamily="monospace"
      >
        B starts here
      </text>

      {/* Task A line — accent (INTENTIONAL INVERSION vs SequentialTaskTrainer):
          task A is the hero here — retained knowledge under mitigation */}
      {!divergedA && (
        <polyline
          points={buildPoints(accAOverTime, displayStep)}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={1.5}
          opacity={0.9}
        />
      )}

      {/* Task B line — dim */}
      {!divergedB && (
        <polyline
          points={buildPoints(accBOverTime, displayStep)}
          fill="none"
          stroke="rgb(var(--dim))"
          strokeWidth={1.5}
          opacity={0.85}
        />
      )}

      {/* Diverged badges */}
      {divergedA && (
        <text x={padL + 8} y={padT + 12} fill="rgb(var(--accent))" fontSize={9} fontFamily="monospace">
          task A diverged
        </text>
      )}
      {divergedB && (
        <text x={padL + 8} y={padT + 24} fill="rgb(var(--dim))" fontSize={9} fontFamily="monospace">
          task B diverged
        </text>
      )}

      {/* X-axis */}
      <line
        x1={padL} y1={padT + plotH}
        x2={padL + plotW} y2={padT + plotH}
        stroke="rgb(var(--border))" strokeWidth={1}
      />

      {/* X-axis labels */}
      <text
        x={padL} y={svgH - 4}
        textAnchor="start"
        fill="rgb(var(--dim))" fontSize={8} fontFamily="monospace"
        className="tabular-nums"
      >
        0
      </text>
      <text
        x={padL + plotW} y={svgH - 4}
        textAnchor="end"
        fill="rgb(var(--dim))" fontSize={8} fontFamily="monospace"
        className="tabular-nums"
      >
        {TOTAL_STEPS}
      </text>
    </svg>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 font-mono text-[10px]">
      {/* accent = task A here (retention is the story) */}
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-3 h-0.5"
          style={{ background: 'rgb(var(--accent))' }}
        />
        task A (retained knowledge)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-3 h-0.5"
          style={{ background: 'rgb(var(--dim))' }}
        />
        task B (new task)
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function MitigationToggles() {
  const [mods, setMods] = useState<Mods | null>(null);
  const [lowLrB, setLowLrB] = useState<boolean>(false);
  const [interleave, setInterleave] = useState<boolean>(false);
  const [cache, setCache] = useState<Record<CacheKey, ForgettingResult>>({});
  const [pending, setPending] = useState<boolean>(false);
  const [displayStep, setDisplayStep] = useState<number>(0);
  const [animating, setAnimating] = useState<boolean>(false);

  const rafRef = useRef<number | null>(null);

  // Load modules once
  useEffect(() => {
    Promise.all([
      import('@/lib/math/forgetting'),
      import('@/lib/math/training'),
    ]).then(([forgetting, training]) => {
      setMods({
        trainSequential: forgetting.trainSequential,
        syntheticClassification: training.syntheticClassification,
      });
    });
  }, []);

  // Run trainSequential whenever mods/lowLrB/interleave changes (if not cached)
  useEffect(() => {
    if (!mods) return;

    const key = cacheKey(lowLrB, interleave);
    if (cache[key]) {
      // Already cached — trigger animation
      setDisplayStep(0);
      setAnimating(true);
      return;
    }

    setPending(true);

    // Defer to keep UI responsive
    const id = setTimeout(() => {
      const { trainSequential, syntheticClassification } = mods;

      const fullA = syntheticClassification(0);
      const taskA = fullA.slice(0, TRAIN_SIZE);
      const taskATest = fullA.slice(TRAIN_SIZE, TRAIN_SIZE + TEST_SIZE);

      const fullB = syntheticClassification(1);
      const taskB = relabeledClassification(fullB, TRAIN_SIZE);
      const taskBTestRaw = fullB.slice(TRAIN_SIZE, TRAIN_SIZE + TEST_SIZE);
      const taskBTest = relabeledClassification(taskBTestRaw, TEST_SIZE);

      const res = trainSequential({
        taskA,
        taskATest,
        taskB,
        taskBTest,
        stepsA: STEPS_A,
        stepsB: STEPS_B,
        lrA: LR_A,
        lrB: lowLrB ? LR_B_LOW : LR_B_HIGH,
        interleave,
        seed: 0,
      });

      setCache((prev) => ({ ...prev, [key]: res }));
      setPending(false);
      setDisplayStep(0);
      setAnimating(true);
    }, 30);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mods, lowLrB, interleave]);

  // RAF animation triggered when animating=true
  useEffect(() => {
    if (!animating) return;

    const startTime = performance.now();
    const DURATION = 1800;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      setDisplayStep(Math.round(progress * TOTAL_STEPS));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAnimating(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [animating]);

  const key = cacheKey(lowLrB, interleave);
  const currentResult = cache[key] ?? null;

  const lrBDisplay = lowLrB ? LR_B_LOW : LR_B_HIGH;
  const statusLabel = pending
    ? 'training…'
    : currentResult
    ? `config: lr=${lrBDisplay}, ${interleave ? 'interleaved' : 'sequential'}`
    : 'loading…';

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Mitigation strategies
        </h3>
      </div>

      <div className="space-y-5">
        {/* Toggle switches */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Mitigations
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 font-mono text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lowLrB}
                disabled={pending || animating}
                onChange={(e) => setLowLrB(e.target.checked)}
                className="accent-[rgb(var(--accent))]"
              />
              <span className={lowLrB ? 'text-ink' : 'text-dim'}>
                Lower learning rate in phase B
              </span>
              <span className="text-[10px] text-dim tabular-nums">
                (lr={lowLrB ? LR_B_LOW : LR_B_HIGH})
              </span>
            </label>
            <label className="flex items-center gap-2 font-mono text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={interleave}
                disabled={pending || animating}
                onChange={(e) => setInterleave(e.target.checked)}
                className="accent-[rgb(var(--accent))]"
              />
              <span className={interleave ? 'text-ink' : 'text-dim'}>
                Interleave task A samples during phase B
              </span>
            </label>
          </div>
        </div>

        {/* Status line */}
        <div className="font-mono text-[10px] text-fg-subtle">
          {statusLabel}
        </div>

        {/* Accuracy plot */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Accuracy vs step
          </div>
          <AccuracyPlot
            result={currentResult}
            displayStep={displayStep}
            pending={pending}
          />
        </div>

        {/* Legend */}
        <Legend />

        {/* Step counter */}
        {currentResult !== null && (
          <div className="font-mono text-[10px] text-fg-subtle tabular-nums">
            step {displayStep} / {TOTAL_STEPS}
            {!animating && (
              <span className="ml-3 text-dim">
                final — A:{' '}
                <span className="text-ink">
                  {((currentResult.accAOverTime[currentResult.accAOverTime.length - 1] ?? 0) * 100).toFixed(1)}%
                </span>
                {' '}B:{' '}
                <span className="text-ink">
                  {((currentResult.accBOverTime[currentResult.accBOverTime.length - 1] ?? 0) * 100).toFixed(1)}%
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
