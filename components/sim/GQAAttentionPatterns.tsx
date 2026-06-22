'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { kvHeadFor } from '@/lib/math/gqa';

/**
 * Secondary sim for the GQA lesson. Shows 8 query heads attending
 * to a 6-token sequence. Each head's attention row is a tiny
 * heatmap. As nKvHeads shrinks, query heads within a group are
 * forced to read the same K, so their attention rows homogenize:
 * the *shape* of each group's row is the same (because K is
 * shared), but individual rows still vary in scale because each
 * head has its own Q projection.
 *
 * This is the pedagogical price of GQA: not "rows become
 * identical" (they don't, because Q differs), but "rows within a
 * group can no longer have qualitatively different attention
 * patterns." Production GQA at 8x reduction has been shown to
 * cost <1 perplexity point on most benchmarks.
 */

const N_QUERY_HEADS = 8;
const N_TOKENS = 6;
const D_HEAD = 8;
const PRESETS = [
  { label: 'MHA', nKvHeads: 8 },
  { label: 'GQA-2', nKvHeads: 4 },
  { label: 'GQA-4', nKvHeads: 2 },
  { label: 'MQA', nKvHeads: 1 },
] as const;
type Preset = (typeof PRESETS)[number];
const DEFAULT_PRESET: Preset = PRESETS[2]!; // GQA-4

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

function randomVec(d: number, rng: () => number): number[] {
  return Array.from({ length: d }, () => (rng() - 0.5) * 2);
}

function softmax(xs: readonly number[]): number[] {
  const m = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - m));
  const z = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / z);
}

function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

interface SimState {
  // One query vector per query head.
  q: number[][];
  // One key matrix (N_TOKENS × D_HEAD) per *full* MHA head — we
  // pre-compute the full set, and for GQA/MQA we just index into
  // the kv head a query head's group points to. This makes the
  // sim cheap to update on preset change.
  kFull: number[][][];
}

export function GQAAttentionPatterns() {
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [seed, setSeed] = useState(1);

  const state: SimState = useMemo(() => {
    const rng = mulberry32(seed);
    const q = Array.from({ length: N_QUERY_HEADS }, () => randomVec(D_HEAD, rng));
    const kFull = Array.from({ length: N_QUERY_HEADS }, () =>
      Array.from({ length: N_TOKENS }, () => randomVec(D_HEAD, rng)),
    );
    return { q, kFull };
  }, [seed]);

  // For each query head, find which KV head it reads from, then
  // compute its attention row.
  const rows = useMemo(() => {
    const scaling = 1 / Math.sqrt(D_HEAD);
    return Array.from({ length: N_QUERY_HEADS }, (_, qh) => {
      const kvIdx = kvHeadFor(qh, N_QUERY_HEADS, preset.nKvHeads);
      // The KV head's "K" is the first head-group's K — by
      // convention we pick the lowest query head in that group's
      // assigned K matrix.
      const groupSize = N_QUERY_HEADS / preset.nKvHeads;
      const sourceQueryHead = kvIdx * groupSize;
      const K = state.kFull[sourceQueryHead]!;
      const scores = K.map((kRow) => dot(state.q[qh]!, kRow) * scaling);
      return { qh, kvIdx, weights: softmax(scores) };
    });
  }, [preset, state]);

  const reset = () => {
    setPreset(DEFAULT_PRESET);
    setSeed((s) => s + 1);
  };

  return (
    <SimFrame
      title="Attention patterns across head groups"
      onReset={reset}
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPreset(p)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  preset.label === p.label
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Re-sample
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
      <div className="space-y-1.5">
        {/* Header row: token indices */}
        <div className="grid grid-cols-[60px_24px_repeat(6,1fr)] gap-1 items-center font-mono text-[11px] text-dim">
          <div></div>
          <div></div>
          {Array.from({ length: N_TOKENS }, (_, i) => (
            <div key={i} className="text-center">
              t{i}
            </div>
          ))}
        </div>

        {rows.map(({ qh, kvIdx, weights }) => (
          <div
            key={qh}
            className="grid grid-cols-[60px_24px_repeat(6,1fr)] gap-1 items-center"
          >
            <span className="text-[11px] font-mono text-ink">Q{qh}</span>
            <span className="text-[11px] font-mono text-dim text-right">
              ↘KV{kvIdx}
            </span>
            {weights.map((w, t) => (
              <div
                key={t}
                className="h-5 rounded-sm border border-border"
                style={{
                  backgroundColor: `rgb(var(--accent) / ${Math.max(0.04, w * 0.95)})`,
                }}
                title={`Q${qh} → t${t}: ${w.toFixed(3)}`}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="mt-5 pt-4 border-t border-border text-[11px] text-dim font-mono leading-relaxed">
        Under <span className="text-ink">MHA</span> every query head reads a
        different K, so the rows look qualitatively different. Switch to{' '}
        <span className="text-ink">GQA-2</span>: pairs of query heads now
        share K (the "↘KV" label shows which). The rows within a pair{' '}
        <span className="text-ink">don't go identical</span> — each head has
        its own Q, so the scores still differ — but the *shape* of the
        attention pattern within a group is now constrained: it must come
        from the same K matrix. <span className="text-ink">MQA</span> is the
        extreme: all 8 heads share one K, so every row's shape comes from
        the same pool. This is the structural price; in practice GQA at 4×–8×
        reduction is essentially free in quality, while MQA costs noticeably
        more.
      </p>
    </SimFrame>
  );
}
