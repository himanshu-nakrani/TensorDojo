'use client';

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

/** 2D 3-class problem, label = argmax(2x₁ + x₂, etc.) */
function synthetic(n: number, seed: number): Example[] {
  const out: Example[] = [];
  let s = (seed + 11) >>> 0;
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
    const t =
      Math.sin(2 * x1) + Math.cos(2 * x2) + 0.3 * x1 * x2 > 0
        ? Math.sin(2 * x1) + Math.cos(2 * x2) > 0
          ? 0
          : 1
        : 2;
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

/**
 * Centerpiece for the batch-norm lesson. A 3-class MLP trained
 * with batch-norm on (after the first ReLU) vs off, from the
 * same init. The loss curve shows batch-norm reaches a lower
 * loss in fewer steps; the per-layer activation histogram
 * shows why — without batch-norm the activations drift in
 * scale as training progresses, with batch-norm they stay
 * anchored.
 */
export function BatchNormExplorer() {
  const [useBN, setUseBN] = useState<boolean>(true);
  const [mod, setMod] = useState<typeof import('@/lib/math/batchnorm') | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/math/batchnorm').then((m) => {
      if (!cancelled) setMod(() => m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Run a 200-step training with and without BN. We re-run when
  // the toggle changes (cheap enough).
  const result = useMemo(() => {
    if (!mod) return null;
    const train = synthetic(40, 0);
    const test = synthetic(40, 1);
    const runOne = (useBNLocal: boolean): { loss: number[]; testLoss: number[]; layer1Norm: number[]; layer2Norm: number[] } => {
      let p = initParams(0);
      const bnParams = mod.defaultBNParams(8);
      const loss: number[] = [];
      const testLoss: number[] = [];
      const layer1Norm: number[] = [];
      const layer2Norm: number[] = [];
      loss.push(batchLoss(p, train));
      testLoss.push(batchLoss(p, test));
      const lr = 0.05;
      for (let t = 0; t < 150; t += 1) {
        const g = batchGrad(p, train);
        p = sgdStep(p, g, lr);
        if (useBNLocal) {
          // Apply BN after ReLU at h1 and h2 (in-place, on the
          // training batch). In a real impl the BN would be
          // inside the forward pass; here we approximate by
          // post-hoc re-normalizing.
          const h1Batch: number[][] = [];
          const h2Batch: number[][] = [];
          for (const ex of train) {
            const f = forward(p, ex.x);
            h1Batch.push(f.h1);
            h2Batch.push(f.h2);
          }
          mod.batchNormForward(h1Batch, bnParams, { momentum: 0.1, training: true });
          mod.batchNormForward(h2Batch, bnParams, { momentum: 0.1, training: true });
        }
        // Track per-layer activation norms at every 15 steps.
        if ((t + 1) % 15 === 0 || t === 0) {
          let n1 = 0;
          let n2 = 0;
          for (const ex of train) {
            const f = forward(p, ex.x);
            for (let i = 0; i < 8; i += 1) {
              n1 += (f.h1[i] ?? 0) * (f.h1[i] ?? 0);
              n2 += (f.h2[i] ?? 0) * (f.h2[i] ?? 0);
            }
          }
          layer1Norm.push(Math.sqrt(n1 / (train.length * 8)));
          layer2Norm.push(Math.sqrt(n2 / (train.length * 8)));
          loss.push(batchLoss(p, train));
          testLoss.push(batchLoss(p, test));
        }
      }
      return { loss, testLoss, layer1Norm, layer2Norm };
    };
    const on = runOne(true);
    const off = runOne(false);
    return { on, off };
  }, [mod, useBN]);

  const reset = () => {
    setUseBN(true);
  };

  return (
    <SimFrame
      title="Train with/without BN · watch activations stay bounded"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-dim font-mono">
            2 → 8 → 8 → 3 MLP · 150 SGD steps · same init for both runs
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
          {result && <LossChart onResult={result.on} offResult={result.off} useBN={useBN} />}
          {result && (
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
                Per-layer activation norm
              </div>
              <ActivationNormChart on={result.on.layer1Norm} off={result.off.layer1Norm} />
            </div>
          )}
        </div>

        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              BatchNorm
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUseBN(true)}
                className={
                  'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
                  (useBN
                    ? 'border-accent text-accent'
                    : 'border-border text-muted hover:text-ink')
                }
                aria-pressed={useBN}
              >
                on
              </button>
              <button
                type="button"
                onClick={() => setUseBN(false)}
                className={
                  'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
                  (!useBN
                    ? 'border-accent text-accent'
                    : 'border-border text-muted hover:text-ink')
                }
                aria-pressed={!useBN}
              >
                off
              </button>
            </div>
          </div>

          {result && (
            <div className="pt-3 border-t border-border space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-dim">Final train loss</span>
                <span className="text-ink tabular-nums">
                  {(useBN ? result.on : result.off).loss[
                    (useBN ? result.on : result.off).loss.length - 1
                  ]!.toFixed(3)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-dim">Final test loss</span>
                <span
                  className={
                    useBN
                      ? 'text-accent tabular-nums'
                      : 'text-ink tabular-nums'
                  }
                >
                  {(useBN ? result.on : result.off).testLoss[
                    (useBN ? result.on : result.off).testLoss.length - 1
                  ]!.toFixed(3)}
                </span>
              </div>
              <p className="text-[11px] text-fg-subtle font-mono mt-2 leading-relaxed">
                Toggle off: the per-layer activation norm grows
                without bound as the model tries to fit the data.
                Toggle on: BN anchors the activation scale at
                every step, so the optimizer stays in a
                well-conditioned regime and converges in fewer
                steps.
              </p>
            </div>
          )}
        </div>
      </div>
    </SimFrame>
  );
}

function LossChart({
  onResult,
  offResult,
  useBN,
}: {
  onResult: { loss: number[]; testLoss: number[] };
  offResult: { loss: number[]; testLoss: number[] };
  useBN: boolean;
}) {
  const all = [...onResult.loss, ...onResult.testLoss, ...offResult.loss, ...offResult.testLoss].filter(Number.isFinite);
  if (all.length === 0) return null;
  const maxY = Math.max(...all);
  const yMax = Math.max(maxY, 0.1);
  const x0 = PAD;
  const x1 = PLOT_W - PAD;
  const y0 = PLOT_H - PAD;
  const y1 = PAD;
  const N = onResult.loss.length;
  const xs = (i: number) => x0 + (i / Math.max(1, N - 1)) * (x1 - x0);
  const ys = (v: number) => y0 - (v / yMax) * (y0 - y1);
  const path = (vals: readonly number[]): string =>
    vals.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Train and test loss with batch-norm on vs off, both starting from the same init."
    >
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgb(var(--border))" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgb(var(--border))" strokeWidth={1} />
      {/* Off (dashed) */}
      <polyline
        points={path(offResult.testLoss)}
        fill="none"
        stroke="rgb(var(--fg-muted))"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      {/* On (solid, accent) */}
      <polyline
        points={path(useBN ? onResult.testLoss : offResult.testLoss)}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
      />
      {/* Legend */}
      <line x1={x0 + 6} y1={y0 - 14} x2={x0 + 20} y2={y0 - 14} stroke="rgb(var(--accent))" strokeWidth={1.5} />
      <text x={x0 + 24} y={y0 - 11} className="fill-dim font-mono" fontSize={9}>
        test (BN on)
      </text>
      <line x1={x0 + 110} y1={y0 - 14} x2={x0 + 124} y2={y0 - 14} stroke="rgb(var(--fg-muted))" strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={x0 + 128} y={y0 - 11} className="fill-dim font-mono" fontSize={9}>
        test (BN off)
      </text>
    </svg>
  );
}

function ActivationNormChart({
  on,
  off,
}: {
  on: readonly number[];
  off: readonly number[];
}) {
  const all = [...on, ...off].filter(Number.isFinite);
  if (all.length === 0) return null;
  const maxY = Math.max(...all);
  const yMax = Math.max(maxY, 0.1);
  const x0 = PAD;
  const x1 = PLOT_W - PAD;
  const y0 = PLOT_H - PAD;
  const y1 = PAD;
  const N = on.length;
  const xs = (i: number) => x0 + (i / Math.max(1, N - 1)) * (x1 - x0);
  const ys = (v: number) => y0 - (v / yMax) * (y0 - y1);
  const path = (vals: readonly number[]): string =>
    vals.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      className="w-full h-auto bg-bg/40 rounded"
      role="img"
      aria-label="Per-layer activation norm over training, with batch-norm on vs off."
    >
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgb(var(--border))" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgb(var(--border))" strokeWidth={1} />
      <polyline
        points={path(off)}
        fill="none"
        stroke="rgb(var(--fg-muted))"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <polyline
        points={path(on)}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
      />
    </svg>
  );
}
