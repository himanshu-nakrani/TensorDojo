

import { useEffect, useId, useRef, useState } from 'react';
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
  /**
   * Cell side in pixels (upper bound). The Heatmap measures its
   * container and shrinks cells if necessary so the whole grid fits
   * without horizontal overflow; cells never grow past this value.
   * Default 56.
   */
  cellSize?: number;
  /** Lower bound on the auto-shrunk cell size. Default 24 (normal), 10 (compact). */
  minCellSize?: number;
  /**
   * Compact mode for inline mini-heatmaps (e.g. 8-dim × 4-token
   * vector previews in the transformer block pipeline). Drops the
   * label gutter when no labels are present, hides in-cell numbers,
   * and tightens the cell border radius. Caller is responsible for
   * sizing with `cellSize` (12-18px works well).
   */
  compact?: boolean;
  /** If set, fires when the user hovers a cell (row, col), or null on leave. */
  onCellHover?: (cell: { row: number; col: number } | null) => void;
  ariaLabel?: string;
}

/**
 * Map |v| / max (∈ [0,1]) to a teal fill. The fill is the theme accent
 * at varying opacity; opacity is floored at 0.12 so the cell stays
 * visibly darker than the page background in both themes. (On a
 * light bg, a 5% tint of teal disappears entirely into the off-
 * white; the floor prevents that. The visual relationship between
 * low-magnitude and high-magnitude cells is preserved.)
 *
 * Opacities are rounded to 4 decimal places; React's server vs
 * client number-stringification can differ at the float64 boundary
 * (e.g. 0.22180066171300147 vs 0.22180066171300142), which would
 * trip a hydration mismatch on the cell's opacity attribute.
 */
function accentOpacity(t: number): number {
  return round4(Math.max(0.12, Math.min(1, t)));
}

/**
 * Diverging: positive teal, negative red, 0 transparent. The intensity
 * floor (0.15) is the smallest tint that still reads against the
 * background in both themes.
 */
function divergingIntensity(t: number): number {
  if (t === 0) return 0;
  return round4(Math.min(1, Math.abs(t) * 0.9 + 0.15));
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
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
  minCellSize,
  compact = false,
  onCellHover,
  ariaLabel,
}: HeatmapProps) {
  const titleId = useId();
  const rows = values.length;
  const cols = rows > 0 ? values[0]!.length : 0;

  // Ignore non-finite cells (e.g. NEG_INF from causal masking) when
  // computing the colormap's reference scale — otherwise maxAbs = ∞
  // and every finite cell's intensity becomes NaN, which React warns
  // about on the opacity attribute.
  const finiteValues = values.flat().filter((v) => Number.isFinite(v));
  const maxAbs =
    finiteValues.length > 0
      ? Math.max(...finiteValues.map((v) => Math.abs(v)))
      : 0;
  const max = Math.max(0.001, ...finiteValues);

  // Layout: leave room for labels. In compact mode (or when no
  // labels are present) drop the gutter so the heatmap sits flush.
  const wantLabels = !compact && (rowLabels !== undefined || colLabels !== undefined);
  const labelGutter = wantLabels ? 64 : 0;
  const colLabelHeight = colLabels && !compact ? 24 : 0;

  // Container-aware cellSize: measure the rendered width and shrink
  // cells (down to minCellSize) so the grid fits without forcing the
  // SVG to scale-down to illegibility. SSR + first paint use the prop
  // value; the observer kicks in after mount.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === 'number') setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const floor = minCellSize ?? (compact ? 10 : 24);
  const effectiveCellSize =
    containerWidth !== null && cols > 0
      ? Math.max(
          floor,
          Math.min(cellSize, Math.floor((containerWidth - labelGutter) / cols)),
        )
      : cellSize;

  const width = labelGutter + cols * effectiveCellSize;
  const height = colLabelHeight + rows * effectiveCellSize;
  // In compact mode, hide in-cell numbers (unreadable at small size).
  // Also hide numbers when cells get too small in normal mode (~28px
  // is the threshold where the 11px label crowds the cell edges).
  const drawValues = !compact && showValues && effectiveCellSize >= 28;

  return (
    <div ref={containerRef} className="w-full">
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
            x={labelGutter + j * effectiveCellSize + effectiveCellSize / 2}
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
            y={colLabelHeight + i * effectiveCellSize + effectiveCellSize / 2 + 4}
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
          const x = labelGutter + j * effectiveCellSize;
          const y = colLabelHeight + i * effectiveCellSize;
          const isHi = highlight && highlight.row === i && highlight.col === j;
          // Colormap -> fill (theme var) + opacity (computed). Non-finite
          // cells (e.g. NEG_INF in a masked attention matrix) render
          // fully transparent so they don't bleed into the colormap.
          let cellFill: string;
          let cellOpacity: number;
          if (!Number.isFinite(v)) {
            cellFill = 'rgb(var(--accent))';
            cellOpacity = 0;
          } else if (colormap === 'diverging') {
            const t = maxAbs === 0 ? 0 : v / maxAbs;
            const intensity = divergingIntensity(t);
            cellFill = t >= 0 ? 'rgb(var(--accent))' : 'rgb(var(--negative))';
            cellOpacity = intensity;
          } else {
            cellFill = 'rgb(var(--accent))';
            cellOpacity = accentOpacity(Math.abs(v) / max);
          }
          return (
            <g
              key={`${i}-${j}`}
              onMouseEnter={
                onCellHover ? () => onCellHover({ row: i, col: j }) : undefined
              }
              onMouseLeave={onCellHover ? () => onCellHover(null) : undefined}
              style={onCellHover ? { cursor: 'crosshair' } : undefined}
            >
              <rect
                x={x + (compact ? 0 : 1)}
                y={y + (compact ? 0 : 1)}
                width={effectiveCellSize - (compact ? 1 : 2)}
                height={effectiveCellSize - (compact ? 1 : 2)}
                rx={compact ? 1 : 3}
                fill={cellFill}
                opacity={cellOpacity}
                className={clsx(
                  'transition-all duration-200 ease-out',
                  isHi && 'stroke-accent-hover',
                )}
                stroke={isHi ? 'rgb(var(--accent-hover))' : 'transparent'}
                strokeWidth={isHi ? 1.5 : 0}
                vectorEffect="non-scaling-stroke"
              />
              {drawValues && (
                <text
                  x={x + effectiveCellSize / 2}
                  y={y + effectiveCellSize / 2 + 4}
                  textAnchor="middle"
                  className="fill-ink font-mono pointer-events-none"
                  fontSize={11}
                  style={{ paintOrder: 'stroke' }}
                  stroke="rgb(var(--cell-halo))"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                >
                  {Number.isFinite(v) ? v.toFixed(precision) : '−∞'}
                </text>
              )}
              {drawValues && (
                <text
                  x={x + effectiveCellSize / 2}
                  y={y + effectiveCellSize / 2 + 4}
                  textAnchor="middle"
                  className="fill-ink font-mono pointer-events-none"
                  fontSize={11}
                >
                  {Number.isFinite(v) ? v.toFixed(precision) : '−∞'}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
    </div>
  );
}
