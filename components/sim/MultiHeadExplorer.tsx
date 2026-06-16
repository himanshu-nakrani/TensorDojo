'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { Slider } from '@/components/sim/primitives/Slider';
import { softmaxRows } from '@/lib/math/softmax';
import { scaledDot } from '@/lib/math/linalg';

export interface MultiHeadExplorerPreset {
  n?: number;
  h?: number;
  dK?: number;
}

const TOKENS = ['cat', 'sat', 'down', 'on', 'the'] as const;

/**
 * 4-token × h-head attention visualizer. For each head, the user
 * sees a small weight heatmap. Per-head Q and K rotation sliders
 * let the reader see how the same input produces different
 * attention patterns under different projections.
 */
export function MultiHeadExplorer({ preset }: { preset?: MultiHeadExplorerPreset }) {
  const [n, setN] = useState(preset?.n ?? 4);
  const [h, setH] = useState(preset?.h ?? 4);
  const [dK, setDK] = useState(preset?.dK ?? 2);

  // Per-head Q and K rotation angles (one pair per head).
  const [qAngles, setQAngles] = useState<number[]>(() =>
    Array.from({ length: 4 }, (_, i) => i * 0.4),
  );
  const [kAngles, setKAngles] = useState<number[]>(() =>
    Array.from({ length: 4 }, (_, i) => Math.PI / 2 - i * 0.3),
  );

  const reset = () => {
    setN(preset?.n ?? 4);
    setH(preset?.h ?? 4);
    setDK(preset?.dK ?? 2);
    setQAngles(Array.from({ length: 4 }, (_, i) => i * 0.4));
    setKAngles(Array.from({ length: 4 }, (_, i) => Math.PI / 2 - i * 0.3));
  };

  // For each head, compute the attention weights.
  const headWeights = useMemo(() => {
    const allWeights: number[][][] = [];
    for (let head = 0; head < h; head += 1) {
      const qa = qAngles[head] ?? 0;
      const ka = kAngles[head] ?? 0;
      const Q = Array.from({ length: n }, (_, i) => [
        Math.cos(qa + i * 0.3),
        Math.sin(qa + i * 0.3),
      ]);
      const K = Array.from({ length: n }, (_, i) => [
        Math.cos(ka + i * 0.5),
        Math.sin(ka + i * 0.5),
      ]);
      const scores: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => scaledDot(Q[i]!, K[j]!, dK)),
      );
      allWeights.push(softmaxRows(scores));
    }
    return allWeights;
  }, [n, h, dK, qAngles, kAngles]);

  return (
    <SimFrame title="Multi-head attention" onReset={reset}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
              Per-head attention weights ({n} tokens × {n} positions)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {headWeights.map((w, head) => (
                <div key={head} className="rounded border border-border p-1.5 bg-bg/30">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-dim font-mono mb-1">head {head + 1}</div>
                  <div
                    className="grid gap-px"
                    style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                  >
                    {w.flatMap((row, i) =>
                      row.map((v, j) => (
                        <div
                          key={`${head}-${i}-${j}`}
                          className="aspect-square rounded-sm"
                          style={{
                            background: `rgb(var(--accent))`,
                            // Round to 4dp to avoid a SSR/CSR float64-repr
                            // mismatch on the opacity attribute.
                            opacity:
                              Math.round(Math.min(1, v * 0.9) * 1e4) / 1e4,
                          }}
                          title={`w[${i}][${j}] = ${v.toFixed(2)}`}
                        />
                      )),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
              Per-head Q rotation (rad)
            </div>
            <div className="space-y-1.5">
              {qAngles.slice(0, h).map((a, head) => (
                <div key={`q${head}`} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-dim w-12">head {head + 1}</span>
                  <Slider
                    value={a}
                    min={0}
                    max={Math.PI * 2}
                    step={0.05}
                    onChange={(v) => {
                      setQAngles((prev) => {
                        const next = prev.slice();
                        next[head] = v;
                        return next;
                      });
                    }}
                    formatValue={(v) => `${(v / Math.PI).toFixed(2)}π`}
                    ariaLabel={`Q angle for head ${head + 1}`}
                    valueMinWidth="4ch"
                  />
                </div>
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2 mt-3">
              Per-head K rotation (rad)
            </div>
            <div className="space-y-1.5">
              {kAngles.slice(0, h).map((a, head) => (
                <div key={`k${head}`} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-dim w-12">head {head + 1}</span>
                  <Slider
                    value={a}
                    min={0}
                    max={Math.PI * 2}
                    step={0.05}
                    onChange={(v) => {
                      setKAngles((prev) => {
                        const next = prev.slice();
                        next[head] = v;
                        return next;
                      });
                    }}
                    formatValue={(v) => `${(v / Math.PI).toFixed(2)}π`}
                    ariaLabel={`K angle for head ${head + 1}`}
                    valueMinWidth="4ch"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-border">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">Sequence length n</div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={n}
              onChange={(e) => setN(parseInt(e.target.value, 10))}
              className="slider w-full"
              style={{ ['--fill' as string]: `${((n - 2) / 4) * 100}%` }}
              aria-label="Sequence length n"
            />
            <div className="text-ink tabular-nums text-right text-[11px]">{n}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">Heads h</div>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={h}
              onChange={(e) => setH(parseInt(e.target.value, 10))}
              className="slider w-full"
              style={{ ['--fill' as string]: `${((h - 1) / 3) * 100}%` }}
              aria-label="Heads h"
            />
            <div className="text-ink tabular-nums text-right text-[11px]">{h}</div>
          </div>
        </div>
      </div>
    </SimFrame>
  );
}
