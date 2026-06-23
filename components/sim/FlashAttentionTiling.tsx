'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Secondary sim for the flash-attention lesson. A grid showing
 * the n×n score matrix. Tiles light up as the flash algorithm
 * sweeps over (Q-block × K-block) pairs, with a running cursor
 * showing the current tile. The lit cells fade slowly so the
 * algorithm's traversal pattern is visible.
 *
 * The grid is just visual — the values are not the actual
 * attention scores. The teaching beat is the *order of work*:
 * never the whole matrix at once, always one B×B tile at a
 * time, in SRAM.
 */

const N = 16; // grid of N×N score cells (visual only — represents an arbitrarily-sized matrix)
const BLOCK_OPTIONS = [2, 4, 8] as const;
type Block = (typeof BLOCK_OPTIONS)[number];

export function FlashAttentionTiling() {
  const [block, setBlock] = useState<Block>(4);
  const [playing, setPlaying] = useState(true);
  const [tileIdx, setTileIdx] = useState(0);

  const nTilesPerSide = Math.ceil(N / block);
  const nTiles = nTilesPerSide * nTilesPerSide;

  // Decay buffer: per-cell "freshness" 0..1, decays over time.
  const freshness = useRef<number[]>(Array.from({ length: N * N }, () => 0));
  const [, force] = useState(0);

  useEffect(() => {
    if (!playing) return;
    let raf: number;
    let last = performance.now();
    const TILE_MS = 220;
    let acc = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;

      // Decay all cells.
      for (let i = 0; i < N * N; i++) {
        freshness.current[i] = Math.max(0, freshness.current[i]! - dt / 1500);
      }

      while (acc > TILE_MS) {
        acc -= TILE_MS;
        // Light up the current tile.
        const idx = tileIdx;
        const ti = Math.floor(idx / nTilesPerSide);
        const tj = idx % nTilesPerSide;
        for (let i = ti * block; i < Math.min(N, (ti + 1) * block); i++) {
          for (let j = tj * block; j < Math.min(N, (tj + 1) * block); j++) {
            freshness.current[i * N + j] = 1;
          }
        }
        setTileIdx((p) => (p + 1) % nTiles);
      }
      force((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, tileIdx, block, nTilesPerSide, nTiles]);

  const reset = () => {
    freshness.current = Array.from({ length: N * N }, () => 0);
    setTileIdx(0);
    setBlock(4);
    setPlaying(true);
    force((f) => (f + 1) % 1_000_000);
  };

  // Current tile coordinates for cursor outline.
  const cursorRow = Math.floor(tileIdx / nTilesPerSide);
  const cursorCol = tileIdx % nTilesPerSide;

  const CELL = 18;
  const W = N * CELL;

  return (
    <SimFrame
      title="Tile-by-tile computation, never the whole matrix"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {BLOCK_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBlock(b);
                  setTileIdx(0);
                  freshness.current = Array.from({ length: N * N }, () => 0);
                }}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  block === b
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                B={b}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            {playing ? 'Pause' : 'Play'}
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
      <div className="flex items-start gap-6">
        <div className="border border-border rounded p-3 bg-surface">
          <svg viewBox={`0 0 ${W} ${W}`} className="block" style={{ width: W, height: W }}>
            {Array.from({ length: N }, (_, i) =>
              Array.from({ length: N }, (_, j) => {
                const f = freshness.current[i * N + j]!;
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={j * CELL}
                    y={i * CELL}
                    width={CELL - 1}
                    height={CELL - 1}
                    fill={`rgb(var(--accent) / ${0.06 + f * 0.7})`}
                    stroke="rgb(var(--border))"
                    strokeWidth={0.5}
                  />
                );
              }),
            )}
            {/* Cursor: outline the current tile. */}
            <rect
              x={cursorCol * block * CELL - 1}
              y={cursorRow * block * CELL - 1}
              width={Math.min(N - cursorCol * block, block) * CELL + 1}
              height={Math.min(N - cursorRow * block, block) * CELL + 1}
              fill="none"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
            />
          </svg>
          <div className="text-[11px] text-dim font-mono text-center mt-2 tabular-nums">
            tile {tileIdx + 1} / {nTiles}
          </div>
        </div>

        <div className="flex-1 text-[11px] text-dim font-mono leading-relaxed space-y-3">
          <p>
            The grid represents the n×n score matrix. Flash never has the
            whole thing in memory. Instead it picks a tile (B×B), loads the
            corresponding Q-block and K-block into SRAM, computes the tile's
            scores + partial softmax + partial output contribution there,
            and writes only the running-output statistics back to HBM. Then
            it moves to the next tile.
          </p>
          <p>
            Tile count is{' '}
            <span className="text-ink tabular-nums">{nTiles}</span>{' '}
            (
            <span className="text-ink tabular-nums">{nTilesPerSide}</span>{' '}
            ×{' '}
            <span className="text-ink tabular-nums">{nTilesPerSide}</span>
            ). With B={block}, each tile holds{' '}
            <span className="text-ink tabular-nums">{block * block}</span>{' '}
            scores at once. Compare to naive, which holds all{' '}
            <span className="text-ink tabular-nums">{N * N}</span> scores at
            once — which doesn't fit in SRAM at real (n=4096+) dimensions.
          </p>
          <p>
            Try B=2 vs B=8 — small B means more tiles to sweep through (more
            HBM round-trips), but a smaller working set. Large B is faster
            per tile but eventually exhausts the SRAM budget. Production
            picks the largest B that fits.
          </p>
        </div>
      </div>
    </SimFrame>
  );
}
