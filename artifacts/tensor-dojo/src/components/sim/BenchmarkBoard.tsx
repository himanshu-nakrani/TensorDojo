

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Secondary sim for the evaluation lesson. A tiny leaderboard
 * across four fictional models on five real benchmarks. Each
 * benchmark has its own weight slider; the composite "best
 * model" reranks live as you change weights.
 *
 * The teaching beat is that "which model is best" is a function
 * of which benchmark you weight. Top models cluster near the
 * ceiling on saturated benchmarks (MMLU, HellaSwag) so they
 * don't discriminate well; harder benchmarks (HumanEval, GSM8K)
 * still separate the field.
 */

const BENCHMARKS = [
  { id: 'mmlu', label: 'MMLU', kind: 'knowledge', saturated: true },
  { id: 'hellaswag', label: 'HellaSwag', kind: 'commonsense', saturated: true },
  { id: 'humaneval', label: 'HumanEval', kind: 'code', saturated: false },
  { id: 'gsm8k', label: 'GSM8K', kind: 'math', saturated: false },
  { id: 'arc', label: 'ARC-C', kind: 'reasoning', saturated: false },
] as const;
type BenchId = (typeof BENCHMARKS)[number]['id'];

// Fictional model scores. Designed so that no single model wins
// every benchmark — the ranking flips based on weighting.
const MODELS: ReadonlyArray<{ name: string; scores: Record<BenchId, number> }> = [
  {
    name: 'Polyglot-7B',
    scores: { mmlu: 0.62, hellaswag: 0.81, humaneval: 0.41, gsm8k: 0.55, arc: 0.66 },
  },
  {
    name: 'Coder-7B',
    scores: { mmlu: 0.58, hellaswag: 0.74, humaneval: 0.72, gsm8k: 0.43, arc: 0.58 },
  },
  {
    name: 'Reasoner-13B',
    scores: { mmlu: 0.69, hellaswag: 0.84, humaneval: 0.52, gsm8k: 0.71, arc: 0.79 },
  },
  {
    name: 'Generalist-70B',
    scores: { mmlu: 0.77, hellaswag: 0.88, humaneval: 0.61, gsm8k: 0.78, arc: 0.82 },
  },
];

export function BenchmarkBoard() {
  const [weights, setWeights] = useState<Record<BenchId, number>>({
    mmlu: 1,
    hellaswag: 1,
    humaneval: 1,
    gsm8k: 1,
    arc: 1,
  });

  const composite = useMemo(() => {
    const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    return MODELS.map((m) => {
      const weighted = BENCHMARKS.reduce(
        (s, b) => s + m.scores[b.id] * weights[b.id],
        0,
      );
      return { name: m.name, score: weighted / totalW };
    }).sort((a, b) => b.score - a.score);
  }, [weights]);

  const reset = () =>
    setWeights({ mmlu: 1, hellaswag: 1, humaneval: 1, gsm8k: 1, arc: 1 });

  return (
    <SimFrame
      title="Whose ranking? A weighted leaderboard"
      onReset={reset}
      headerAction={
        <button
          type="button"
          onClick={reset}
          className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
        >
          Reset weights
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
        {/* Per-benchmark scores */}
        <div className="border border-border rounded p-3 bg-surface">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
            Per-benchmark scores
          </div>
          <div className="overflow-x-auto">
            <table className="font-mono text-[11px] w-full">
              <thead>
                <tr className="text-dim">
                  <th className="text-left pb-1 pr-2">Model</th>
                  {BENCHMARKS.map((b) => (
                    <th key={b.id} className="text-center pb-1 px-1">
                      {b.label}
                      {b.saturated && (
                        <span className="block text-[11px] text-dim opacity-70">
                          saturated
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => (
                  <tr key={m.name}>
                    <td className="text-ink pr-2 py-1">{m.name}</td>
                    {BENCHMARKS.map((b) => (
                      <td key={b.id} className="px-1 py-1 text-center tabular-nums">
                        <span
                          className="inline-block px-1 rounded"
                          style={{
                            backgroundColor: `rgb(var(--accent) / ${m.scores[b.id] * 0.5})`,
                          }}
                        >
                          {(m.scores[b.id] * 100).toFixed(0)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
              Benchmark weights
            </div>
            {BENCHMARKS.map((b) => (
              <label key={b.id} className="block">
                <div className="flex items-baseline justify-between text-[11px] font-mono mb-0.5">
                  <span className="text-dim">{b.label}</span>
                  <span className="text-ink tabular-nums">
                    {weights[b.id].toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.1}
                  value={weights[b.id]}
                  onChange={(e) =>
                    setWeights({ ...weights, [b.id]: Number(e.target.value) })
                  }
                  className="w-full focus-ring"
                  aria-label={`${b.label} weight`}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Composite ranking */}
        <div className="border border-border rounded p-3 bg-surface">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
            Composite ranking (weighted mean)
          </div>
          <div className="space-y-2">
            {composite.map((row, i) => (
              <div
                key={row.name}
                className={clsx(
                  'flex items-center gap-3 rounded p-2 transition-colors',
                  i === 0 ? 'bg-accent-soft' : 'bg-bg-elevated',
                )}
              >
                <span
                  className={clsx(
                    'font-mono text-[14px] tabular-nums w-6 text-center',
                    i === 0 ? 'text-accent font-semibold' : 'text-dim',
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div
                    className={clsx(
                      'font-mono text-[12px]',
                      i === 0 ? 'text-accent' : 'text-ink',
                    )}
                  >
                    {row.name}
                  </div>
                  <div className="h-2 rounded border border-border bg-bg-elevated overflow-hidden mt-1">
                    <div
                      className="h-full bg-accent-soft border-r border-accent/40"
                      style={{ width: `${row.score * 100}%` }}
                    />
                  </div>
                </div>
                <span className="font-mono text-[11px] text-dim tabular-nums w-12 text-right">
                  {(row.score * 100).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Each benchmark measures a different thing — code, math, commonsense,
        knowledge, reasoning. Slide HumanEval up and Polyglot drops; slide
        GSM8K and ARC-C up and Reasoner-13B overtakes Generalist-70B
        despite being smaller. There is no single "best" model;
        leaderboard rank is an artifact of which benchmarks the evaluator
        weights. Saturated benchmarks (MMLU, HellaSwag) where top models
        cluster near the ceiling have lost their power to discriminate,
        which is why the field keeps inventing harder ones (MMLU-Pro,
        GPQA, SWE-bench).
      </p>
    </SimFrame>
  );
}
