'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  VectorCanvas,
  type VectorCanvasVector,
} from '@/components/sim/primitives/VectorCanvas';
import { applyRope, dot, ropeAngle } from '@/lib/math/rope';

/**
 * Centerpiece sim for the RoPE lesson. Shows ONE dimension pair
 * (pair index k, default 0) of Q and K, drawn as draggable 2D
 * vectors. Two sliders set the position of Q (m) and K (n). The
 * sim draws the original vector ghosted, the rotated vector
 * solid, and an arc indicating the rotation angle for that pair.
 *
 * Headline: the dot product of the rotated Q and K depends only
 * on m - n. Drag the two position sliders together and watch the
 * dot product stay put; drag them apart and watch it change.
 *
 * The lesson uses d = 8 so the higher pair indices have a feel
 * (frequency decays geometrically, just like sinusoidal PE).
 */

const D = 8;
const N_PAIRS = D / 2;
const POS_MIN = 0;
const POS_MAX = 32;

const Q_INIT_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1.0, 0.4],
  [0.3, -0.5],
  [0.6, 0.2],
  [-0.3, 0.7],
];
const K_INIT_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0.8, -0.2],
  [-0.5, 0.4],
  [0.2, 0.7],
  [0.5, -0.3],
];

function makeVec(pairs: ReadonlyArray<readonly [number, number]>): number[] {
  return pairs.flatMap((p) => [p[0], p[1]]);
}

