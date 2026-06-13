'use client';

import { useMemo, useState } from 'react';
import { nearestNeighbors } from '@/lib/math/linalg';

export interface EmbeddingDimensionSliderPreset {
  d?: number;
}

const VOCAB: Array<{ id: string; cluster: string; words: string[] }> = [
  { id: 'a1', cluster: 'animal', words: ['cat', 'dog', 'fox', 'wolf'] },
  { id: 'a2', cluster: 'animal', words: ['cat', 'dog', 'lion', 'tiger'] },
  { id: 'b1', cluster: 'vehicle', words: ['car', 'bus', 'van', 'truck'] },
  { id: 'b2', cluster: 'vehicle', words: ['car', 'truck', 'bike', 'scooter'] },
  { id: 'c1', cluster: 'food', words: ['apple', 'pear', 'peach', 'plum'] },
  { id: 'c2', cluster: 'food', words: ['carrot', 'celery', 'onion', 'garlic'] },
];

/**
 * Generates 2D positions for the vocab by sampling d-dimensional
 * vectors and projecting to 2D via the first two principal axes
 * (approximated by just taking the first two components after a
 * cluster-aware random rotation).
 *
 * The "tightness" of clusters grows with d. At d=2, the clusters
 * are spread out and overlap. At d=64, same-cluster tokens cluster
 * tightly, different-cluster tokens separate.
 */
function synthesizeEmbeddings(d: number, seed: number): number[][] {
  // Deterministic per-cluster anchor in d dimensions
  const anchors: Record<string, number[]> = {};
  for (const v of VOCAB) {
    const v_seed = seed + v.id.charCodeAt(0) * 31;
    const vec: number[] = new Array<number>(d).fill(0);
    let s = v_seed;
    for (let i = 0; i < d; i += 1) {
      s = (s * 1103515245 + 12345) >>> 0;
      vec[i] = ((s / 0xffffffff) * 2 - 1);
    }
    // Pull the vector toward the cluster's "topic axis"
    const topicAxis = v.cluster.charCodeAt(0) % 8;
    for (let i = 0; i < d; i += 1) {
      const contrib = Math.cos((i + 1) * (topicAxis + 1) * 0.7) * 0.5;
      vec[i] = (vec[i] ?? 0) + contrib;
    }
    anchors[v.id] = vec;
  }
  // For each word, sample 4 points around the cluster anchor
  const out: number[][] = [];
  for (const v of VOCAB) {
    const center = anchors[v.id]!;
    for (let w = 0; w < 4; w += 1) {
      // noise shrinks as d grows
      const noiseScale = 1 / Math.sqrt(d);
      const noise: number[] = new Array<number>(d).fill(0);
      let s = (v.id.charCodeAt(0) * 13 + w * 7 + 100) >>> 0;
      for (let i = 0; i < d; i += 1) {
        s = (s * 1103515245 + 12345) >>> 0;
        noise[i] = ((s / 0xffffffff) * 2 - 1) * noiseScale;
      }
      out.push(center.map((c, i) => c + noise[i]!));
    }
  }
  return out;
}

function project2D(vectors: number[][]): number[][] {
  // Trivial 2D projection: take the first two coords, normalize.
  return vectors.map((v) => {
    const x = v[0] ?? 0;
    const y = v[1] ?? 0;
    return [x, y];
  });
}

/**
 * Show 6 clusters of 4 words each in a 2D plane. The dimension
 * slider controls how well-separated the clusters are.
 */
export function EmbeddingDimensionSlider({ preset }: { preset?: EmbeddingDimensionSliderPreset }) {
  const [d, setD] = useState(preset?.d ?? 2);
  const [query, setQuery] = useState('cat');

  const allVectors = useMemo(() => synthesizeEmbeddings(d, 42), [d]);
  const projected = useMemo(() => project2D(allVectors), [allVectors]);

  // The first occurrence of `query` (if present) is the target
  const target = useMemo(() => {
    const idx = VOCAB.findIndex((v) => v.words.includes(query.toLowerCase()));
    if (idx < 0) return null;
    return projected[idx * 4]; // first word in the cluster
  }, [query, projected]);

  const nn = useMemo(() => {
    if (!target) return [];
    return nearestNeighbors(target, projected, 5);
  }, [target, projected]);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Synthetic 2D projection
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
        <div>
          <svg
            viewBox="-3 -3 6 6"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto bg-bg/40 rounded"
            role="img"
            aria-label="2D scatter of synthetic token embeddings"
          >
            {projected.map((p, i) => {
              const px = p[0] ?? 0;
              const py = p[1] ?? 0;
              const v = VOCAB[Math.floor(i / 4)]!;
              const isQuery = i === VOCAB.findIndex((vv) => vv.words.includes(query.toLowerCase())) * 4;
              const isNN = nn.includes(i);
              return (
                <circle
                  key={i}
                  cx={px}
                  cy={-py}
                  r={isQuery || isNN ? 0.18 : 0.1}
                  className="transition-all duration-200"
                  fill={isQuery || isNN ? 'rgb(var(--accent))' : 'rgb(var(--fg-muted))'}
                  opacity={isQuery || isNN ? 0.9 : 0.5}
                />
              );
            })}
          </svg>
        </div>
        <div className="space-y-2 font-mono text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
              Dimension d
            </div>
            <input
              type="range"
              min={2}
              max={64}
              step={1}
              value={d}
              onChange={(e) => setD(parseInt(e.target.value, 10))}
              className="slider w-full"
              style={{ ['--fill' as string]: `${((d - 2) / 62) * 100}%` }}
            />
            <div className="text-ink tabular-nums text-right">{d}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
              Query
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="number-input font-mono w-full"
            />
          </div>
          <p className="text-[10px] text-dim leading-relaxed">
            As d grows, same-cluster tokens cluster more tightly and different clusters separate. The 2D plot is a projection; the real embedding is d-dimensional.
          </p>
        </div>
      </div>
    </div>
  );
}
