'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { loadBalance, routeTokens } from '@/lib/math/moe';

/**
 * Centerpiece sim for the MoE lesson. A row of tokens at the
 * top, a row of experts at the bottom. The router (implicit, a
 * 6-line softmax inside `routeTokens`) sends each token to its
 * top-k experts. Lines connect routed tokens to their chosen
 * experts; line opacity reflects the renormalized softmax
 * weight.
 *
 * The visible point is that load balance is *not* automatic.
 * Different random seeds produce wildly different expert
 * utilization; production training adds an aux load-balancing
 * loss to keep this near uniform.
 */

const TOKENS = ['The', 'cat', 'sat', 'on', 'the', 'mat'] as const;
const N_EXPERTS = 8;
const TOPK_OPTIONS = [1, 2, 4] as const;
type TopK = (typeof TOPK_OPTIONS)[number];

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function MoERouter() {
  const [topK, setTopK] = useState<TopK>(2);
  const [seed, setSeed] = useState(7);

  const { routing, balance } = useMemo(() => {
    const rng = mulberry32(seed);
    const logits = TOKENS.map(() =>
      Array.from({ length: N_EXPERTS }, () => (rng() - 0.5) * 6),
    );
    const r = routeTokens(logits, topK);
    const b = loadBalance(r.expertAssignments, N_EXPERTS);
    return { routing: r, balance: b };
  }, [seed, topK]);

  const reset = () => {
    setTopK(2);
    setSeed(7);
  };

  // Geometry.
  const W = 560;
  const H = 240;
  const PAD = 22;
  const tokenY = 30;
  const expertY = H - 36;
  const tokenStride = (W - 2 * PAD) / TOKENS.length;
  const expertStride = (W - 2 * PAD) / N_EXPERTS;
  const tokenCx = (i: number) => PAD + (i + 0.5) * tokenStride;
  const expertCx = (i: number) => PAD + (i + 0.5) * expertStride;

  return (
    <SimFrame
      title="Router: each token, top-k experts"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {TOPK_OPTIONS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTopK(k)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  topK === k
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                top-{k}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Re-route
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
      <div className="border border-border rounded p-2 bg-surface mb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
          {/* Routing lines (drawn first, under the boxes). */}
          {routing.expertAssignments.map((experts, ti) =>
            experts.map((eIdx, kIdx) => {
              const weight = routing.weights[ti]![kIdx]!;
              return (
                <line
                  key={`${ti}-${eIdx}`}
                  x1={tokenCx(ti)}
                  y1={tokenY + 16}
                  x2={expertCx(eIdx)}
                  y2={expertY - 16}
                  stroke="rgb(var(--accent))"
                  strokeWidth={0.6 + weight * 1.8}
                  opacity={0.3 + weight * 0.6}
                />
              );
            }),
          )}

          {/* Tokens */}
          {TOKENS.map((t, i) => (
            <g key={`tok-${i}`}>
              <rect
                x={tokenCx(i) - 28}
                y={tokenY - 16}
                width={56}
                height={28}
                rx={3}
                fill="rgb(var(--bg-elevated))"
                stroke="rgb(var(--accent))"
                strokeWidth={1}
              />
              <text
                x={tokenCx(i)}
                y={tokenY + 4}
                textAnchor="middle"
                fontSize={11}
                className="fill-ink font-mono"
              >
                {t}
              </text>
            </g>
          ))}
          <text
            x={PAD - 4}
            y={tokenY + 4}
            textAnchor="end"
            fontSize={9}
            className="fill-dim font-mono uppercase tracking-[0.2em]"
          >
            tokens
          </text>

          {/* Experts */}
          {Array.from({ length: N_EXPERTS }, (_, i) => {
            const load = balance.perExpertLoad[i]!;
            const maxLoad = Math.max(...balance.perExpertLoad);
            const heat = maxLoad === 0 ? 0 : load / maxLoad;
            return (
              <g key={`e-${i}`}>
                <rect
                  x={expertCx(i) - 26}
                  y={expertY - 16}
                  width={52}
                  height={28}
                  rx={3}
                  fill={`rgb(var(--accent) / ${0.06 + heat * 0.4})`}
                  stroke="rgb(var(--accent))"
                  strokeWidth={1}
                />
                <text
                  x={expertCx(i)}
                  y={expertY + 4}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-ink font-mono"
                >
                  E{i}
                </text>
                <text
                  x={expertCx(i)}
                  y={expertY + 24}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-dim font-mono"
                >
                  {load}
                </text>
              </g>
            );
          })}
          <text
            x={PAD - 4}
            y={expertY + 4}
            textAnchor="end"
            fontSize={9}
            className="fill-dim font-mono uppercase tracking-[0.2em]"
          >
            experts
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border font-mono text-[11px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Active experts per token
          </div>
          <div className="text-accent tabular-nums">
            {topK} / {N_EXPERTS}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Imbalance (max load / mean)
          </div>
          <div
            className={clsx(
              'tabular-nums',
              balance.imbalance > 2
                ? 'text-[rgb(var(--negative))]'
                : 'text-ink',
            )}
          >
            {balance.imbalance.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Idle experts
          </div>
          <div className="text-ink tabular-nums">
            {balance.perExpertLoad.filter((c) => c === 0).length} / {N_EXPERTS}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Each token's color-coded lines lead to the{' '}
        <span className="text-ink">{topK}</span> experts it activates; line
        opacity reflects the renormalized softmax weight. The expert boxes
        heat up with their load count. Hit{' '}
        <span className="text-ink">Re-route</span> to redraw with a new random
        router — most random seeds produce visible imbalance, which is why
        real training adds an aux load-balancing loss to push the imbalance
        number toward 1.0.
      </p>
    </SimFrame>
  );
}
