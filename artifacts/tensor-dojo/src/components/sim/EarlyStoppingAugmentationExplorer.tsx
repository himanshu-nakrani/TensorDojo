

import { useEffect, useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

const PLOT_W = 420;
const PLOT_H = 160;
const PAD = 28;

interface MlpParams {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  W3: number[][];
  b3: number[];
}

function initParams(seed: number): MlpParams {
  let s = (seed + 1) >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const make = (rows: number, cols: number, scale: number): number[][] => {
    const out: number[][] = [];
    for (let i = 0; i < rows; i += 1) {
      const row: number[] = [];
      for (let j = 0; j < cols; j += 1) row.push((rand() * 2 - 1) * scale);
      out.push(row);
    }
    return out;
  };
  return {
    W1: make(8, 2, 0.6),
    b1: new Array<number>(8).fill(0),
    W2: make(8, 8, 0.6),
    b2: new Array<number>(8).fill(0),
    W3: make(3, 8, 0.6),
    b3: new Array<number>(3).fill(0),
  };
}

interface Example {
  x: number[];
  t: number;
}

/** 2D 3-class, label = which "pie slice" the point's angle falls in. */
function synthetic(n: number, seed: number): Example[] {
  const out: Example[] = [];
  let s = (seed + 17) >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i += 1) {
    const x1 = -1.5 + 3 * rand();
    const x2 = -1.5 + 3 * rand();
    const theta = Math.atan2(x2, x1);
    const t = Math.floor(((theta + Math.PI) / (2 * Math.PI)) * 3) % 3;
    out.push({ x: [x1, x2], t });
  }
  return out;
}

function oneHot(label: number): number[] {
  const v = [0, 0, 0];
  v[label] = 1;
  return v;
}

function softmax(xs: number[]): number[] {
  const m = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - m));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / s);
}

function forward(p: MlpParams, x: number[]): { h1: number[]; h2: number[]; probs: number[] } {
  const h1: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    let s = p.b1[i] ?? 0;
    for (let j = 0; j < 2; j += 1) s += (p.W1[i]![j] ?? 0) * (x[j] ?? 0);
    h1.push(s > 0 ? s : 0);
  }
  const h2: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    let s = p.b2[i] ?? 0;
    for (let j = 0; j < 8; j += 1) s += (p.W2[i]![j] ?? 0) * (h1[j] ?? 0);
    h2.push(s > 0 ? s : 0);
  }
  const z: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    let s = p.b3[i] ?? 0;
    for (let j = 0; j < 8; j += 1) s += (p.W3[i]![j] ?? 0) * (h2[j] ?? 0);
    z.push(s);
  }
  return { h1, h2, probs: softmax(z) };
}

function clone(p: MlpParams): MlpParams {
  return {
    W1: p.W1.map((r) => r.slice()),
    b1: p.b1.slice(),
    W2: p.W2.map((r) => r.slice()),
    b2: p.b2.slice(),
    W3: p.W3.map((r) => r.slice()),
    b3: p.b3.slice(),
  };
}

function bump(
  p: MlpParams,
  layer: 'W1' | 'W2' | 'W3' | 'b1' | 'b2' | 'b3',
  i: number,
  j: number,
  delta: number,
): MlpParams {
  const out = clone(p);
  switch (layer) {
    case 'W1': out.W1[i]![j] = (out.W1[i]![j] ?? 0) + delta; break;
    case 'W2': out.W2[i]![j] = (out.W2[i]![j] ?? 0) + delta; break;
    case 'W3': out.W3[i]![j] = (out.W3[i]![j] ?? 0) + delta; break;
    case 'b1': out.b1[i] = (out.b1[i] ?? 0) + delta; break;
    case 'b2': out.b2[i] = (out.b2[i] ?? 0) + delta; break;
    case 'b3': out.b3[i] = (out.b3[i] ?? 0) + delta; break;
  }
  return out;
}

function ceLoss(p: MlpParams, ex: Example): number {
  const { probs } = forward(p, ex.x);
  const tgt = oneHot(ex.t);
  let s = 0;
  for (let i = 0; i < 3; i += 1) {
    const pr = probs[i] ?? 0;
    if (pr > 0) s -= tgt[i]! * Math.log(pr);
  }
  return s;
}

