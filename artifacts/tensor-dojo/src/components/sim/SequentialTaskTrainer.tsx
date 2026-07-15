

/**
 * SequentialTaskTrainer — centerpiece sim for lesson 29 (catastrophic forgetting).
 *
 * Renders a two-line accuracy plot:
 *   - Task A (rgb(var(--dim))): the descending line — knowledge being lost.
 *   - Task B (rgb(var(--accent))): the ascending line — new task being learned.
 *
 * NOTE on accent assignment: task A uses --dim (fading) and task B uses
 * --accent (gaining) — this matches the dramatic narrative of the centerpiece
 * where the collapse of task A is the story. MitigationToggles INVERTS this
 * intentionally (task A = accent = "retained knowledge"), which is commented
 * there as well.
 *
 * Task construction:
 *   - Task A: syntheticClassification(0) — 3-class pie slices, boundaries at
 *             θ = 0, 2π/3, 4π/3.
 *   - Task B: relabeledClassification(1) — same point distribution as seed 1,
 *             but labels permuted by +1 mod 3. This is a real task-B: the
 *             network must actively unlearn task A to perform well on task B.
 */

import { useEffect, useRef, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import type { LabeledExample } from '@/lib/math/training';
import type { ForgettingResult } from '@/lib/math/forgetting';

// ── Constants ──────────────────────────────────────────────────────────────

const STEPS_A = 100;
const STEPS_B = 100;
const TRAIN_SIZE = 100; // per task
const TEST_SIZE = 64;   // per task

const TOTAL_STEPS = STEPS_A + STEPS_B; // 200 + 1 (step 0)

// ── Task B relabeling helper ───────────────────────────────────────────────

/**
 * Build task B: take syntheticClassification(seed) and permute every label
 * by (label + 1) % 3. Label permutation creates a genuine task-B — the
 * network must unlearn task A's boundaries to fit task B.
 *
 * We tried rotation (θ + π/3) but the label permutation is cleaner and
 * produces equivalent catastrophic forgetting.
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

// ── AccuracyPlot ───────────────────────────────────────────────────────────

/**
 * SVG two-line accuracy plot. x = step, y = accuracy (0..1).
 * Vertical marker at x = STEPS_A marks the phase-B transition.
 * Y gridlines at 25%, 50%, 75%.
 */
function AccuracyPlot({
  result,
  displayStep,
}: {
  result: ForgettingResult | null;
  displayStep: number;
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
        aria-label="Accuracy plot — press Train to start."
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
          press Train to start
        </text>
      </svg>
    );
  }

  const { accAOverTime, accBOverTime } = result;
  const totalLen = accAOverTime.length; // STEPS_A + STEPS_B + 1

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

  // Vertical marker x for phase transition
  const markerX = toX(STEPS_A).toFixed(1);

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full h-auto bg-bg/40 rounded"
      aria-label="Task A and Task B accuracy over training steps. Vertical line marks start of phase B."
    >
      {/* Y gridlines and labels at 0%, 25%, 50%, 75%, 100% */}
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

      {/* Phase transition vertical marker */}
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

      {/* Task A line — dim: the descending line, knowledge being lost */}
      {!divergedA && (
        <polyline
          points={buildPoints(accAOverTime, displayStep)}
          fill="none"
          stroke="rgb(var(--dim))"
          strokeWidth={1.5}
          opacity={0.85}
        />
      )}

      {/* Task B line — accent: the newly learned task */}
      {!divergedB && (
        <polyline
          points={buildPoints(accBOverTime, displayStep)}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={1.5}
          opacity={0.9}
        />
      )}

      {/* Diverged badges */}
      {divergedA && (
        <text x={padL + 8} y={padT + 12} fill="rgb(var(--dim))" fontSize={9} fontFamily="monospace">
          task A diverged
        </text>
      )}
      {divergedB && (
        <text x={padL + 8} y={padT + 24} fill="rgb(var(--accent))" fontSize={9} fontFamily="monospace">
          task B diverged
        </text>
      )}

      {/* X-axis baseline */}
      <line
        x1={padL} y1={padT + plotH}
        x2={padL + plotW} y2={padT + plotH}
        stroke="rgb(var(--border))" strokeWidth={1}
      />

      {/* X-axis step labels */}
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
    <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-3 h-0.5"
          style={{ background: 'rgb(var(--dim))' }}
        />
        task A (knowledge lost)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-3 h-0.5"
          style={{ background: 'rgb(var(--accent))' }}
        />
        task B (newly learned)
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function SequentialTaskTrainer() {
  const [mods, setMods] = useState<Mods | null>(null);
  const [result, setResult] = useState<ForgettingResult | null>(null);
  const [displayStep, setDisplayStep] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);

  const rafRef = useRef<number | null>(null);

  // Load modules once on mount
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

  // RAF reveal: animate displayStep from 0 → TOTAL_STEPS over ~1800ms
  useEffect(() => {
    if (!running) return;
    if (result === null) return;

    const startTime = performance.now();
    const DURATION = 1800;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      setDisplayStep(Math.round(progress * TOTAL_STEPS));
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
  }, [running, result]);

  const handleTrain = () => {
    if (!mods) return;
    setRunning(true);
    setResult(null);
    setDisplayStep(0);

    // Defer to let the UI reflect "running" state first
    setTimeout(() => {
      const { trainSequential, syntheticClassification } = mods;

      // Task A: standard syntheticClassification(0)
      const fullA = syntheticClassification(0);
      const taskA = fullA.slice(0, TRAIN_SIZE);
      const taskATest = fullA.slice(TRAIN_SIZE, TRAIN_SIZE + TEST_SIZE);

      // Task B: same distribution (seed 1) but labels permuted by +1 mod 3.
      // This ensures the network must actively unlearn task A to succeed at task B.
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
        lrA: 0.05,
        lrB: 1.0,  // High LR in phase B triggers forgetting. Tuned: 1.0 shows
                   // a clear collapse without pushing accuracy to pure noise.
        interleave: false,
        seed: 0,
      });

      setResult(res);
      // running stays true; RAF effect clears it when animation completes
    }, 30);
  };

  const handleReset = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setResult(null);
    setDisplayStep(0);
    setRunning(false);
  };

  const trainReady = mods !== null;

  return (
    <SimFrame
      title="Sequential task trainer — catastrophic forgetting"
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
        {/* Accuracy plot */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Accuracy vs step
          </div>
          <AccuracyPlot result={result} displayStep={displayStep} />
        </div>

        {/* Legend */}
        <Legend />

        {/* Step counter */}
        {(running || result !== null) && (
          <div className="font-mono text-[11px] text-fg-subtle tabular-nums">
            step {displayStep} / {TOTAL_STEPS}
            {result && !running && (
              <span className="ml-3 text-dim">
                final — A:{' '}
                <span className="text-ink">
                  {((result.accAOverTime[result.accAOverTime.length - 1] ?? 0) * 100).toFixed(1)}%
                </span>
                {' '}B:{' '}
                <span className="text-ink">
                  {((result.accBOverTime[result.accBOverTime.length - 1] ?? 0) * 100).toFixed(1)}%
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </SimFrame>
  );
}
