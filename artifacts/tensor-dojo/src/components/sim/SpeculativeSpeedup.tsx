

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { speculativeSpeedup } from '@/lib/math/specdecode';

/**
 * Secondary sim for the speculative-decoding lesson. A 2D heatmap
 * of speedup vs (γ, α), for a fixed draft-to-target cost ratio.
 * Toggle the ratio to see how the sweet spot shifts: when draft
 * is nearly free (1:100), larger γ pays off; when draft is costly
 * (1:10 or 1:4), smaller γ is optimal.
 */

const ALPHAS = [0.3, 0.5, 0.7, 0.85, 0.95] as const;
const GAMMAS = [1, 2, 3, 4, 6, 8, 12, 16] as const;
const RATIOS = [
  { label: '1:10 (7B → 70B)', draft: 1, verify: 10 },
  { label: '1:30 (1B → 30B)', draft: 1, verify: 30 },
  { label: '1:100 (n-gram → 70B)', draft: 1, verify: 100 },
] as const;

export function SpeculativeSpeedup() {
  const [ratioIdx, setRatioIdx] = useState(0);

  const { ratio, grid, maxSpeedup } = useMemo(() => {
    const r = RATIOS[ratioIdx]!;
    const g: number[][] = [];
    let max = 0;
    for (const a of ALPHAS) {
      const row: number[] = [];
      for (const gamma of GAMMAS) {
        const s = speculativeSpeedup(a, gamma, r.draft, r.verify);
        row.push(s);
        if (s > max) max = s;
      }
      g.push(row);
    }
    return { ratio: r, grid: g, maxSpeedup: max };
  }, [ratioIdx]);

  const reset = () => setRatioIdx(0);

  // Cell coloring: 1× → ink-faint, max → accent-strong.
  const cellColor = (s: number) => {
    if (s < 1) return 'rgb(var(--negative) / 0.18)';
    const t = (s - 1) / Math.max(0.001, maxSpeedup - 1);
    return `rgb(var(--accent) / ${0.08 + t * 0.65})`;
  };

  return (
    <SimFrame
      title="Speedup heatmap: γ × α"
      headerWrap
      headerAction={
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {RATIOS.map((r, i) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRatioIdx(i)}
                aria-pressed={ratioIdx === i}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  ratioIdx === i
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {r.label}
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
      <div className="border border-border rounded p-3 bg-surface mb-4 overflow-x-auto">
        <table className="font-mono text-[11px] tabular-nums">
          <thead>
            <tr>
              <th className="text-dim text-left pr-3 pb-1 sticky left-0 bg-surface">α \ γ</th>
              {GAMMAS.map((g) => (
                <th key={g} className="text-dim px-3 pb-1 text-center">
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALPHAS.map((a, i) => (
              <tr key={a}>
                <td className="text-dim pr-3 py-1 sticky left-0 bg-surface">{a.toFixed(2)}</td>
                {GAMMAS.map((g, j) => {
                  const s = grid[i]![j]!;
                  return (
                    <td key={g} className="px-1 py-0.5">
                      <div
                        className={clsx(
                          'rounded border border-border text-center py-1',
                          s < 1 ? 'text-[rgb(var(--negative))]' : 'text-ink',
                        )}
                        style={{
                          backgroundColor: cellColor(s),
                          minWidth: 44,
                        }}
                      >
                        {s.toFixed(2)}×
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-dim font-mono leading-relaxed">
        Each cell is the wall-clock speedup over plain decoding for the given
        (α, γ) with draft-to-target cost ratio{' '}
        <span className="text-ink">{ratio.label}</span>. Red cells are
        slowdowns (the draft cost outweighs the gain). The sweet spot moves
        right as draft gets cheaper: at 1:10 the best γ is small (the draft
        is expensive enough that long drafts waste effort); at 1:100 the
        best γ is large (the draft is essentially free, so propose more).
        Real systems usually pick γ=4–8 because higher γ hurts at lower α,
        which is what most natural text looks like.
      </p>
    </SimFrame>
  );
}
