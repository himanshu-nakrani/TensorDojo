

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  distillStep,
  distillationLoss,
  softmaxT,
} from '@/lib/math/distillation';

const N_CLASSES = 5;
const Y_TRUE = 2;
// Teacher logits: index 2 is the correct answer; 1 and 3 are second-best;
// 0 and 4 are clearly wrong. This is the "dark knowledge" shape.
const TEACHER_LOGITS: readonly number[] = [-1.5, 1.0, 2.5, 0.8, -1.8];
const INIT_STUDENT: readonly number[] = [0.3, -0.2, 0.1, -0.1, 0.2];

const LR = 0.15;

export function DistillationExplorer() {
  const [T, setT] = useState(4);
  const [alpha, setAlpha] = useState(0.5);
  const [studentLogits, setStudentLogits] = useState<number[]>(() => [
    ...INIT_STUDENT,
  ]);
  const [running, setRunning] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const raf = useRef<number | null>(null);

  const teacherSoft = useMemo(() => softmaxT(TEACHER_LOGITS, T), [T]);
  const teacherDeploy = useMemo(() => softmaxT(TEACHER_LOGITS, 1), []);
  const studentSoft = useMemo(
    () => softmaxT(studentLogits, T),
    [studentLogits, T],
  );
  const studentDeploy = useMemo(
    () => softmaxT(studentLogits, 1),
    [studentLogits],
  );

  const losses = useMemo(
    () => distillationLoss(studentLogits, TEACHER_LOGITS, Y_TRUE, T, alpha),
    [studentLogits, T, alpha],
  );

  // Run a few steps per animation frame while "running" is on.
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setStudentLogits((prev) => {
        let next = prev;
        for (let k = 0; k < 2; k += 1) {
          next = distillStep(next, TEACHER_LOGITS, Y_TRUE, T, alpha, LR);
        }
        return next;
      });
      setStepCount((s) => s + 2);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [running, T, alpha]);

  // Auto-stop after 200 steps so users don't have to.
  useEffect(() => {
    if (stepCount > 200) setRunning(false);
  }, [stepCount]);

  const reset = () => {
    setRunning(false);
    setStudentLogits([...INIT_STUDENT]);
    setStepCount(0);
  };

  return (
    <SimFrame
      title="Knowledge distillation"
      headerWrap
      headerAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (stepCount > 200) {
                setStudentLogits([...INIT_STUDENT]);
                setStepCount(0);
              }
              setRunning((r) => !r);
            }}
            aria-pressed={running}
            className={clsx(
              'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
              running
                ? 'border-accent text-accent bg-accent-soft'
                : 'border-border text-muted hover:text-ink hover:border-border-strong',
            )}
          >
            {running ? 'Pause' : 'Train'}
          </button>
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
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Slider
          id="distill-T"
          label="temperature T"
          value={T}
          min={1}
          max={10}
          step={0.1}
          format={(v) => v.toFixed(1)}
          onChange={(v) => {
            setT(v);
          }}
        />
        <Slider
          id="distill-alpha"
          label="mix α (0 = hard label only · 1 = teacher only)"
          value={alpha}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => {
            setAlpha(v);
          }}
        />
      </div>

      {/* Loss readouts */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-[11px] font-mono">
        <Stat label="soft loss" value={losses.soft.toFixed(3)} />
        <Stat label="hard loss" value={losses.hard.toFixed(3)} />
        <Stat
          label="step"
          value={stepCount.toString()}
          accent={stepCount > 200 ? 'muted' : 'accent'}
        />
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DistributionPanel
          title="Teacher"
          subtitle={`softened at T = ${T.toFixed(1)}`}
          probs={teacherSoft}
          ghostProbs={teacherDeploy}
          ghostLabel="at T=1"
          highlight={Y_TRUE}
        />
        <DistributionPanel
          title="Student"
          subtitle={`softened at T = ${T.toFixed(1)} · deploy at T=1`}
          probs={studentSoft}
          ghostProbs={studentDeploy}
          ghostLabel="at T=1"
          highlight={Y_TRUE}
        />
      </div>
    </SimFrame>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label
          htmlFor={id}
          className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
        >
          {label}
        </label>
        <span className="font-mono text-[14px] text-accent tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[rgb(var(--accent))]"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent = 'accent',
}: {
  label: string;
  value: string;
  accent?: 'accent' | 'muted';
}) {
  return (
    <div className="rounded-md border border-border bg-bg/40 px-3 py-2 flex items-baseline justify-between">
      <span className="text-dim">{label}</span>
      <span
        className={clsx(
          'tabular-nums',
          accent === 'accent' ? 'text-accent' : 'text-muted',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function DistributionPanel({
  title,
  subtitle,
  probs,
  ghostProbs,
  ghostLabel,
  highlight,
}: {
  title: string;
  subtitle: string;
  probs: readonly number[];
  ghostProbs?: readonly number[];
  ghostLabel?: string;
  highlight: number;
}) {
  const W = 240;
  const H = 130;
  const PAD_X = 8;
  const PAD_Y = 6;
  const n = probs.length;
  const cellW = (W - PAD_X * 2) / n;
  const maxH = H - PAD_Y * 2;
  // Always full-scale 0..1, since these are probabilities.
  const yToPx = (p: number) => H - PAD_Y - p * maxH;

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="flex items-baseline justify-between mb-0.5">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="text-[11px] font-mono text-dim">{subtitle}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
        {/* zero axis */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={H - PAD_Y}
          y2={H - PAD_Y}
          className="stroke-border"
          strokeWidth={1}
        />
        {/* ghost bars (deploy distribution at T=1) */}
        {ghostProbs &&
          ghostProbs.map((p, i) => {
            const x = PAD_X + i * cellW + cellW * 0.18;
            const w = cellW * 0.64;
            const y = yToPx(p);
            const h = H - PAD_Y - y;
            return (
              <rect
                key={`g${i}`}
                x={x}
                y={y}
                width={w}
                height={h}
                className="fill-fg-subtle"
                fillOpacity={0.25}
              />
            );
          })}
        {/* live bars */}
        {probs.map((p, i) => {
          const x = PAD_X + i * cellW + cellW * 0.18;
          const w = cellW * 0.64;
          const y = yToPx(p);
          const h = H - PAD_Y - y;
          const fill =
            i === highlight
              ? 'fill-[rgb(var(--accent))]'
              : 'fill-[rgb(var(--accent-hover))]';
          return <rect key={i} x={x} y={y} width={w} height={h} className={fill} fillOpacity={0.85} />;
        })}
        {/* class labels */}
        {probs.map((_, i) => (
          <text
            key={`lbl${i}`}
            x={PAD_X + i * cellW + cellW / 2}
            y={H - 1}
            textAnchor="middle"
            fontSize={9}
            fontFamily="monospace"
            className="fill-fg-subtle"
          >
            {i}
          </text>
        ))}
      </svg>
      <div className="mt-1 grid grid-cols-5 gap-1 text-[10px] font-mono tabular-nums text-fg-muted">
        {probs.map((p, i) => (
          <div
            key={i}
            className={clsx(
              'text-center',
              i === highlight && 'text-accent font-semibold',
            )}
          >
            {p.toFixed(2)}
          </div>
        ))}
      </div>
      {ghostLabel && (
        <div className="mt-2 text-[10px] text-dim font-mono flex items-center gap-2">
          <span className="inline-block w-3 h-2 bg-[rgb(var(--fg-subtle))] opacity-30" />
          <span>{ghostLabel}</span>
        </div>
      )}
    </div>
  );
}
