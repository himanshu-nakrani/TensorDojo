'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  VectorCanvas,
  type VectorCanvasVector,
} from '@/components/sim/primitives/VectorCanvas';
import { cosTheta, magnitude, projection, residual } from '@/lib/math/linalg';

export interface ProjectionExplorerPreset {
  a?: readonly [number, number];
  b?: readonly [number, number];
}

const DEFAULT_A: [number, number] = [1.5, 0.5];
const DEFAULT_B: [number, number] = [1.6, 0.2];

function fmt(x: number, digits = 2): string {
  if (Math.abs(x) < Math.pow(10, -digits)) return (0).toFixed(digits);
  return x.toFixed(digits);
}

export function ProjectionExplorer({ preset }: { preset?: ProjectionExplorerPreset }) {
  const [a, setA] = useState<[number, number]>(() => {
    const p = preset?.a;
    return [p?.[0] ?? DEFAULT_A[0], p?.[1] ?? DEFAULT_A[1]];
  });
  const [b, setB] = useState<[number, number]>(() => {
    const p = preset?.b;
    return [p?.[0] ?? DEFAULT_B[0], p?.[1] ?? DEFAULT_B[1]];
  });
  const [showUnit, setShowUnit] = useState(false);

  const proj = useMemo(() => projection(a, b), [a, b]);
  const res = useMemo(() => residual(a, b), [a, b]);
  const projMag = magnitude(proj);
  const resMag = magnitude(res);
  const cos = useMemo(() => cosTheta(a, b), [a, b]);
  const aMag = magnitude(a);
  const bMag = magnitude(b);
  const aUnit = useMemo(() => {
    const m = magnitude(a);
    return m === 0 ? [0, 0] : [a[0] / m, a[1] / m] as const;
  }, [a]);
  const bUnit = useMemo(() => {
    const m = magnitude(b);
    return m === 0 ? [0, 0] : [b[0] / m, b[1] / m] as const;
  }, [b]);

  const vectors: VectorCanvasVector[] = useMemo(
    () => [
      { id: 'a', label: 'a', value: a },
      { id: 'b', label: 'b', value: b },
    ],
    [a, b],
  );

  const setVector = (id: string, value: [number, number]) => {
    if (id === 'a') setA(value);
    else if (id === 'b') setB(value);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Projection Explorer
        </h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowUnit((s) => !s)}
            className={clsx(
              'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border transition-colors',
              showUnit
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink',
            )}
            aria-pressed={showUnit}
          >
            Show unit vectors
          </button>
          <button
            type="button"
            onClick={() => {
              setA([...DEFAULT_A] as [number, number]);
              setB([...DEFAULT_B] as [number, number]);
            }}
            className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
        <div>
          <VectorCanvas
            vectors={vectors}
            onChange={setVector}
            height={340}
            showGrid
            ariaLabel="2D plane with vectors a and b. Drag either tip. Dashed cyan shows the projection of a onto b; dashed red shows the residual."
            overlay={(toScreen) => {
              const [ox, oy] = toScreen(0, 0);
              const [px, py] = toScreen(proj[0]!, proj[1]!);
              const [ax, ay] = toScreen(a[0]!, a[1]!);
              return (
                <g pointerEvents="none">
                  {/* Projection of a onto b (cyan, dashed) */}
                  <line
                    x1={ox}
                    y1={oy}
                    x2={px}
                    y2={py}
                    stroke="rgb(var(--accent))"
                    strokeWidth={1.2}
                    strokeDasharray="3 2"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.85}
                  />
                  {/* Residual: from projection tip to tip of a (red, dashed) */}
                  <line
                    x1={px}
                    y1={py}
                    x2={ax}
                    y2={ay}
                    stroke="rgb(var(--negative))"
                    strokeWidth={1.2}
                    strokeDasharray="3 2"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.85}
                  />
                  {/* Optional ghost unit vectors */}
                  {showUnit && (
                    <g opacity={0.5}>
                      <line
                        x1={ox}
                        y1={oy}
                        x2={toScreen(aUnit[0], aUnit[1])[0]}
                        y2={toScreen(aUnit[0], aUnit[1])[1]}
                        stroke="rgb(var(--fg-muted))"
                        strokeWidth={0.8}
                        strokeDasharray="1 2"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1={ox}
                        y1={oy}
                        x2={toScreen(bUnit[0], bUnit[1])[0]}
                        y2={toScreen(bUnit[0], bUnit[1])[1]}
                        stroke="rgb(var(--fg-muted))"
                        strokeWidth={0.8}
                        strokeDasharray="1 2"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  )}
                </g>
              );
            }}
          />
          {showUnit && (
            <p className="mt-2 text-[11px] text-muted font-mono">
              Dashed grey arrows are the unit-vector (a/‖a‖, b/‖b‖) versions.
              On unit vectors, the dot product equals cos θ.
            </p>
          )}
        </div>

        <div className="md:w-64 space-y-3 font-mono text-[12px] tabular-nums">
          <Readout label="‖a‖" value={fmt(aMag)} />
          <Readout label="‖b‖" value={fmt(bMag)} />
          <Readout label="‖proj_b a‖" value={fmt(projMag)} accent />
          <Readout label="‖residual‖" value={fmt(resMag)} />
          <Readout label="cos θ" value={fmt(cos)} accent />
          <Readout label="a · b" value={fmt(a[0] * b[0] + a[1] * b[1])} />
          <div className="pt-3 border-t border-border text-[10px] text-dim leading-relaxed">
            <div>
              <span className="inline-block w-3 h-px align-middle bg-accent mr-1" />
              cyan dashed = projection of a onto b
            </div>
            <div className="mt-1">
              <span className="inline-block w-3 h-px align-middle bg-red-400 mr-1" />
              red dashed = residual (perpendicular to b)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Readout({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-dim">{label}</span>
      <span className={accent ? 'text-accent' : 'text-ink'}>{value}</span>
    </div>
  );
}
