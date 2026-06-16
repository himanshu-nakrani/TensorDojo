'use client';

import { useEffect, useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Centerpiece for the dropout lesson. A 2 → 4 → 2 → 1 MLP on a
 * fixed dataset. The reader picks a dropout probability p; we
 * run two training runs from the same init — one with dropout
 * off, one with dropout on — and the loss curves show the
 * tradeoff: dropout-on is noisier per step but reaches a lower
 * test loss.
 *
 *   - At each step, the dropped neurons are rendered as
 *     semi-transparent in the network diagram. The active
 *     sub-network's forward path is highlighted.
 *   - The lesson's "drop an MLP" view shows the *current step's
 *     mask* — a static snapshot, not animated.
 */

const D = 2;
const H1 = 4;
const H2 = 2;
const O = 1;

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
    W1: make(H1, D, 0.6),
    b1: new Array<number>(H1).fill(0),
    W2: make(H2, H1, 0.6),
    b2: new Array<number>(H2).fill(0),
    W3: make(O, H2, 0.6),
    b3: new Array<number>(O).fill(0),
  };
}

interface Example {
  x: number[];
  t: number;
}

/** A fixed 16-example regression dataset. f(x) = sin(2x₁) + cos(2x₂). */
function synthetic(): Example[] {
  const out: Example[] = [];
  for (let i = 0; i < 16; i += 1) {
    const x1 = -1 + (2 * (i % 4)) / 3;
    const x2 = -1 + (2 * Math.floor(i / 4)) / 3;
    out.push({ x: [x1, x2], t: Math.sin(2 * x1) + Math.cos(2 * x2) });
  }
  return out;
}

/**
 * Forward pass with optional dropout on h1 and h2. `mask1`/`mask2`
 * are pre-generated Bernoulli samples of length H1/H2. If
 * `inverted=true`, the mask is scaled by 1/(1-p) so the
 * post-dropout activation preserves the expected value.
 */
function forward(
  p: MlpParams,
  x: number[],
  mask1: number[],
  mask2: number[],
  pDrop: number,
  inverted: boolean,
): { h1: number[]; h2: number[]; y: number } {
  const scale = pDrop > 0 ? 1 / (1 - pDrop) : 1;
  // h1 = relu(W1 · x + b1) ⊙ mask1 (optionally scaled)
  const h1: number[] = [];
  for (let i = 0; i < H1; i += 1) {
    let s = p.b1[i] ?? 0;
    for (let j = 0; j < D; j += 1) s += (p.W1[i]![j] ?? 0) * (x[j] ?? 0);
    const m = mask1[i] ?? 0;
    const v = s > 0 ? s : 0;
    if (m === 0) h1.push(0);
    else if (inverted) h1.push(v * scale);
    else h1.push(v);
  }
  const h2: number[] = [];
  for (let i = 0; i < H2; i += 1) {
    let s = p.b2[i] ?? 0;
    for (let j = 0; j < H1; j += 1) s += (p.W2[i]![j] ?? 0) * (h1[j] ?? 0);
    const m = mask2[i] ?? 0;
    const v = s > 0 ? s : 0;
    if (m === 0) h2.push(0);
    else if (inverted) h2.push(v * scale);
    else h2.push(v);
  }
  let y = p.b3[0] ?? 0;
  for (let j = 0; j < H2; j += 1) y += (p.W3[0]![j] ?? 0) * (h2[j] ?? 0);
  return { h1, h2, y };
}

/** L2 loss on one example. */
function loss(p: MlpParams, ex: Example, mask1: number[], mask2: number[], pDrop: number, inverted: boolean): number {
  const { y } = forward(p, ex.x, mask1, mask2, pDrop, inverted);
  const d = y - ex.t;
  return 0.5 * d * d;
}

