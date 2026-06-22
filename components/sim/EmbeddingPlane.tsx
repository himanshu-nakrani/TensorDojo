'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { nearestNeighbors } from '@/lib/math/linalg';

export interface EmbeddingPlanePreset {
  /** Override the default token list. Each token gets a 2D vector. */
  tokens?: EmbeddingToken[];
  query?: string;
}

export interface EmbeddingToken {
  id: string;
  label: string;
  /** 2D vector. The plane is [-2, 2] in both axes. */
  value: readonly [number, number];
}

/**
 * Hand-placed 2D positions chosen so that semantic analogies roughly
 * work out. king ≈ man + (queen − woman), the verb tenses cluster,
 * animals cluster, etc. These are not real embeddings — they are
 * hand-crafted to make the analogy story readable.
 */
const DEFAULT_TOKENS: EmbeddingToken[] = [
  // People
  { id: 'king', label: 'king', value: [0.7, 0.4] },
  { id: 'queen', label: 'queen', value: [0.6, 1.0] },
  { id: 'man', label: 'man', value: [0.0, 0.4] },
  { id: 'woman', label: 'woman', value: [-0.1, 1.0] },
  // Animals
  { id: 'dog', label: 'dog', value: [-1.2, 0.0] },
  { id: 'cat', label: 'cat', value: [-1.3, -0.3] },
  { id: 'lion', label: 'lion', value: [-1.5, 0.4] },
  { id: 'tiger', label: 'tiger', value: [-1.6, 0.7] },
  // Verbs
  { id: 'walk', label: 'walk', value: [1.2, -0.6] },
  { id: 'walked', label: 'walked', value: [1.4, -0.4] },
  { id: 'run', label: 'run', value: [1.3, -0.9] },
  { id: 'ran', label: 'ran', value: [1.5, -0.7] },
  { id: 'jump', label: 'jump', value: [0.9, -1.0] },
  { id: 'jumped', label: 'jumped', value: [1.1, -0.8] },
  // Adjectives
  { id: 'big', label: 'big', value: [0.3, -0.3] },
  { id: 'small', label: 'small', value: [0.2, 0.1] },
  { id: 'fast', label: 'fast', value: [0.5, -0.7] },
  { id: 'slow', label: 'slow', value: [0.4, -0.4] },
  // Nouns
  { id: 'house', label: 'house', value: [-0.5, -0.3] },
  { id: 'car', label: 'car', value: [-0.6, -0.8] },
  { id: 'tree', label: 'tree', value: [-0.4, 0.3] },
  { id: 'flower', label: 'flower', value: [-0.5, 0.7] },
  { id: 'sun', label: 'sun', value: [0.0, -0.9] },
  { id: 'moon', label: 'moon', value: [0.1, -0.6] },
  { id: 'water', label: 'water', value: [0.3, 0.6] },
  { id: 'fire', label: 'fire', value: [0.2, 0.8] },
  { id: 'king_alt', label: 'king₂', value: [0.65, 0.45] },
  { id: 'queen_alt', label: 'queen₂', value: [0.55, 0.95] },
  { id: 'king_alt2', label: 'king₃', value: [0.75, 0.42] },
  { id: 'queen_alt2', label: 'queen₃', value: [0.65, 1.02] },
];

function findToken(label: string, tokens: EmbeddingToken[]): EmbeddingToken | undefined {
  const lower = label.toLowerCase().trim();
  return tokens.find((t) => t.label.toLowerCase() === lower);
}