function numGrad(
  p: MlpParams,
  ex: Example,
  layer: 'W1' | 'W2' | 'W3' | 'b1' | 'b2' | 'b3',
  i: number,
  j: number,
): number {
  const h = 1e-3;
  return (ceLoss(bump(p, layer, i, j, h), ex) - ceLoss(bump(p, layer, i, j, -h), ex)) / (2 * h);
}

function batchGrad(p: MlpParams, batch: Example[]): MlpParams {
  const acc: MlpParams = {
    W1: Array.from({ length: 8 }, () => new Array<number>(2).fill(0)),
    b1: new Array<number>(8).fill(0),
    W2: Array.from({ length: 8 }, () => new Array<number>(8).fill(0)),
    b2: new Array<number>(8).fill(0),
    W3: Array.from({ length: 3 }, () => new Array<number>(8).fill(0)),
    b3: new Array<number>(3).fill(0),
  };
  for (const ex of batch) {
    for (let i = 0; i < 8; i += 1) {
      for (let j = 0; j < 2; j += 1) acc.W1[i]![j] = (acc.W1[i]![j] ?? 0) + numGrad(p, ex, 'W1', i, j);
      acc.b1[i] = (acc.b1[i] ?? 0) + numGrad(p, ex, 'b1', i, 0);
    }
    for (let i = 0; i < 8; i += 1) {
      for (let j = 0; j < 8; j += 1) acc.W2[i]![j] = (acc.W2[i]![j] ?? 0) + numGrad(p, ex, 'W2', i, j);
      acc.b2[i] = (acc.b2[i] ?? 0) + numGrad(p, ex, 'b2', i, 0);
    }
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 8; j += 1) acc.W3[i]![j] = (acc.W3[i]![j] ?? 0) + numGrad(p, ex, 'W3', i, j);
      acc.b3[i] = (acc.b3[i] ?? 0) + numGrad(p, ex, 'b3', i, 0);
    }
  }
  const N = batch.length;
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 2; j += 1) acc.W1[i]![j] = (acc.W1[i]![j] ?? 0) / N;
    acc.b1[i] = (acc.b1[i] ?? 0) / N;
  }
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) acc.W2[i]![j] = (acc.W2[i]![j] ?? 0) / N;
    acc.b2[i] = (acc.b2[i] ?? 0) / N;
  }
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 8; j += 1) acc.W3[i]![j] = (acc.W3[i]![j] ?? 0) / N;
    acc.b3[i] = (acc.b3[i] ?? 0) / N;
  }
  return acc;
}

function sgdStep(p: MlpParams, g: MlpParams, lr: number): MlpParams {
  const out = clone(p);
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 2; j += 1) out.W1[i]![j] = (p.W1[i]![j] ?? 0) - lr * (g.W1[i]![j] ?? 0);
    out.b1[i] = (p.b1[i] ?? 0) - lr * (g.b1[i] ?? 0);
  }
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) out.W2[i]![j] = (p.W2[i]![j] ?? 0) - lr * (g.W2[i]![j] ?? 0);
    out.b2[i] = (p.b2[i] ?? 0) - lr * (g.b2[i] ?? 0);
  }
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 8; j += 1) out.W3[i]![j] = (p.W3[i]![j] ?? 0) - lr * (g.W3[i]![j] ?? 0);
    out.b3[i] = (p.b3[i] ?? 0) - lr * (g.b3[i] ?? 0);
  }
  return out;
}

function batchLoss(p: MlpParams, data: Example[]): number {
  let s = 0;
  for (const ex of data) s += ceLoss(p, ex);
  return s / data.length;
}

interface RunResult {
  trainLoss: number[];
  valLoss: number[];
  bestStep: number;
  bestValLoss: number;
  bestParams: MlpParams;
}

/**
 * Run a full training loop with optional early stopping. We
 * re-import the early-stopping module so the math is shared
 * between the lesson's secondary widget and the centerpiece.
 */