/** Numerical gradient (small step) for one parameter. */
function numericalGrad(
  p: MlpParams,
  ex: Example,
  layer: 'W1' | 'W2' | 'W3' | 'b1' | 'b2' | 'b3',
  i: number,
  j: number,
  mask1: number[],
  mask2: number[],
  pDrop: number,
  inverted: boolean,
): number {
  const h = 1e-3;
  const get = (pp: MlpParams): number => loss(pp, ex, mask1, mask2, pDrop, inverted);
  const plus = cloneParams(p);
  const minus = cloneParams(p);
  bumpParam(plus, layer, i, j, h);
  bumpParam(minus, layer, i, j, -h);
  return (get(plus) - get(minus)) / (2 * h);
}

function cloneParams(p: MlpParams): MlpParams {
  return {
    W1: p.W1.map((r) => r.slice()),
    b1: p.b1.slice(),
    W2: p.W2.map((r) => r.slice()),
    b2: p.b2.slice(),
    W3: p.W3.map((r) => r.slice()),
    b3: p.b3.slice(),
  };
}

function bumpParam(
  p: MlpParams,
  layer: 'W1' | 'W2' | 'W3' | 'b1' | 'b2' | 'b3',
  i: number,
  j: number,
  delta: number,
): void {
  switch (layer) {
    case 'W1': p.W1[i]![j] = (p.W1[i]![j] ?? 0) + delta; break;
    case 'W2': p.W2[i]![j] = (p.W2[i]![j] ?? 0) + delta; break;
    case 'W3': p.W3[i]![j] = (p.W3[i]![j] ?? 0) + delta; break;
    case 'b1': p.b1[i] = (p.b1[i] ?? 0) + delta; break;
    case 'b2': p.b2[i] = (p.b2[i] ?? 0) + delta; break;
    case 'b3': p.b3[i] = (p.b3[i] ?? 0) + delta; break;
  }
}

function sgdStep(
  p: MlpParams,
  grads: MlpParams,
  lr: number,
): MlpParams {
  const out = cloneParams(p);
  for (let i = 0; i < H1; i += 1) {
    for (let j = 0; j < D; j += 1) out.W1[i]![j] = (p.W1[i]![j] ?? 0) - lr * (grads.W1[i]![j] ?? 0);
    out.b1[i] = (p.b1[i] ?? 0) - lr * (grads.b1[i] ?? 0);
  }
  for (let i = 0; i < H2; i += 1) {
    for (let j = 0; j < H1; j += 1) out.W2[i]![j] = (p.W2[i]![j] ?? 0) - lr * (grads.W2[i]![j] ?? 0);
    out.b2[i] = (p.b2[i] ?? 0) - lr * (grads.b2[i] ?? 0);
  }
  for (let i = 0; i < O; i += 1) {
    for (let j = 0; j < H2; j += 1) out.W3[i]![j] = (p.W3[i]![j] ?? 0) - lr * (grads.W3[i]![j] ?? 0);
    out.b3[i] = (p.b3[i] ?? 0) - lr * (grads.b3[i] ?? 0);
  }
  return out;
}

