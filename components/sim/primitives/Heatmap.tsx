'use client';

import { useId } from 'react';
import clsx from 'clsx';

export type HeatmapColormap = 'accent' | 'diverging';

interface HeatmapProps {
  /** 2D matrix. rows.length × cols.length. */
  values: readonly (readonly number[])[];
  /** Optional row labels (rendered left of each row). */
  rowLabels?: readonly string[];
  /** Optional column labels (rendered above each column). */
  colLabels?: readonly string[];
  /**
   * 'accent' (default): single-hue teal; cell intensity = |v| / max.
   * 'diverging': teal for positive, muted red for negative, neutral at 0.
   */
  colormap?: HeatmapColormap;
  /** Show the numeric value inside each cell. Default true. */
  showValues?: boolean;
  /** Number of decimal places in cell labels. Default 2. */
  precision?: number;
  /** Optional: highlight one row + column (e.g. to show the dot product). */
  highlight?: { row: number; col: number };
  /** Cell side in pixels. Default 56. */
  cellSize?: number;
  /**
   * Compact mode for inline mini-heatmaps (e.g. 8-dim × 4-token
   * vector previews in the transformer block pipeline). Drops the
   * label gutter when no labels are present, hides in-cell numbers,
   * and tightens the cell border radius. Caller is responsible for
   * sizing with `cellSize` (12-18px works well).
   */
  compact?: boolean;
  ariaLabel?: string;
}

/** Map |v| / max (∈ [0,1]) to a teal fill with CSS variable. */
function accentFill(t: number): string {
  // t in [0, 1] — opacity rises with magnitude.
  const op = Math.max(0.05, Math.min(1, t));
  return `rgba(45, 212, 191, ${op.toFixed(3)})`;
}

/** Diverging: positive teal, negative muted red, 0 transparent. */
function divergingFill(v: number, maxAbs: number): string {
  if (maxAbs === 0) return 'transparent';
  const t = v / maxAbs; // ∈ [-1, 1]
  const intensity = Math.min(1, Math.abs(t) * 0.95 + 0.08);
  if (t > 0) {
    return `rgba(45, 212, 191, ${intensity.toFixed(3)})`;
  }
  if (t < 0) {
    // Muted red — same lightness band as accent, opposite hue.
    return `rgba(248, 113, 113, ${intensity.toFixed(3)})`;
  }
  return 'transparent';
}

export function Heatmap({
  values,
  rowLabels,
  colLabels,
  colormap = 'accent',
  showValues = true,
  precision = 2,
  highlight,
  cellSize = 56,
  compact = false,
  ariaLabel,
}: HeatmapProps) {
  const titleId = useId();
  const rows = values.length;
  const cols = rows > 0 ? values[0]!.length : 0;

  const allValues = values.flat();
  const maxAbs =
    allValues.length > 0
      ? Math.max(...allValues.map((v) => Math.abs(v)))
      : 0;
  const max = Math.max(0.001, ...allValues);

  // Layout: leave room for labels. In compact mode (or when no
  // labels are present) drop the gutter so the heatmap sits flush.
  const wantLabels = !compact && (rowLabels !== undefined || colLabels !== undefined);
  const labelGutter = wantLabels ? 64 : 0;
  const colLabelHeight = colLabels && !compact ? 24 : 0;
  const width = labelGutter + cols * cellSize;
  const height = colLabelHeight + rows * cellSize;
  // In compact mode, hide in-cell numbers (unreadable at small size).
  const drawValues = !compact && showValues;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="block w-full h-auto"
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>
        {ariaLabel ?? `Heatmap with ${rows} rows and ${cols} columns.`}
      </title>

      {/* Column labels */}
      {colLabels &&
        colLabels.map((label, j) => (
          <text
            key={`c${j}`}
            x={labelGutter + j * cellSize + cellSize / 2}
            y={colLabelHeight - 8}
            textAnchor="middle"
            className="fill-muted font-mono"
            fontSize={11}
          >
            {label}
          </text>
        ))}

      {/* Row labels */}
      {rowLabels &&
        rowLabels.map((label, i) => (
          <text
            key={`r${i}`}
            x={labelGutter - 8}
            y={colLabelHeight + i * cellSize + cellSize / 2 + 4}
            textAnchor="end"
            className="fill-muted font-mono"
            fontSize={11}
          >
            {label}
          </text>
        ))}

      {/* Cells */}
      {values.map((row, i) =>
        row.map((v, j) => {
          const x = labelGutter + j * cellSize;
          const y = colLabelHeight + i * cellSize;
          const fill =
            colormap === 'diverging'
              ? divergingFill(v, maxAbs)
              : accentFill(Math.abs(v) / max);
          const isHi = highlight && highlight.row === i && highlight.col === j;
          return (
            <g key={`${i}-${j}`}>
              <rect
                x={x + (compact ? 0 : 1)}
                y={y + (compact ? 0 : 1)}
                width={cellSize - (compact ? 1 : 2)}
                height={cellSize - (compact ? 1 : 2)}
                rx={compact ? 1 : 3}
                fill={fill}
                className={clsx(
                  'transition-all duration-200 ease-out',
                  isHi && 'stroke-accent-hover',
                )}
                stroke={isHi ? '#5EEAD4' : 'transparent'}
                strokeWidth={isHi ? 1.5 : 0}
                vectorEffect="non-scaling-stroke"
              />
              {drawValues && (
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2 + 4}
                  textAnchor="middle"
                  className="fill-ink font-mono pointer-events-none"
                  fontSize={11}
                  style={{ paintOrder: 'stroke' }}
                  stroke="#0B0D10"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                >
                  {v.toFixed(precision)}
                </text>
              )}
              {drawValues && (
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2 + 4}
                  textAnchor="middle"
                  className="fill-ink font-mono pointer-events-none"
                  fontSize={11}
                >
                  {v.toFixed(precision)}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
