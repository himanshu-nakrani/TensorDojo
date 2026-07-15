

import { useMemo, useRef, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { DPO_BASELINE_LOSS, dpoLoss } from '@/lib/math/dpo';

/**
 * DPO loss surface as a heatmap. The axes are the policy-vs-reference
 * log-ratios for the chosen (r_w) and rejected (r_l) completions. A
 * draggable point lets the user explore the loss; the beta slider
 * changes how aggressively the surface penalizes a wrong-direction
 * preference.
 */
export function DpoLossExplorer() {
  const [beta, setBeta] = useState(0.5);
  const [rChosen, setRChosen] = useState(0.4);
  const [rRejected, setRRejected] = useState(-0.4);

  const loss = useMemo(
    () => dpoLoss({ rChosen, rRejected, beta }),
    [rChosen, rRejected, beta],
  );

  return (
    <SimFrame
      title="DPO loss surface"
      onReset={() => {
        setBeta(0.5);
        setRChosen(0.4);
        setRRejected(-0.4);
      }}
    >
      {/* Beta */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <label
            htmlFor="dpo-beta"
            className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
          >
            β · KL strength
          </label>
          <span className="font-mono text-[14px] text-accent tabular-nums">
            {beta.toFixed(2)}
          </span>
        </div>
        <input
          id="dpo-beta"
          type="range"
          min={0.05}
          max={2.0}
          step={0.01}
          value={beta}
          onChange={(e) => setBeta(parseFloat(e.target.value))}
          className="w-full accent-[rgb(var(--accent))]"
        />
      </div>

      {/* Loss readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-[12px] font-mono">
        <Stat
          label="L(r_w, r_l)"
          value={loss.toFixed(3)}
          accent="accent"
        />
        <Stat
          label="baseline"
          value={DPO_BASELINE_LOSS.toFixed(3)}
          accent="muted"
        />
        <Stat
          label="margin β·Δr"
          value={(beta * (rChosen - rRejected)).toFixed(2)}
          accent={
            rChosen > rRejected ? 'accent' : 'negative'
          }
        />
      </div>

      <LossHeatmap
        beta={beta}
        rChosen={rChosen}
        rRejected={rRejected}
        onPoint={(rc, rr) => {
          setRChosen(rc);
          setRRejected(rr);
        }}
      />

      <div className="mt-3 text-[11px] text-dim font-mono leading-relaxed">
        Drag the point. <span className="text-accent">Upper-left</span> = chosen winning (low loss).{' '}
        <span className="text-[rgb(var(--negative))]">Lower-right</span> = rejected winning (high loss).{' '}
        The loss only sees the *difference* between the two log-ratios.
      </div>
    </SimFrame>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'accent' | 'muted' | 'negative';
}) {
  const colorMap = {
    accent: 'text-accent',
    muted: 'text-fg-muted',
    negative: 'text-[rgb(var(--negative))]',
  };
  return (
    <div className="rounded-md border border-border bg-bg/40 px-3 py-2 flex items-baseline justify-between">
      <span className="text-dim">{label}</span>
      <span className={`${colorMap[accent]} tabular-nums`}>{value}</span>
    </div>
  );
}

function LossHeatmap({
  beta,
  rChosen,
  rRejected,
  onPoint,
}: {
  beta: number;
  rChosen: number;
  rRejected: number;
  onPoint: (rc: number, rr: number) => void;
}) {
  const W = 400;
  const H = 400;
  const PAD = 36;
  const R_MIN = -2;
  const R_MAX = 2;
  const GRID = 48;
  const svgRef = useRef<SVGSVGElement>(null);

  // X axis: rRejected; Y axis: rChosen (top = high).
  const xToPx = (x: number) =>
    PAD + ((x - R_MIN) / (R_MAX - R_MIN)) * (W - PAD * 2);
  const yToPx = (y: number) =>
    H - PAD - ((y - R_MIN) / (R_MAX - R_MIN)) * (H - PAD * 2);
  const pxToX = (px: number) =>
    R_MIN + ((px - PAD) / (W - PAD * 2)) * (R_MAX - R_MIN);
  const pxToY = (py: number) =>
    R_MIN + ((H - PAD - py) / (H - PAD * 2)) * (R_MAX - R_MIN);

  // Precompute cell values and clamp to a reasonable max for color mapping.
  const cells = useMemo(() => {
    const cellSize = (W - PAD * 2) / GRID;
    const out: { x: number; y: number; w: number; h: number; loss: number }[] = [];
    let maxL = 0;
    for (let i = 0; i < GRID; i += 1) {
      for (let j = 0; j < GRID; j += 1) {
        const xc =
          R_MIN + ((j + 0.5) / GRID) * (R_MAX - R_MIN); // rRejected
        const yc =
          R_MIN + ((i + 0.5) / GRID) * (R_MAX - R_MIN); // rChosen
        const l = dpoLoss({ rChosen: yc, rRejected: xc, beta });
        if (l > maxL) maxL = l;
        out.push({
          x: PAD + j * cellSize,
          y: H - PAD - (i + 1) * cellSize,
          w: cellSize,
          h: cellSize,
          loss: l,
        });
      }
    }
    return { cells: out, maxL };
  }, [beta]);

  // Color the cell. Lower loss = stronger accent. We use the loss's
  // distance from baseline as the alpha so the "baseline" diagonal
  // becomes a neutral band.
  const lossToColor = (l: number): { color: string; alpha: number } => {
    const dist = l - DPO_BASELINE_LOSS; // <0 = good, >0 = bad
    if (dist <= 0) {
      const t = Math.min(1, -dist / DPO_BASELINE_LOSS);
      return { color: 'rgb(21, 128, 61)', alpha: 0.15 + t * 0.65 };
    }
    const t = Math.min(1, dist / Math.max(0.001, cells.maxL - DPO_BASELINE_LOSS));
    return { color: 'rgb(220, 38, 38)', alpha: 0.15 + t * 0.6 };
  };

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const xRaw = pxToX(px);
    const yRaw = pxToY(py);
    const x = Math.max(R_MIN, Math.min(R_MAX, xRaw));
    const y = Math.max(R_MIN, Math.min(R_MAX, yRaw));
    onPoint(y, x);
  };

  const dotX = xToPx(rRejected);
  const dotY = yToPx(rChosen);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="block h-auto touch-none cursor-crosshair select-none rounded-md border border-border"
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
    >
      {/* Heatmap */}
      {cells.cells.map((c, i) => {
        const { color, alpha } = lossToColor(c.loss);
        return (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={c.w + 0.5}
            height={c.h + 0.5}
            fill={color}
            opacity={alpha}
          />
        );
      })}
      {/* Diagonal (baseline) */}
      <line
        x1={xToPx(R_MIN)}
        y1={yToPx(R_MIN)}
        x2={xToPx(R_MAX)}
        y2={yToPx(R_MAX)}
        className="stroke-border-strong"
        strokeWidth={0.75}
        strokeDasharray="3 3"
      />
      {/* Origin axes */}
      <line
        x1={PAD}
        x2={W - PAD}
        y1={yToPx(0)}
        y2={yToPx(0)}
        className="stroke-border"
        strokeWidth={0.5}
      />
      <line
        x1={xToPx(0)}
        x2={xToPx(0)}
        y1={PAD}
        y2={H - PAD}
        className="stroke-border"
        strokeWidth={0.5}
      />
      {/* Axis labels */}
      <text
        x={W / 2}
        y={H - 6}
        textAnchor="middle"
        fontSize={11}
        fontFamily="monospace"
        className="fill-fg-muted"
      >
        rejected log-ratio  r_l = log π_θ(y_l) − log π_ref(y_l)
      </text>
      <text
        x={10}
        y={H / 2}
        textAnchor="middle"
        fontSize={11}
        fontFamily="monospace"
        className="fill-fg-muted"
        transform={`rotate(-90, 10, ${H / 2})`}
      >
        chosen log-ratio  r_w
      </text>
      {/* Axis ticks */}
      {[-2, -1, 0, 1, 2].map((v) => (
        <g key={v}>
          <text
            x={xToPx(v)}
            y={H - PAD + 14}
            textAnchor="middle"
            fontSize={9}
            fontFamily="monospace"
            className="fill-fg-subtle"
          >
            {v >= 0 ? `+${v}` : v}
          </text>
          <text
            x={PAD - 6}
            y={yToPx(v) + 3}
            textAnchor="end"
            fontSize={9}
            fontFamily="monospace"
            className="fill-fg-subtle"
          >
            {v >= 0 ? `+${v}` : v}
          </text>
        </g>
      ))}
      {/* Draggable point */}
      <circle
        cx={dotX}
        cy={dotY}
        r={9}
        className="fill-accent"
        fillOpacity={0.3}
      />
      <circle cx={dotX} cy={dotY} r={5} className="fill-accent" />
      <circle
        cx={dotX}
        cy={dotY}
        r={5}
        className="stroke-ink"
        strokeWidth={1}
        fill="none"
      />
    </svg>
  );
}