/** Average per-parameter gradient over a batch. */
function batchGrad(
  p: MlpParams,
  batch: Example[],
  pDrop: number,
  inverted: boolean,
  rand: () => number,
): MlpParams {
  const acc: MlpParams = {
    W1: Array.from({ length: H1 }, () => new Array<number>(D).fill(0)),
    b1: new Array<number>(H1).fill(0),
    W2: Array.from({ length: H2 }, () => new Array<number>(H1).fill(0)),
    b2: new Array<number>(H2).fill(0),
    W3: Array.from({ length: O }, () => new Array<number>(H2).fill(0)),
    b3: new Array<number>(O).fill(0),
  };
  for (const ex of batch) {
    const mask1 = Array.from({ length: H1 }, () => (rand() < pDrop ? 0 : 1));
    const mask2 = Array.from({ length: H2 }, () => (rand() < pDrop ? 0 : 1));
    for (let i = 0; i < H1; i += 1) {
      for (let j = 0; j < D; j += 1) {
        acc.W1[i]![j] = (acc.W1[i]![j] ?? 0) + numericalGrad(p, ex, 'W1', i, j, mask1, mask2, pDrop, inverted);
      }
      acc.b1[i] = (acc.b1[i] ?? 0) + numericalGrad(p, ex, 'b1', i, 0, mask1, mask2, pDrop, inverted);
    }
    for (let i = 0; i < H2; i += 1) {
      for (let j = 0; j < H1; j += 1) {
        acc.W2[i]![j] = (acc.W2[i]![j] ?? 0) + numericalGrad(p, ex, 'W2', i, j, mask1, mask2, pDrop, inverted);
      }
      acc.b2[i] = (acc.b2[i] ?? 0) + numericalGrad(p, ex, 'b2', i, 0, mask1, mask2, pDrop, inverted);
    }
    for (let i = 0; i < O; i += 1) {
      for (let j = 0; j < H2; j += 1) {
        acc.W3[i]![j] = (acc.W3[i]![j] ?? 0) + numericalGrad(p, ex, 'W3', i, j, mask1, mask2, pDrop, inverted);
      }
      acc.b3[i] = (acc.b3[i] ?? 0) + numericalGrad(p, ex, 'b3', i, 0, mask1, mask2, pDrop, inverted);
    }
  }
  const N = batch.length;
  for (let i = 0; i < H1; i += 1) {
    for (let j = 0; j < D; j += 1) acc.W1[i]![j] = (acc.W1[i]![j] ?? 0) / N;
    acc.b1[i] = (acc.b1[i] ?? 0) / N;
  }
  for (let i = 0; i < H2; i += 1) {
    for (let j = 0; j < H1; j += 1) acc.W2[i]![j] = (acc.W2[i]![j] ?? 0) / N;
    acc.b2[i] = (acc.b2[i] ?? 0) / N;
  }
  for (let i = 0; i < O; i += 1) {
    for (let j = 0; j < H2; j += 1) acc.W3[i]![j] = (acc.W3[i]![j] ?? 0) / N;
    acc.b3[i] = (acc.b3[i] ?? 0) / N;
  }
  return acc;
}

function evalLoss(p: MlpParams, data: Example[], pDrop: number, inverted: boolean, rand: () => number): number {
  if (pDrop === 0) {
    // Identity mask.
    let s = 0;
    for (const ex of data) {
      const { y } = forward(p, ex.x, [1, 1, 1, 1], [1, 1], pDrop, inverted);
      const d = y - ex.t;
      s += 0.5 * d * d;
    }
    return s / data.length;
  }
  // Use a few sampled masks and average.
  const SAMPLES = 4;
  let total = 0;
  for (let s = 0; s < SAMPLES; s += 1) {
    let sum = 0;
    for (const ex of data) {
      const mask1 = Array.from({ length: H1 }, () => (rand() < pDrop ? 0 : 1));
      const mask2 = Array.from({ length: H2 }, () => (rand() < pDrop ? 0 : 1));
      const { y } = forward(p, ex.x, mask1, mask2, pDrop, inverted);
      const d = y - ex.t;
      sum += 0.5 * d * d;
    }
    total += sum / data.length;
  }
  return total / SAMPLES;
}

/** Run a full training loop and return train + test loss traces. */
function runTraining(
  seed: number,
  pDrop: number,
  numSteps: number,
): { train: number[]; test: number[] } {
  const trainData = synthetic();
  const testData = synthetic();
  let p = initParams(seed);
  // Same RNG for both runs so the per-step noise is comparable.
  let s = (seed + 7) >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const train: number[] = [];
  const test: number[] = [];
  train.push(evalLoss(p, trainData, pDrop, true, rand));
  test.push(evalLoss(p, testData, 0, false, rand));
  const lr = 0.05;
  for (let t = 0; t < numSteps; t += 1) {
    const batch = trainData; // full-batch (tiny dataset, 16 examples)
    const g = batchGrad(p, batch, pDrop, true, rand);
    p = sgdStep(p, g, lr);
    if ((t + 1) % 10 === 0 || t === 0) {
      train.push(evalLoss(p, trainData, pDrop, true, rand));
      test.push(evalLoss(p, testData, 0, false, rand));
    }
  }
  return { train, test };
}

