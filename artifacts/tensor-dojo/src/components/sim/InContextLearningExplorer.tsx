

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

type Shape = '◆' | '●' | '▲';
type Color = 'red' | 'blue' | 'green';

const SHAPES: Shape[] = ['◆', '●', '▲'];
const COLORS: Color[] = ['red', 'blue', 'green'];
const TRUE_MAP: Record<Shape, Color> = {
  '◆': 'red',
  '●': 'blue',
  '▲': 'green',
};

const COLOR_BAR: Record<Color, string> = {
  red: 'fill-[rgb(220,38,38)]',
  blue: 'fill-[rgb(37,99,235)]',
  green: 'fill-[rgb(22,163,74)]',
};
const COLOR_TEXT: Record<Color, string> = {
  red: 'text-[rgb(220,38,38)] dark:text-[rgb(248,113,113)]',
  blue: 'text-[rgb(37,99,235)] dark:text-[rgb(96,165,250)]',
  green: 'text-[rgb(22,163,74)] dark:text-[rgb(74,222,128)]',
};

/**
 * Toy in-context learner. The "model" has a uniform prior over
 * colors. Each in-context example sharpens the posterior toward
 * the demonstrated mapping. The query shape is fixed (◆) so the
 * user can see the distribution change as shots are added.
 *
 * The math is a hand-tuned Bayesian update — not a real LLM —
 * but the qualitative behavior (uniform → peaked) matches what
 * real few-shot prompting does to a model's logits.
 */
export function InContextLearningExplorer() {
  const [shots, setShots] = useState(0);
  const [noisy, setNoisy] = useState(false);
  const [query, setQuery] = useState<Shape>('◆');

  // Build the in-context examples deterministically.
  const examples = useMemo(() => {
    const all: { shape: Shape; color: Color }[] = SHAPES.map((s) => ({
      shape: s,
      color: TRUE_MAP[s],
    }));
    if (noisy) {
      // Flip the label of the first example. This is the "bad demo" case.
      all[0] = { shape: '◆', color: 'blue' };
    }
    return all.slice(0, shots);
  }, [shots, noisy]);

  const probs = useMemo(() => predict(query, examples), [query, examples]);

  return (
    <SimFrame
      title="In-context learning: shape → color"
      headerWrap
      headerAction={
        <button
          type="button"
          onClick={() => setNoisy((n) => !n)}
          aria-pressed={noisy}
          className={clsx(
            'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
            noisy
              ? 'border-[rgb(var(--negative))] text-[rgb(var(--negative))]'
              : 'border-border text-muted hover:text-ink hover:border-border-strong',
          )}
        >
          Noisy demo
        </button>
      }
    >
      {/* Shots selector */}
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
          number of in-context examples
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setShots(k)}
              aria-pressed={shots === k}
              className={clsx(
                'text-[12px] font-mono px-3 py-1.5 rounded border focus-ring transition-colors',
                shots === k
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-muted hover:text-ink hover:border-border-strong',
              )}
            >
              {k === 0 ? '0-shot' : `${k}-shot`}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt rendering */}
      <div className="rounded-lg border border-border bg-bg/40 p-4 mb-4 text-[13px] font-mono leading-relaxed">
        {examples.length === 0 && (
          <span className="text-fg-subtle italic">
            (no in-context examples)
          </span>
        )}
        {examples.map((ex, i) => {
          const isMislabeled = noisy && i === 0 && ex.color !== TRUE_MAP[ex.shape];
          return (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-ink">
                {ex.shape} → <span className={COLOR_TEXT[ex.color]}>{ex.color}</span>
              </span>
              {isMislabeled && (
                <span className="text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--negative))]">
                  mislabeled
                </span>
              )}
            </div>
          );
        })}
        <div className="mt-2 pt-2 border-t border-border flex items-baseline gap-2">
          <span className="text-ink">
            {query} →{' '}
            <span className="text-fg-subtle italic">?</span>
          </span>
        </div>
      </div>

      {/* Query shape selector */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
          query shape
        </div>
        <div className="flex gap-2">
          {SHAPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              aria-pressed={query === s}
              className={clsx(
                'text-[18px] font-mono px-3 py-1 rounded border focus-ring transition-colors w-12',
                query === s
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-muted hover:text-ink hover:border-border-strong',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Predicted distribution */}
      <div className="rounded-lg border border-border bg-bg/40 p-4">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
          predicted distribution P(color | prompt, {query})
        </div>
        <DistributionBars probs={probs} />
      </div>
    </SimFrame>
  );
}

/**
 * Toy "model": start with uniform prior over colors; for each
 * in-context example that matches the query shape, multiply the
 * matching color's mass by 6 (a sharpening factor). Re-normalize.
 * Examples with a different shape weakly inform the posterior (×1.3
 * on the demonstrated mapping) because they tell the model "this is
 * a shape-to-color task with this kind of vocabulary."
 */
function predict(
  query: Shape,
  examples: readonly { shape: Shape; color: Color }[],
): Record<Color, number> {
  const logits: Record<Color, number> = { red: 0, blue: 0, green: 0 };
  for (const ex of examples) {
    if (ex.shape === query) {
      // Direct demonstration of the right shape — strong update.
      logits[ex.color] += Math.log(6);
    } else {
      // Different shape — light "format-prior" update on its color.
      logits[ex.color] += Math.log(1.3);
    }
  }
  // Softmax.
  let max = -Infinity;
  for (const c of COLORS) if (logits[c] > max) max = logits[c];
  let sum = 0;
  const probs: Record<Color, number> = { red: 0, blue: 0, green: 0 };
  for (const c of COLORS) {
    const e = Math.exp(logits[c] - max);
    probs[c] = e;
    sum += e;
  }
  for (const c of COLORS) probs[c] /= sum;
  return probs;
}

function DistributionBars({ probs }: { probs: Record<Color, number> }) {
  const W = 480;
  const H = 110;
  const PAD = 8;
  const BAR_GAP = 24;
  const n = COLORS.length;
  const barW = (W - PAD * 2 - BAR_GAP * (n - 1)) / n;
  const maxH = H - PAD * 2 - 18;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
        {COLORS.map((c, i) => {
          const x = PAD + i * (barW + BAR_GAP);
          const h = probs[c] * maxH;
          const y = H - PAD - 18 - h;
          return (
            <g key={c}>
              <rect
                x={x}
                y={H - PAD - 18 - maxH}
                width={barW}
                height={maxH}
                className="fill-border"
                fillOpacity={0.3}
              />
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                className={COLOR_BAR[c]}
                fillOpacity={0.85}
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={11}
                fontFamily="monospace"
                className="fill-ink"
              >
                {(probs[c] * 100).toFixed(0)}%
              </text>
              <text
                x={x + barW / 2}
                y={H - 4}
                textAnchor="middle"
                fontSize={11}
                fontFamily="monospace"
                className="fill-fg-muted"
              >
                {c}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
