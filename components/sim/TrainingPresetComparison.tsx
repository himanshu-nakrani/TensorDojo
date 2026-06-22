'use client';

import { useEffect, useMemo, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  PRESET_CONFIGS,
  defaultInitParams,
  train,
  trainTestSplit,
  syntheticClassification,
  type TrainConfig,
  type TrainResult,
} from '@/lib/math/training';

/**
 * Secondary widget for the training capstone. Three preset
 * configs (default, diverges, no-schedule), each runs to
 * completion, and the three loss curves appear on the same
 * plot for direct comparison.
 */

const COLORS: readonly string[] = [
  'rgb(var(--series-1))',
  'rgb(var(--series-2))',
  'rgb(var(--series-3))',
];

export function TrainingPresetComparison() {
  const [results, setResults] = useState<readonly TrainResult[] | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [seed, setSeed] = useState<number>(0);

  const run = () => {
    setRunning(true);
    setResults(null);
    // Defer so the UI can flip to "running" first.
    setTimeout(() => {
      const split = trainTestSplit(syntheticClassification(seed), 0.4, seed);
      const initParams = defaultInitParams(0);
      const r: TrainResult[] = PRESET_CONFIGS.map((p) => {
        const cfg: TrainConfig = {
          initParams,
          dataset: split.train,
          testSet: split.test,
          ...p.config,
        };
        return train(cfg);
      });
      setResults(r);
      setRunning(false);
    }, 30);
  };

  useEffect(() => {
    // Run on first mount so the widget is informative on
    // first paint, matching the rest of the lesson's
    // "first paint = non-trivial state" rule.
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const width = 420;
  const height = 160;

  return (
    <SimFrame
      title="Three presets, side by side"
      headerAction={
        <button
          type="button"
          onClick={() => {
            setSeed((s) => s + 1);
            setTimeout(run, 0);
          }}
          disabled={running}
          className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors disabled:opacity-40"
        >
          {running ? 'Running…' : 'Re-run'}
        </button>
      }
    >
      <div className="space-y-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto bg-bg/40 rounded"
          aria-label="Three training runs side by side, loss vs step."
        >
          {results &&
            (() => {
              const all = results.flatMap((r) => r.losses);
              const finite = all.filter((v) => Number.isFinite(v) && v < 100);
              if (finite.length === 0) return null;
              const max = Math.max(...finite);
              const min = Math.min(...finite, 0);
              const range = Math.max(max - min, 1e-6);
              return results.map((r, i) => {
                const path = r.losses
                  .map((v, k) => {
                    if (!Number.isFinite(v) || v >= 100) return null;
                    const x =
                      (k / Math.max(1, r.losses.length - 1)) * width;
                    const y =
                      height -
                      ((Math.min(v, max) - min) / range) * height;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .filter(Boolean)
                  .join(' ');
                return (
                  <polyline
                    key={i}
                    points={path}
                    fill="none"
                    stroke={COLORS[i % COLORS.length]!}
                    strokeWidth={1.5}
                    opacity={0.9}
                  />
                );
              });
            })()}
          <line
            x1={0}
            y1={height}
            x2={width}
            y2={height}
            stroke="rgb(var(--border))"
            strokeWidth={1}
          />
        </svg>
        <div className="grid grid-cols-3 gap-3 font-mono text-[11px]">
          {PRESET_CONFIGS.map((p, i) => {
            const r = results?.[i];
            const final: number | null = r ? r.losses[r.losses.length - 1] ?? null : null;
            const testAcc: number | null = r ? r.testAcc[r.testAcc.length - 1] ?? null : null;
            return (
              <div
                key={p.id}
                className="rounded-md border border-border p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    aria-hidden="true"
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
                    {p.label}
                  </span>
                </div>
                <div className="text-ink text-[11px] leading-snug">
                  {p.description}
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-fg-subtle">final loss</span>
                    <span
                      className={
                        r?.diverged
                          ? 'text-[rgb(var(--negative))] tabular-nums'
                          : 'text-ink tabular-nums'
                      }
                    >
                      {final !== null
                        ? Number.isFinite(final)
                          ? final.toFixed(3)
                          : 'NaN'
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-fg-subtle">test acc</span>
                    <span className="text-ink tabular-nums">
                      {testAcc !== null && testAcc !== undefined
                        ? `${(testAcc * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SimFrame>
  );
}