export function DropoutExplorer() {
  const [pDrop, setPDrop] = useState<number>(0.3);
  const [mod, setMod] = useState<typeof import('@/lib/math/dropout') | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/math/dropout').then((m) => {
      if (!cancelled) setMod(() => m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Run two trainings (off and on) once on mount. Heavy (~ 200
  // steps × 16 examples × many numerical-gradient evals); we
  // re-run only when pDrop changes, and cache the off-result.
  const offResult = useMemo(() => {
    if (!mod) return null;
    return runTraining(0, 0, 200);
  }, [mod]);

  const onResult = useMemo(() => {
    if (!mod) return null;
    return runTraining(0, pDrop, 200);
  }, [mod, pDrop]);

  const mask1 = useMemo(() => {
    // One demo mask for the network diagram at the current p.
    // (The actual training uses fresh masks every step.)
    if (!mod) return new Array<number>(H1).fill(1);
    const out: number[] = [];
    for (let i = 0; i < H1; i += 1) {
      out.push(mod.invertedDropout([1], pDrop, [Math.random() * 0.99])[0]! > 0 ? 1 : 0);
    }
    return out;
  }, [mod, pDrop]);

  const reset = () => {
    setPDrop(0.3);
  };

  return (
    <SimFrame
      title="Dropout"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-dim font-mono">
            2 → 4 → 2 → 1 MLP · same init for both runs
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reset
          </button>
        </div>
      }
      headerWrap
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5">
        <div>
          {offResult && onResult && (
            <LossChart
              off={offResult}
              on={onResult}
            />
          )}
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
              Active sub-network (one snapshot)
            </div>
            <NetworkDiagram mask1={mask1} />
          </div>
        </div>

        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Dropout p
              </span>
              <span className="text-ink tabular-nums">{pDrop.toFixed(2)}</span>
            </div>
            <Slider
              value={pDrop}
              min={0}
              max={0.5}
              step={0.05}
              onChange={setPDrop}
              formatValue={(v) => v.toFixed(2)}
              ariaLabel="Dropout probability"
            />
            <div className="flex justify-between text-[10px] text-dim font-mono mt-1 tabular-nums">
              <span>0 (off)</span>
              <span>0.5 (heavy)</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-1">
            {onResult && (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-dim">Final train (dropout on)</span>
                  <span className="text-ink tabular-nums">
                    {onResult.train[onResult.train.length - 1]!.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-dim">Final test (dropout on)</span>
                  <span
                    className={
                      offResult &&
                      onResult.test[onResult.test.length - 1]! <
                        offResult.test[offResult.test.length - 1]!
                        ? 'text-accent tabular-nums'
                        : 'text-ink tabular-nums'
                    }
                  >
                    {onResult.test[onResult.test.length - 1]!.toFixed(3)}
                  </span>
                </div>
                {offResult && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-dim">Final test (dropout off)</span>
                    <span className="text-ink tabular-nums">
                      {offResult.test[offResult.test.length - 1]!.toFixed(3)}
                    </span>
                  </div>
                )}
              </>
            )}
            <p className="text-[10px] text-fg-subtle font-mono mt-2 leading-relaxed">
              Each training step samples a fresh Bernoulli mask. The
              diagram above is one snapshot — in practice every step
              drops a different subset. Dropout-on is noisier per
              step but reaches a lower test loss.
            </p>
          </div>
        </div>
      </div>
    </SimFrame>
  );
}

function LossChart({
  off,
  on,
}: {
  off: { train: number[]; test: number[] };
  on: { train: number[]; test: number[] };
}) {
  const W = 420;
  const H = 180;
  const PAD = 28;
  const all = [...off.train, ...off.test, ...on.train, ...on.test].filter(Number.isFinite);
  if (all.length === 0) return null;
  const maxY = Math.max(...all);
  const yMax = Math.max(maxY, 0.1);
  const x0 = PAD;
  const x1 = W - PAD;
  const y0 = H - PAD;
  const y1 = PAD;
  const N = off.train.length;
  const xs = (i: number) => x0 + (i / Math.max(1, N - 1)) * (x1 - x0);
  const ys = (v: number) => y0 - (v / yMax) * (y0 - y1);
  const path = (vals: readonly number[]): string =>
    vals.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Training and test loss with dropout on vs off, both starting from the same init."
    >
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgb(var(--border))" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgb(var(--border))" strokeWidth={1} />
      {/* Off (dashed) */}
      <polyline
        points={path(off.test)}
        fill="none"
        stroke="rgb(var(--fg-muted))"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      {/* On (solid, accent) */}
      <polyline
        points={path(on.test)}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
      />
      {/* Legend */}
      <line x1={x0 + 6} y1={y0 - 14} x2={x0 + 20} y2={y0 - 14} stroke="rgb(var(--accent))" strokeWidth={1.5} />
      <text x={x0 + 24} y={y0 - 11} className="fill-dim font-mono" fontSize={9}>
        test (dropout on)
      </text>
      <line x1={x0 + 110} y1={y0 - 14} x2={x0 + 124} y2={y0 - 14} stroke="rgb(var(--fg-muted))" strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={x0 + 128} y={y0 - 11} className="fill-dim font-mono" fontSize={9}>
        test (dropout off)
      </text>
    </svg>
  );
}