function runTraining(
  train: Example[],
  val: Example[],
  patience: number,
  useAugmentation: boolean,
  numSteps: number,
  seed: number,
): RunResult {
  let p = initParams(seed);
  const trainLoss: number[] = [];
  const valLoss: number[] = [];
  // Inline simple early-stopper — we only need the API the
  // module exposes, but doing it inline avoids the cost of a
  // dynamic import on every parameter change.
  let bestLoss: number | null = null;
  let bestStep = -1;
  let bestParams: MlpParams = p;
  let badSteps = 0;
  const lr = 0.05;
  trainLoss.push(batchLoss(p, train));
  valLoss.push(batchLoss(p, val));
  for (let t = 0; t < numSteps; t += 1) {
    // Build the training batch. With augmentation, we
    // double the training data with random rotations and
    // small Gaussian noise (rotation is class-preserving for
    // this synthetic dataset).
    let batch: Example[] = train;
    if (useAugmentation && t % 2 === 0) {
      // Lazy inline augmentation so we don't pay the cost
      // on every step.
      const aug: Example[] = [];
      for (const ex of train) {
        const angle = (Math.random() * 2 - 1) * 0.2;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const nx = c * ex.x[0]! - s * ex.x[1]!;
        const ny = s * ex.x[0]! + c * ex.x[1]!;
        const jx = nx + (Math.random() - 0.5) * 0.1;
        const jy = ny + (Math.random() - 0.5) * 0.1;
        aug.push({ x: [jx, jy], t: ex.t });
      }
      batch = [...train, ...aug];
    }
    const g = batchGrad(p, batch);
    p = sgdStep(p, g, lr);
    const tLoss = batchLoss(p, train);
    const vLoss = batchLoss(p, val);
    trainLoss.push(tLoss);
    valLoss.push(vLoss);
    // Early stopping logic (matches lib/math/early-stopping).
    if (bestLoss === null || bestLoss - vLoss > 0) {
      bestLoss = vLoss;
      bestStep = t + 1;
      bestParams = clone(p);
      badSteps = 0;
    } else {
      badSteps += 1;
      if (badSteps > patience) break;
    }
  }
  return { trainLoss, valLoss, bestStep, bestValLoss: bestLoss ?? Infinity, bestParams };
}

/**
 * Centerpiece for the early-stopping + augmentation lesson.
 * Three configurations run from the same init on the same
 * 2D 3-class dataset:
 *   (a) no regularization — the baseline; train keeps falling
 *       but val bottoms and climbs
 *   (b) early stopping with a patience slider — the run
 *       terminates at the best-val-loss checkpoint
 *   (c) early stopping + augmentation — adds synthetic
 *       rotations + small noise to the training data
 * Three loss curves (train + val) side by side, with a
 * "best-model" dot on each.
 */
