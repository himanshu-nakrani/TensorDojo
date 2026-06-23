'use client';

import { useMemo } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  chinchillaLoss,
  chinchillaOptimalSplit,
} from '@/lib/math/scalinglaws';

/**
 * Secondary sim for the scaling-laws lesson. 2D heatmap of
 * loss as a function of (log N, log D), with the
 * compute-optimal frontier overlaid as a diagonal line in
 * log-log space. Several real-world models are pinned on the
 * grid for orientation.
 *
 * The reader doesn't manipulate anything here — it's a "look at
 * the shape" sim. The point: in log-log space, the loss
 * contours sweep diagonally, and the optimal-compute frontier
 * is itself a straight line.
 */

const N_MIN_LOG = 8; // 1e8 = 100M params
const N_MAX_LOG = 13; // 1e13 = 10T params
const D_MIN_LOG = 9; // 1e9 = 1B tokens
const D_MAX_LOG = 14; // 1e14 = 100T tokens

const GRID_N = 32;
const GRID_D = 32;

const REAL_MODELS = [
  { label: 'GPT-3', N: 175e9, D: 300e9 },
  { label: 'Chinchilla', N: 70e9, D: 1.4e12 },
  { label: 'LLaMA-2 70B', N: 70e9, D: 2e12 },
  { label: 'LLaMA-3 70B', N: 70e9, D: 15e12 },
  { label: 'GPT-2', N: 1.5e9, D: 10e9 },
] as const;

const BUDGETS_FOR_FRONTIER = [1e20, 3e20, 1e21, 3e21, 1e22, 3e22, 1e23, 3e23, 1e24, 3e24, 1e25];