/** A 2D embedding plane with a few interactive affordances. */
export function EmbeddingPlane({ preset }: { preset?: EmbeddingPlanePreset }) {
  const tokens = preset?.tokens ?? DEFAULT_TOKENS;
  const [query, setQuery] = useState<string>(preset?.query ?? 'king');
  const [analogy, setAnalogy] = useState<{ a: string; b: string; c: string }>(
    { a: 'king', b: 'man', c: 'woman' },
  );
  const [showAnalogy, setShowAnalogy] = useState(false);

  const queryToken = useMemo(() => findToken(query, tokens), [query, tokens]);
  const nn = useMemo(() => {
    if (!queryToken) return [];
    return nearestNeighbors(
      queryToken.value,
      tokens.filter((t) => t.id !== queryToken.id).map((t) => t.value),
      5,
    );
  }, [queryToken, tokens]);
  const nnTokens = nn.map((i) => {
    const t = tokens.filter((x) => x.id !== queryToken!.id)[i];
    return t;
  });

  // Analogy highlight: render a + (c - b) and emphasize the result.
  const analogyHit = useMemo(() => {
    const a = findToken(analogy.a, tokens);
    const b = findToken(analogy.b, tokens);
    const c = findToken(analogy.c, tokens);
    if (!a || !b || !c) return null;
    const target: [number, number] = [
      a.value[0] + c.value[0] - b.value[0],
      a.value[1] + c.value[1] - b.value[1],
    ];
    // Find the nearest existing token to that point.
    const nearestIdx = nearestNeighbors(
      target,
      tokens.map((t) => t.value),
      1,
    )[0];
    if (nearestIdx === undefined) return null;
    return { a, b, c, target, nearest: tokens[nearestIdx] };
  }, [analogy, tokens]);

  const reset = () => {
    setQuery(preset?.query ?? 'king');
    setAnalogy({ a: 'king', b: 'man', c: 'woman' });
    setShowAnalogy(false);
  };

  return (
    <SimFrame
      title="Embedding plane"
      headerAction={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAnalogy((s) => !s)}
            className={clsx(
              'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
              showAnalogy
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink',
            )}
            aria-pressed={showAnalogy}
          >
            Show analogy
          </button>
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
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6">
        <div>
          <svg
            viewBox="-2.4 -2.4 4.8 4.8"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto bg-bg/40 rounded"
            role="img"
            aria-label="2D embedding plane with hand-placed token vectors"
          >
            {/* Axes */}
            <line x1={-2.2} y1={0} x2={2.2} y2={0} className="text-border" stroke="currentColor" strokeWidth={0.02} vectorEffect="non-scaling-stroke" />
            <line x1={0} y1={-2.2} x2={0} y2={2.2} className="text-border" stroke="currentColor" strokeWidth={0.02} vectorEffect="non-scaling-stroke" />

            {/* Analogy line: a + (c - b) → target */}
            {showAnalogy && analogyHit && (
              <g pointerEvents="none">
                {/* b → c */}
                <line
                  x1={analogyHit.b.value[0]}
                  y1={-analogyHit.b.value[1]}
                  x2={analogyHit.c.value[0]}
                  y2={-analogyHit.c.value[1]}
                  className="text-muted"
                  stroke="currentColor"
                  strokeWidth={0.04}
                  strokeDasharray="0.1 0.05"
                  vectorEffect="non-scaling-stroke"
                />
                {/* a → a + (c - b) */}
                <line
                  x1={analogyHit.a.value[0]}
                  y1={-analogyHit.a.value[1]}
                  x2={analogyHit.target[0]}
                  y2={-analogyHit.target[1]}
                  className="text-accent"
                  stroke="currentColor"
                  strokeWidth={0.04}
                  vectorEffect="non-scaling-stroke"
                />
                {/* highlight the nearest token */}
                {analogyHit.nearest && (
                  <circle
                    cx={analogyHit.nearest.value[0]}
                    cy={-analogyHit.nearest.value[1]}
                    r={0.18}
                    className="fill-accent"
                    opacity={0.3}
                  />
                )}
              </g>
            )}

            {/* Tokens */}
            {tokens.map((t) => {
              const isQuery = t.id === queryToken?.id;
              return (
                <g key={t.id} className="font-mono">
                  <circle
                    cx={t.value[0]}
                    cy={-t.value[1]}
                    r={isQuery ? 0.1 : 0.06}
                    className={clsx(
                      'transition-all duration-150',
                      isQuery ? 'fill-accent' : 'fill-ink/60',
                    )}
                  />
                  <text
                    x={t.value[0] + 0.12}
                    y={-t.value[1] + 0.04}
                    className={clsx(isQuery ? 'fill-accent' : 'fill-ink/80')}
                    fontSize={0.14}
                    style={{ fontSize: 11 }}
                  >
                    {t.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <label className="block">
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
                Find nearest to
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="number-input font-mono w-full"
                aria-label="Token to find nearest neighbors of"
              />
            </label>
            {queryToken ? (
              <ul className="mt-2 space-y-0.5">
                {nnTokens.map((t) => (
                  <li key={t!.id} className="text-ink flex items-baseline gap-2">
                    <span className="text-muted">·</span>
                    <span>{t!.label}</span>
                    <span className="text-dim tabular-nums">@ ({t!.value[0].toFixed(2)}, {t!.value[1].toFixed(2)})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-dim">token not in vocabulary</p>
            )}
          </div>

          {showAnalogy && analogyHit && (
            <div className="pt-3 border-t border-border">
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
                Analogy: {analogyHit.a.label} − {analogyHit.b.label} + {analogyHit.c.label}
              </div>
              {analogyHit.nearest && (
                <p className="text-ink">
                  → <span className="text-accent">{analogyHit.nearest.label}</span>
                  <span className="text-dim tabular-nums"> @ ({analogyHit.target[0].toFixed(2)}, {analogyHit.target[1].toFixed(2)})</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </SimFrame>
  );
}