export function EarlyStoppingAugmentationExplorer() {
  const [patience, setPatience] = useState<number>(20);
  const [results, setResults] = useState<
    | {
        baseline: RunResult;
        earlyStop: RunResult;
        aug: RunResult;
      }
    | null
  >(null);

  useEffect(() => {
    // Run all three configurations once on mount (and again
    // on patience change for the early-stopping one).
    const train = synthetic(60, 0);
    const val = synthetic(60, 1);
    const baseline = runTraining(train, val, 1e9, false, 200, 0);
    const earlyStop = runTraining(train, val, patience, false, 200, 0);
    const aug = runTraining(train, val, patience, true, 200, 0);
    setResults({ baseline, earlyStop, aug });
  }, [patience]);

  const reset = () => {
    setPatience(20);
  };

  return (
    <SimFrame
      title="Early stopping + data augmentation"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-dim font-mono">
            2 → 8 → 8 → 3 MLP · 60 train / 60 val · same init for all three
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
      headerWrap
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5">
        <div>
          {results && <ThreeCurves r={results} />}
        </div>

        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
                Patience
              </span>
              <span className="text-ink tabular-nums">{patience}</span>
            </div>
            <Slider
              value={patience}
              min={2}
              max={80}
              step={1}
              onChange={(v) => setPatience(Math.round(v))}
              formatValue={(v) => String(Math.round(v))}
              ariaLabel="Early-stopping patience"
            />
            <div className="flex justify-between text-[11px] text-dim font-mono mt-1 tabular-nums">
              <span>2 (aggressive)</span>
              <span>80 (patient)</span>
            </div>
          </div>

          {results && (
            <div className="pt-3 border-t border-border space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-dim">Best val (no reg)</span>
                <span className="text-ink tabular-nums">
                  {results.baseline.bestValLoss.toFixed(3)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-dim">Best val (early stop)</span>
                <span className="text-ink tabular-nums">
                  {results.earlyStop.bestValLoss.toFixed(3)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-dim">Best val (+aug)</span>
                <span className="text-accent tabular-nums">
                  {results.aug.bestValLoss.toFixed(3)}
                </span>
              </div>
              <p className="text-[11px] text-fg-subtle font-mono mt-2 leading-relaxed">
                Each curve has a dot at the best-validation
                checkpoint. Patience = how many non-improving
                val-loss steps to tolerate before stopping.
                Augmentation adds small rotations and noise to
                the training data — it is the "best regularizer
                when applicable."
              </p>
            </div>
          )}
        </div>
      </div>
    </SimFrame>
  );
}

function ThreeCurves({
  r,
}: {
  r: { baseline: RunResult; earlyStop: RunResult; aug: RunResult };
}) {
  const all = [
    ...r.baseline.trainLoss,
    ...r.baseline.valLoss,
    ...r.earlyStop.trainLoss,
    ...r.earlyStop.valLoss,
    ...r.aug.trainLoss,
    ...r.aug.valLoss,
  ].filter(Number.isFinite);
  if (all.length === 0) return null;
  const maxY = Math.max(...all);
  const yMax = Math.max(maxY, 0.1);
  const x0 = PAD;
  const x1 = PLOT_W - PAD;
  const y0 = PLOT_H - PAD;
  const y1 = PAD;
  const N = r.baseline.trainLoss.length;
  const xs = (i: number) => x0 + (i / Math.max(1, N - 1)) * (x1 - x0);
  const ys = (v: number) => y0 - (v / yMax) * (y0 - y1);
  const path = (vals: readonly number[]): string =>
    vals.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
        (a) No regularization — val bottoms and climbs
      </div>
      <svg
        viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
        className="w-full h-auto bg-bg/40 rounded mb-2"
        role="img"
        aria-label="No regularization: training loss falls, validation loss bottoms and climbs."
      >
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgb(var(--border))" strokeWidth={1} />
        <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgb(var(--border))" strokeWidth={1} />
        <polyline
          points={path(r.baseline.valLoss)}
          fill="none"
          stroke="rgb(var(--negative))"
          strokeWidth={1.5}
        />
        <polyline
          points={path(r.baseline.trainLoss)}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={1.5}
        />
        <BestDot step={r.baseline.bestStep} N={N} x0={x0} x1={x1} y0={y0} yMax={yMax} val={r.baseline.valLoss[r.baseline.bestStep] ?? 0} />
      </svg>

      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
        (b) Early stopping
      </div>
      <svg
        viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
        className="w-full h-auto bg-bg/40 rounded mb-2"
        role="img"
        aria-label="Early stopping: training continues, the run is truncated at the best validation checkpoint."
      >
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgb(var(--border))" strokeWidth={1} />
        <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgb(var(--border))" strokeWidth={1} />
        <polyline
          points={path(r.earlyStop.valLoss)}
          fill="none"
          stroke="rgb(var(--negative))"
          strokeWidth={1.5}
        />
        <polyline
          points={path(r.earlyStop.trainLoss)}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={1.5}
        />
        <BestDot step={r.earlyStop.bestStep} N={N} x0={x0} x1={x1} y0={y0} yMax={yMax} val={r.earlyStop.valLoss[r.earlyStop.bestStep] ?? 0} />
      </svg>

      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
        (c) Early stopping + augmentation
      </div>
      <svg
        viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
        className="w-full h-auto bg-bg/40 rounded"
        role="img"
        aria-label="Early stopping with augmentation: validation best is lower than (b)."
      >
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgb(var(--border))" strokeWidth={1} />
        <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgb(var(--border))" strokeWidth={1} />
        <polyline
          points={path(r.aug.valLoss)}
          fill="none"
          stroke="rgb(var(--negative))"
          strokeWidth={1.5}
        />
        <polyline
          points={path(r.aug.trainLoss)}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={1.5}
        />
        <BestDot step={r.aug.bestStep} N={N} x0={x0} x1={x1} y0={y0} yMax={yMax} val={r.aug.valLoss[r.aug.bestStep] ?? 0} />
      </svg>
    </div>
  );
}

function BestDot({
  step,
  N,
  x0,
  x1,
  y0,
  yMax,
  val,
}: {
  step: number;
  N: number;
  x0: number;
  x1: number;
  y0: number;
  yMax: number;
  val: number;
}) {
  const cx = x0 + (step / Math.max(1, N - 1)) * (x1 - x0);
  const cy = y0 - (val / yMax) * (y0 - PAD);
  return <circle cx={cx} cy={cy} r={3.5} fill="rgb(var(--negative))" stroke="rgb(var(--bg))" strokeWidth={1.5} />;
}
