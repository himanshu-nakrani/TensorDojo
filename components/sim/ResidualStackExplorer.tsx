'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { Slider } from '@/components/sim/primitives/Slider';

export interface ResidualStackExplorerPreset {
  n?: number;
}

interface Layer {
  W: number[][];
  b: number[];
}

/**
 * Toy stack of N transformer-like sublayers. Each sublayer is
 * (W · x + b) followed by tanh. The reader toggles residual and
 * layernorm and watches per-layer activation and gradient norms.
 *
 * This is a *demonstration*, not a faithful simulation: real
 * transformer sublayers are 2-layer MLPs with attention, and the
 * exact gradient norms depend on initialization. The point is to
 * show the *qualitative* behavior — residuals keep gradients from
 * vanishing, layernorm keeps activations from blowing up.
 */
function randomLayer(d: number, scale: number, seed: number): Layer {
  // Deterministic pseudo-random W
  const W: number[][] = Array.from({ length: d }, () =>
    new Array<number>(d).fill(0),
  );
  let s = seed;
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      s = (s * 1103515245 + 12345) >>> 0;
      W[i]![j] = ((s / 0xffffffff) * 2 - 1) * scale;
    }
  }
  const b: number[] = new Array<number>(d).fill(0);
  return { W, b };
}

function matVecMul(W: number[][], x: number[], b: number[]): number[] {
  const out: number[] = new Array<number>(W.length).fill(0);
  for (let i = 0; i < W.length; i += 1) {
    let s = b[i]!;
    for (let j = 0; j < x.length; j += 1) s += W[i]![j]! * x[j]!;
    out[i] = Math.tanh(s);
  }
  return out;
}

function vecNorm(x: number[]): number {
  let s = 0;
  for (const v of x) s += v * v;
  return Math.sqrt(s);
}

function forward(
  x0: number[],
  layers: Layer[],
  useResidual: boolean,
): { acts: number[][] } {
  const acts: number[][] = [x0.slice()];
  let x = x0;
  for (const layer of layers) {
    const sublayerOut = matVecMul(layer.W, x, layer.b);
    x = useResidual
      ? x.map((v, i) => v + (sublayerOut[i] as number))
      : sublayerOut;
    acts.push(x.slice());
  }
  return { acts };
}

/**
 * Compute per-layer gradient norm via the chain rule. This is a
 * forward-mode gradient with respect to the L2 norm of the output
 * (we just want the magnitude, not a particular direction).
 */
function gradNorms(
  x0: number[],
  layers: Layer[],
  useResidual: boolean,
): number[] {
  const { acts } = forward(x0, layers, useResidual);
  // Initialize gradient at the output as ones (we want ||dL/dx||)
  let grad = new Array<number>(x0.length).fill(1);
  const norms: number[] = [vecNorm(grad)]; // at input
  // Walk backward through layers
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i]!;
    // gradient through tanh(W x + b): d tanh / d (W x + b) = 1 - tanh²
    // d (W x + b) / d x = W^T
    // new grad = grad · W · diag(1 - tanh²(z))
    // For each output dim k: dL/dx_i = sum_k grad_k * W_ki * (1 - z_k²)
    const z = acts[i]!;
    const sublayer = matVecMul(layer.W, z, layer.b);
    const dTanh = sublayer.map((s) => 1 - s * s);
    const newGrad = new Array<number>(x0.length).fill(0);
    for (let j = 0; j < x0.length; j += 1) {
      let s = 0;
      for (let k = 0; k < layer.W.length; k += 1) {
        s += (grad[k] as number) * layer.W[k]![j]! * dTanh[k]!;
      }
      newGrad[j] = s;
    }
    if (useResidual) {
      // gradient through x + sublayer: grad accumulates
      grad = newGrad.map((g, j) => g + (grad[j] as number));
    } else {
      grad = newGrad;
    }
    norms.unshift(vecNorm(grad));
  }
  // Trim: the loop above gave us norms for the input gradient after
  //  each layer walk-back. We want one per layer.
  return norms;
}