export function ScalingLawTrade() {
  const grid = useMemo(() => {
    const out: Array<Array<{ logN: number; logD: number; loss: number }>> = [];
    for (let i = 0; i < GRID_D; i++) {
      const logD = D_MIN_LOG + (i / (GRID_D - 1)) * (D_MAX_LOG - D_MIN_LOG);
      const row: Array<{ logN: number; logD: number; loss: number }> = [];
      for (let j = 0; j < GRID_N; j++) {
        const logN = N_MIN_LOG + (j / (GRID_N - 1)) * (N_MAX_LOG - N_MIN_LOG);
        row.push({
          logN,
          logD,
          loss: chinchillaLoss(Math.pow(10, logN), Math.pow(10, logD)),
        });
      }
      out.push(row);
    }
    return out;
  }, []);

  const lossMin = useMemo(
    () => Math.min(...grid.flat().map((c) => c.loss)),
    [grid],
  );
  const lossMax = useMemo(
    () => Math.max(...grid.flat().map((c) => c.loss)),
    [grid],
  );

  const frontier = useMemo(
    () =>
      BUDGETS_FOR_FRONTIER.map((C) => {
        const o = chinchillaOptimalSplit(C, { nSteps: 400 });
        return { logN: Math.log10(o.N), logD: Math.log10(o.D), C };
      }),
    [],
  );

  const W = 560;
  const H = 360;
  const PAD_X = 56;
  const PAD_Y = 24;
  const xScale = (logN: number) =>
    PAD_X + ((logN - N_MIN_LOG) / (N_MAX_LOG - N_MIN_LOG)) * (W - PAD_X - 24);
  const yScale = (logD: number) =>
    H - PAD_Y - ((logD - D_MIN_LOG) / (D_MAX_LOG - D_MIN_LOG)) * (H - 2 * PAD_Y);
  const cellW = (W - PAD_X - 24) / GRID_N;
  const cellH = (H - 2 * PAD_Y) / GRID_D;

  return (
    <SimFrame title="Loss surface in (params × tokens)">
      <div className="border border-border rounded bg-surface p-2 mb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
          {/* Heatmap cells */}
          {grid.map((row, i) =>
            row.map((cell, j) => {
              const t = (cell.loss - lossMin) / (lossMax - lossMin);
              // Low loss = accent (good), high loss = ink dim.
              const accentAlpha = (1 - t) * 0.7 + 0.05;
              return (
                <rect
                  key={`${i}-${j}`}
                  x={xScale(cell.logN) - cellW / 2}
                  y={yScale(cell.logD) - cellH / 2}
                  width={cellW}
                  height={cellH}
                  fill={`rgb(var(--accent) / ${accentAlpha})`}
                />
              );
            }),
          )}

          {/* Frontier line */}
          <path
            d={frontier
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.logN)} ${yScale(p.logD)}`)
              .join(' ')}
            fill="none"
            stroke="rgb(var(--accent-hover))"
            strokeWidth={2}
            strokeDasharray="4 3"
          />

          {/* Real-model dots */}
          {REAL_MODELS.map((m) => (
            <g key={m.label}>
              <circle
                cx={xScale(Math.log10(m.N))}
                cy={yScale(Math.log10(m.D))}
                r={4}
                fill="rgb(var(--bg))"
                stroke="rgb(var(--fg))"
                strokeWidth={1.4}
              />
              <text
                x={xScale(Math.log10(m.N)) + 7}
                y={yScale(Math.log10(m.D)) + 3}
                fontSize={9}
                className="fill-ink font-mono"
              >
                {m.label}
              </text>
            </g>
          ))}

          {/* Axes */}
          <line
            x1={PAD_X}
            y1={H - PAD_Y}
            x2={W - 24}
            y2={H - PAD_Y}
            stroke="rgb(var(--border-strong))"
            strokeWidth={0.8}
          />
          <line
            x1={PAD_X}
            y1={PAD_Y}
            x2={PAD_X}
            y2={H - PAD_Y}
            stroke="rgb(var(--border-strong))"
            strokeWidth={0.8}
          />

          {/* X ticks */}
          {[9, 10, 11, 12, 13].map((d) => (
            <g key={`x${d}`}>
              <text
                x={xScale(d)}
                y={H - PAD_Y + 14}
                textAnchor="middle"
                fontSize={9}
                className="fill-dim font-mono"
              >
                1e{d}
              </text>
            </g>
          ))}
          <text
            x={W - 24}
            y={H - PAD_Y + 14}
            textAnchor="end"
            fontSize={9}
            className="fill-dim font-mono"
          >
            N (params)
          </text>

          {/* Y ticks */}
          {[9, 10, 11, 12, 13, 14].map((d) => (
            <g key={`y${d}`}>
              <text
                x={PAD_X - 6}
                y={yScale(d) + 3}
                textAnchor="end"
                fontSize={9}
                className="fill-dim font-mono"
              >
                1e{d}
              </text>
            </g>
          ))}
          <text
            x={PAD_X - 6}
            y={PAD_Y + 4}
            textAnchor="end"
            fontSize={9}
            className="fill-dim font-mono"
          >
            D (tokens)
          </text>

          {/* Legend */}
          <g transform={`translate(${W - 130}, ${PAD_Y - 6})`}>
            <rect
              x={0}
              y={0}
              width={12}
              height={12}
              fill="rgb(var(--accent) / 0.75)"
            />
            <text x={16} y={9} fontSize={9} className="fill-dim font-mono">
              low loss
            </text>
            <rect
              x={0}
              y={16}
              width={12}
              height={12}
              fill="rgb(var(--accent) / 0.05)"
            />
            <text x={16} y={25} fontSize={9} className="fill-dim font-mono">
              high loss
            </text>
            <line
              x1={0}
              y1={36}
              x2={12}
              y2={36}
              stroke="rgb(var(--accent-hover))"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <text x={16} y={39} fontSize={9} className="fill-dim font-mono">
              optimal C
            </text>
          </g>
        </svg>
      </div>

      <p className="text-[11px] text-dim font-mono leading-relaxed">
        Each cell is a (N, D) pair; color is Chinchilla loss. Lower loss is
        always down-right (more of both). The dashed line is the
        compute-optimal frontier: for every budget C, the (N, D) pair that
        minimizes loss at that budget. The line is straight in log-log
        space because the optimal split scales as a power law in C. GPT-3
        and GPT-2 sit visibly above the frontier (parameter-rich, token-
        poor). Chinchilla sits on it. LLaMA-2 and LLaMA-3 sit below (more
        tokens than compute-optimal demands) — a deliberate over-training
        choice that trades training compute for cheaper inference.
      </p>
    </SimFrame>
  );
}