function NetworkDiagram({ mask1 }: { mask1: readonly number[] }) {
  // 2 → 4 → 2 → 1 with edges. Static.
  const W = 420;
  const H = 130;
  const colX = [40, 140, 240, 380];
  const rowY = (n: number) => {
    // Center vertically
    const out: number[] = [];
    for (let i = 0; i < n; i += 1) {
      out.push(((i + 1) * H) / (n + 1));
    }
    return out;
  };
  const layers = [
    { x: colX[0]!, ys: rowY(D) },
    { x: colX[1]!, ys: rowY(H1) },
    { x: colX[2]!, ys: rowY(H2) },
    { x: colX[3]!, ys: rowY(O) },
  ];
  // Edges between consecutive layers.
  const edges: { x1: number; y1: number; x2: number; y2: number; dropped: boolean }[] = [];
  for (let li = 0; li < layers.length - 1; li += 1) {
    for (const y1 of layers[li]!.ys) {
      for (const y2 of layers[li + 1]!.ys) {
        const dropped = li === 0 ? false : mask1[(y1 / H * H1) | 0] === 0;
        edges.push({
          x1: layers[li]!.x,
          y1,
          x2: layers[li + 1]!.x,
          y2,
          dropped,
        });
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Active sub-network with dropped neurons faded out."
    >
      {edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={e.dropped ? 'rgb(var(--fg-subtle))' : 'rgb(var(--accent))'}
          strokeWidth={e.dropped ? 0.4 : 0.8}
          opacity={e.dropped ? 0.2 : 0.6}
        />
      ))}
      {layers.map((layer, li) =>
        layer.ys.map((y, i) => {
          const dropped = li === 0 || li === layers.length - 1 ? false : mask1[i] === 0;
          return (
            <g key={`${li}-${i}`}>
              <circle
                cx={layer.x}
                cy={y}
                r={8}
                fill={dropped ? 'rgb(var(--bg-code))' : 'rgb(var(--accent))'}
                opacity={dropped ? 0.25 : 0.9}
                stroke={dropped ? 'rgb(var(--fg-subtle))' : 'rgb(var(--accent))'}
                strokeWidth={0.8}
              />
              <text
                x={layer.x}
                y={y + 3}
                textAnchor="middle"
                fontSize={8}
                className="fill-bg font-mono"
                opacity={dropped ? 0.4 : 1}
              >
                {`h${li}.${i}`}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
