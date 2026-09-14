

import { useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { crossEntropyCurve } from '@/lib/math/cross-entropy';

const WIDTH = 480;
const HEIGHT = 220;
const PAD = 32;
const P_MIN = 0.005;
const P_MAX = 1.0;
const LOSS_MAX = 8; // log scale, ~8 nats

/**
 * Secondary widget for the cross-entropy lesson: a static
 * plot of the loss curve H(p) = -log(p) with a marker at the
 * current p[true] from the centerpiece's distribution.
 */
export function CrossEntropyCurve() {
  const [pTrue, setPTrue] = useState(0.5);

  // Sample the curve on a log-spaced x axis.
  const samples: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 200; i += 1) {
    const t = i / 200;
    const x = P_MIN * Math.pow(P_MAX / P_MIN, t); // log scale x
    samples.push({ x, y: crossEntropyCurve(x) });
  }
  const toScreenX = (x: number): number => {
    const t = Math.log(x / P_MIN) / Math.log(P_MAX / P_MIN);
    return PAD + t * (WIDTH - 2 * PAD);
  };
  const toScreenY = (y: number): number => {
    if (!Number.isFinite(y)) return PAD;
    const t = Math.min(1, Math.max(0, y / LOSS_MAX));
    return HEIGHT - PAD - t * (HEIGHT - 2 * PAD);
  };

  const pathD = samples
    .map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd} ${toScreenX(p.x).toFixed(2)} ${toScreenY(p.y).toFixed(2)}`;
    })
    .join(' ');
  const current = crossEntropyCurve(pTrue);
  const cx = toScreenX(pTrue);
  const cy = toScreenY(current);

  const reset = () => {
    setPTrue(0.5);
  };

  return (
    <SimFrame title="Loss as a function of p(true)" onReset={reset}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Cross-entropy loss curve, H(p) = -log p. The curve is sharply asymmetric: near p=1 the loss is near 0, but as p → 0 the loss diverges to +∞.`}
      >
        {/* Axes */}
        <line
          x1={PAD}
          y1={HEIGHT - PAD}
          x2={WIDTH - PAD}
          y2={HEIGHT - PAD}
          stroke="rgb(var(--border-strong))"
          strokeWidth={1}
        />
        <line
          x1={PAD}
          y1={PAD}
          x2={PAD}
          y2={HEIGHT - PAD}
          stroke="rgb(var(--border-strong))"
          strokeWidth={1}
        />
        {/* Loss curve */}
        <path
          d={pathD}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {/* Current marker */}
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="rgb(var(--accent-hover))"
          stroke="rgb(var(--bg))"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {/* Y-axis labels */}
        <text
          x={PAD - 4}
          y={toScreenY(0) + 4}
          textAnchor="end"
          className="fill-dim font-mono"
          fontSize={10}
        >
          0
        </text>
        <text
          x={PAD - 4}
          y={toScreenY(2) + 4}
          textAnchor="end"
          className="fill-dim font-mono"
          fontSize={10}
        >
          2
        </text>
        <text
          x={PAD - 4}
          y={toScreenY(4) + 4}
          textAnchor="end"
          className="fill-dim font-mono"
          fontSize={10}
        >
          4
        </text>
        <text
          x={PAD - 4}
          y={toScreenY(6) + 4}
          textAnchor="end"
          className="fill-dim font-mono"
          fontSize={10}
        >
          6
        </text>
        <text
          x={PAD - 4}
          y={toScreenY(8) + 4}
          textAnchor="end"
          className="fill-dim font-mono"
          fontSize={10}
        >
          8
        </text>
        {/* X-axis labels (log-spaced) */}
        {[0.01, 0.1, 0.5, 1.0].map((p) => (
          <text
            key={p}
            x={toScreenX(p)}
            y={HEIGHT - PAD + 14}
            textAnchor="middle"
            className="fill-dim font-mono"
            fontSize={10}
          >
            {p}
          </text>
        ))}
        {/* X-axis title */}
        <text
          x={WIDTH / 2}
          y={HEIGHT - 4}
          textAnchor="middle"
          className="fill-dim font-mono"
          fontSize={10}
        >
          p(true) — log scale
        </text>
        {/* Y-axis title */}
        <text
          x={2}
          y={HEIGHT / 2}
          textAnchor="middle"
          transform={`rotate(-90, 2, ${HEIGHT / 2})`}
          className="fill-dim font-mono"
          fontSize={10}
        >
          loss = -log p
        </text>
      </svg>

      <div className="mt-4">
        <Slider
          value={pTrue}
          min={P_MIN}
          max={1.0}
          step={0.001}
          onChange={setPTrue}
          formatValue={(v) => v.toFixed(3)}
          ariaLabel="p(true) for the loss curve marker"
        />
        <div className="mt-2 flex items-baseline justify-between text-[11px] text-dim font-mono tabular-nums">
          <span>p(true) = {pTrue.toFixed(3)}</span>
          <span>
            H(p) = {Number.isFinite(current) ? current.toFixed(3) : '∞'}
          </span>
        </div>
      </div>
    </SimFrame>
  );
}