export function ResidualStackExplorer({ preset }: { preset?: ResidualStackExplorerPreset }) {
  const [n, setN] = useState(preset?.n ?? 8);
  const [useResidual, setUseResidual] = useState(true);
  const [useLayerNorm, setUseLayerNorm] = useState(false);
  const d = 4;

  const layers = useMemo(
    () => Array.from({ length: n }, (_, i) => randomLayer(d, 0.6, 42 + i * 7)),
    [n, d],
  );
  const x0 = useMemo(() => Array.from({ length: d }, (_, i) => Math.sin(i * 0.7)), [d]);

  const { acts } = useMemo(
    () => forward(x0, layers, useResidual),
    [x0, layers, useResidual],
  );

  // When useLayerNorm is on, normalize the input of each sublayer.
  const actsLN = useMemo(() => {
    if (!useLayerNorm) return null;
    const result: number[][] = [x0.slice()];
    let x = x0;
    for (const layer of layers) {
      const z = matVecMul(layer.W, x, layer.b);
      // tanh + add residual
      const sublayer = z.map(Math.tanh);
      const combined = useResidual
        ? x.map((v, i) => v + sublayer[i]!)
        : sublayer;
      // layernorm for the next iter's input
      const mean = combined.reduce((s, v) => s + v, 0) / combined.length;
      const std = Math.sqrt(
        combined.reduce((s, v) => s + (v - mean) ** 2, 0) / combined.length + 1e-5,
      );
      const ln = combined.map((v) => (v - mean) / std);
      result.push(ln);
      x = ln;
    }
    return result;
  }, [x0, layers, useResidual, useLayerNorm]);

  const actNorms = (actsLN ?? acts).map(vecNorm);
  const gradNormsArray = useMemo(
    () => gradNorms(x0, layers, useResidual),
    [x0, layers, useResidual],
  );

  const WIDTH = 400;
  const HEIGHT = 160;
  const PAD = 20;
  const plotW = WIDTH - 2 * PAD;
  const plotH = HEIGHT - 2 * PAD;

  const reset = () => {
    setN(preset?.n ?? 8);
    setUseResidual(true);
    setUseLayerNorm(false);
  };

  return (
    <SimFrame
      title="Residual + LayerNorm"
      headerAction={
        <div className="flex items-center gap-3">
          <Toggle label="Residual" on={useResidual} onChange={setUseResidual} />
          <Toggle label="LayerNorm" on={useLayerNorm} onChange={setUseLayerNorm} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Per-layer activation ‖x‖
          </div>
          <PlotLine data={actNorms} width={WIDTH} height={HEIGHT} pad={PAD} color="rgb(var(--accent))" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Per-layer gradient ‖∂L/∂x‖
          </div>
          <PlotLine data={gradNormsArray} width={WIDTH} height={HEIGHT} pad={PAD} color="rgb(var(--negative))" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-3 font-mono text-[12px]">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          Stack depth N
        </span>
        <Slider
          value={n}
          min={1}
          max={24}
          step={1}
          onChange={(v) => setN(Math.round(v))}
          formatValue={(v) => String(Math.round(v))}
          ariaLabel="Stack depth N"
          valueMinWidth="1.5ch"
        />
      </div>
    </SimFrame>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={clsx(
        'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
        on
          ? 'border-accent text-accent'
          : 'border-border text-muted hover:text-ink',
      )}
      aria-pressed={on}
    >
      {label}: {on ? 'on' : 'off'}
    </button>
  );
}

function PlotLine({
  data,
  width,
  height,
  pad,
  color,
}: {
  data: readonly number[];
  width: number;
  height: number;
  pad: number;
  color: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1e-6);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1 || 1)) * (width - 2 * pad);
      const y = pad + (1 - (v - min) / range) * (height - 2 * pad);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={width} height={height} className="fill-bg/40" />
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="text-border" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} className="text-border" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1 || 1)) * (width - 2 * pad);
        const y = pad + (1 - (v - min) / range) * (height - 2 * pad);
        return <circle key={i} cx={x} cy={y} r={3} fill={color} />;
      })}
      <text x={width - pad} y={pad + 10} textAnchor="end" className="fill-dim font-mono" fontSize={11} style={{ fontSize: 11 }}>
        max {max.toFixed(2)}
      </text>
    </svg>
  );
}
