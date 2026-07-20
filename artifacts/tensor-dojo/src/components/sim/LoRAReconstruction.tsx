

import { useMemo, useState } from 'react';
import { Heatmap } from '@/components/sim/primitives/Heatmap';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  compose,
  paramCount,
  svdLowRankApprox,
  frobeniusError,
} from '@/lib/math/lora';

// ---------------------------------------------------------------------------
// Target delta matrix
// ---------------------------------------------------------------------------

/**
 * Build a visually structured 8×8 weight-delta matrix as a sum of three
 * rank-1 components with descending weights (1.0, 0.6, 0.3).
 *
 * Component 1: top-half × middle-columns block pattern.
 * Component 2: smooth sinusoidal gradient across rows × columns.
 * Component 3: checkerboard / alternating pattern.
 *
 * The result is a genuine rank-3 matrix, so r=3 gives near-exact SVD
 * reconstruction and r<3 reveals progressively more residual.
 */
function makeTargetDelta(): number[][] {
  const N = 8;

  const u1 = [1, 1, 1, 1, 0, 0, 0, 0];
  const v1 = [0, 0, 0, 1, 1, 1, 0, 0];

  const u2 = Array.from({ length: N }, (_, k) => Math.sin((Math.PI * k) / (N - 1)));
  const v2 = Array.from({ length: N }, (_, k) => Math.cos((Math.PI * k) / (N - 1)));

  const u3 = [1, 0, 1, 0, 1, 0, 1, 0];
  const v3 = [0, 1, 0, 1, 0, 1, 0, 1];

  const W: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));

  const components: { u: number[]; v: number[]; w: number }[] = [
    { u: u1, v: v1, w: 1.0 },
    { u: u2, v: v2, w: 0.6 },
    { u: u3, v: v3, w: 0.3 },
  ];

  for (const { u, v, w } of components) {
    for (let i = 0; i < N; i += 1) {
      for (let j = 0; j < N; j += 1) {
        W[i]![j] = (W[i]![j] ?? 0) + w * u[i]! * v[j]!;
      }
    }
  }

  return W;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function HeatmapWithLabel({
  label,
  values,
  cellSize = 40,
}: {
  label: string;
  values: readonly (readonly number[])[];
  cellSize?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono text-center">
        {label}
      </div>
      <Heatmap
        values={values}
        colormap="diverging"
        precision={2}
        cellSize={cellSize}
        showValues={false}
        ariaLabel={label}
      />
    </div>
  );
}

function Stats({
  rank,
  paramsUsed,
  totalParams,
  frobError,
}: {
  rank: number;
  paramsUsed: number;
  totalParams: number;
  frobError: number;
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-mono text-muted pt-2 border-t border-border">
      <span>
        rank{' '}
        <span className="text-ink tabular-nums">{rank}</span>
      </span>
      <span>
        params used{' '}
        <span className="text-ink tabular-nums">{paramsUsed}</span>
        {' / '}
        <span className="tabular-nums">{totalParams}</span>
      </span>
      <span>
        Frobenius error{' '}
        <span className="text-ink tabular-nums">{frobError.toFixed(4)}</span>
      </span>
    </div>
  );
}

const STATIC_TARGET = makeTargetDelta();

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/** Centerpiece sim for lesson 30 — SVD low-rank reconstruction of ΔW. */
export function LoRAReconstruction() {
  const [r, setR] = useState(3);

  const { reconstructed, residual, paramsUsed, frobError } = useMemo(() => {
    const { A, B } = svdLowRankApprox(STATIC_TARGET, r);
    const rec = compose(A, B);
    const res = STATIC_TARGET.map((row, i) => row.map((v, j) => v - rec[i]![j]!));
    return {
      reconstructed: rec,
      residual: res,
      paramsUsed: paramCount(8, 8, r),
      frobError: frobeniusError(STATIC_TARGET, rec),
    };
  }, [r]);

  const reset = () => {
    setR(3);
  };

  return (
    <SimFrame title="LoRA: low-rank reconstruction" onReset={reset}>
      <div className="space-y-6">
      {/* Rank slider */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            rank r
          </span>
          <span className="text-ink font-mono text-sm tabular-nums">{r}</span>
        </div>
        <Slider
          value={r}
          min={1}
          max={8}
          step={1}
          onChange={(v) => setR(Math.round(v))}
          formatValue={(v) => String(Math.round(v))}
          ariaLabel="Rank r for low-rank approximation"
          valueMinWidth="3ch"
        />
      </div>

      {/* Three heatmaps side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
        <HeatmapWithLabel label="Target ΔW" values={STATIC_TARGET} />
        <HeatmapWithLabel
          label={`Reconstruction A·B (rank ${r})`}
          values={reconstructed}
        />
        <HeatmapWithLabel label="Residual ΔW − Â·B̂" values={residual} />
      </div>

      {/* Stats */}
      <Stats
        rank={r}
        paramsUsed={paramsUsed}
        totalParams={64}
        frobError={frobError}
      />

      {/* Caption */}
      <p className="text-[11px] text-muted font-mono leading-relaxed">
        The target ΔW is a rank-3 matrix — a sum of three rank-1 outer products with
        weights 1.0, 0.6, 0.3. Drag the slider to see how adding each extra rank
        captures one more directional pattern. At r=3 the residual is near zero;
        below r=3 it shows the components the reconstruction misses.
        LoRA stores only A (8×r) and B (r×8) instead of the full 8×8 matrix.
      </p>
      </div>
    </SimFrame>
  );
}