export function RoPERotator() {
  const [pairIdx, setPairIdx] = useState(0);
  const [qPairs, setQPairs] = useState(Q_INIT_PAIRS);
  const [kPairs, setKPairs] = useState(K_INIT_PAIRS);
  const [posQ, setPosQ] = useState(3);
  const [posK, setPosK] = useState(0);

  const qVec = makeVec(qPairs);
  const kVec = makeVec(kPairs);
  const qRot = applyRope(qVec, posQ);
  const kRot = applyRope(kVec, posK);

  // Pull out the visualised pair (raw and rotated).
  const qPair = qPairs[pairIdx]!;
  const kPair = kPairs[pairIdx]!;
  const qRotPair: [number, number] = [qRot[2 * pairIdx]!, qRot[2 * pairIdx + 1]!];
  const kRotPair: [number, number] = [kRot[2 * pairIdx]!, kRot[2 * pairIdx + 1]!];

  const thetaQ = ropeAngle(posQ, pairIdx, D);
  const thetaK = ropeAngle(posK, pairIdx, D);

  const dotRaw = dot(qVec, kVec);
  const dotRot = dot(qRot, kRot);

  const reset = () => {
    setQPairs(Q_INIT_PAIRS);
    setKPairs(K_INIT_PAIRS);
    setPosQ(3);
    setPosK(0);
    setPairIdx(0);
  };

  const updatePair = (
    setter: typeof setQPairs,
    pairs: typeof qPairs,
    idx: number,
    next: [number, number],
  ) => {
    const copy = pairs.slice() as Array<readonly [number, number]>;
    copy[idx] = next;
    setter(copy);
  };

  return (
    <SimFrame
      title="RoPE: rotate Q and K by position"
      onReset={reset}
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {Array.from({ length: N_PAIRS }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPairIdx(i)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  pairIdx === i
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                pair {i}
              </button>
            ))}
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
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        <VectorPanel
          label="Q"
          pos={posQ}
          theta={thetaQ}
          rawPair={qPair}
          rotPair={qRotPair}
          onDrag={(next) => updatePair(setQPairs, qPairs, pairIdx, next)}
        />
        <VectorPanel
          label="K"
          pos={posK}
          theta={thetaK}
          rawPair={kPair}
          rotPair={kRotPair}
          onDrag={(next) => updatePair(setKPairs, kPairs, pairIdx, next)}
        />
      </div>

      {/* Position sliders. */}
      <div className="grid grid-cols-2 gap-6 mb-5">
        <PositionSlider label="Position of Q (m)" value={posQ} onChange={setPosQ} />
        <PositionSlider label="Position of K (n)" value={posK} onChange={setPosK} />
      </div>

      {/* Headline readouts. */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border font-mono text-[11px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Unrotated q · k
          </div>
          <div className="text-ink tabular-nums">{dotRaw.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Rotated rope(q, m) · rope(k, n)
          </div>
          <div className="text-accent tabular-nums">{dotRot.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Relative offset m − n
          </div>
          <div className="text-ink tabular-nums">{posQ - posK}</div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Drag the two position sliders together (same offset, different absolute
        positions). The rotated dot product stays exactly the same — it's a
        function of <span className="text-ink">m − n</span> alone. Drag them
        apart and the rotated dot product changes smoothly with offset. That's
        the relative-position property: by construction, not by approximation.
      </p>
    </SimFrame>
  );
}

function VectorPanel({
  label,
  pos,
  theta,
  rawPair,
  rotPair,
  onDrag,
}: {
  label: string;
  pos: number;
  theta: number;
  rawPair: readonly [number, number];
  rotPair: readonly [number, number];
  onDrag: (next: [number, number]) => void;
}) {
  // The vector the user drags is the *raw* pair. The rotated tip
  // is overlaid for visualization only.
  const vectors: VectorCanvasVector[] = [
    { id: `${label}-raw`, label: `${label} (raw)`, value: rawPair },
  ];

  const overlay = (toScreen: (x: number, y: number) => [number, number]) => {
    const [ox, oy] = toScreen(0, 0);
    const [tx, ty] = toScreen(rotPair[0], rotPair[1]);
    const rawMag = Math.hypot(rawPair[0], rawPair[1]);
    // Arc radius in math coords: 30% of the vector magnitude (bounded).
    const arcR = Math.min(0.7, Math.max(0.25, rawMag * 0.35));

    // Sweep flag: rotate counterclockwise when theta > 0, clockwise otherwise.
    const wrappedTheta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const largeArc = wrappedTheta > Math.PI ? 1 : 0;
    // Start of arc: along the raw vector's direction.
    const rawAngle = Math.atan2(rawPair[1], rawPair[0]);
    const arcStart = toScreen(
      arcR * Math.cos(rawAngle),
      arcR * Math.sin(rawAngle),
    );
    const arcEnd = toScreen(
      arcR * Math.cos(rawAngle + wrappedTheta),
      arcR * Math.sin(rawAngle + wrappedTheta),
    );

    // Screen-space radius for the arc path: derived from the same
    // toScreen used for the endpoints, so the arc lies on a circle
    // of radius arcR in math coords.
    const rPx = Math.hypot(arcStart[0] - ox, arcStart[1] - oy);

    return (
      <>
        {/* Ghosted rotated vector. */}
        <line
          x1={ox}
          y1={oy}
          x2={tx}
          y2={ty}
          stroke="rgb(var(--accent) / 0.45)"
          strokeWidth={1.2}
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={tx}
          cy={ty}
          r={2}
          fill="rgb(var(--accent) / 0.6)"
          stroke="rgb(var(--bg))"
          strokeWidth={0.4}
        />
        {/* Rotation arc. */}
        {Math.abs(theta) > 0.01 && rawMag > 0.05 && (
          <path
            d={`M ${arcStart[0]} ${arcStart[1]} A ${rPx} ${rPx} 0 ${largeArc} 0 ${arcEnd[0]} ${arcEnd[1]}`}
            fill="none"
            stroke="rgb(var(--fg) / 0.45)"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </>
    );
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          {label} (pair shown)
        </div>
        <div className="text-[11px] text-dim font-mono tabular-nums">
          pos <span className="text-ink">{pos}</span> · θ{' '}
          <span className="text-ink">{theta.toFixed(2)}</span> rad
        </div>
      </div>
      <div className="border border-border rounded">
        <VectorCanvas
          vectors={vectors}
          range={{ x: [-1.5, 1.5], y: [-1.5, 1.5] }}
          height={240}
          overlay={overlay}
          onChange={(_id, next) => onDrag(next)}
          ariaLabel={`${label} vector. Drag the tip; the ghosted vector is the rotated version at the current position.`}
        />
      </div>
    </div>
  );
}

function PositionSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          {label}
        </span>
        <span className="text-[11px] font-mono tabular-nums text-ink">{value}</span>
      </div>
      <input
        type="range"
        min={POS_MIN}
        max={POS_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full focus-ring"
        aria-label={label}
      />
    </label>
  );
}
