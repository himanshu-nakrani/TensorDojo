'use client';

import { useId } from 'react';
import clsx from 'clsx';

interface BarChartProps {
  /** Values to plot. Will be auto-normalized to the largest entry. */
  values: readonly number[];
  /** Index of the bar to highlight with the accent color. */
  highlightIndex?: number;
  /** Labels rendered below each bar (one per value, HTML for crisp text). */
  labels?: readonly string[];
  /** Rendered chart height in pixels. Width follows the container. */
  height?: number;
  /** Accessible summary of the chart, read by screen readers. */
  ariaLabel?: string;
}

export function BarChart({
  values,
  highlightIndex,
  labels,
  height = 220,
  ariaLabel,
}: BarChartProps) {
  const titleId = useId();
  const n = values.length;
  const max = Math.max(0.001, ...values);

  // viewBox is unitless. With preserveAspectRatio="none" the bars stretch
  // with the container, which is fine for a uniform bar chart.
  const slotWidth = n > 0 ? 100 / n : 0;
  const barWidth = slotWidth * 0.62;
  const barOffset = (slotWidth - barWidth) / 2;

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height }}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>
          {ariaLabel ??
            `Bar chart with ${n} bars. Max value ${max.toFixed(3)}.`}
        </title>
        {/* Faint baseline at the chart floor. */}
        <line
          x1={0}
          x2={100}
          y1={100}
          y2={100}
          stroke="currentColor"
          className="text-border"
          strokeWidth={0.2}
          vectorEffect="non-scaling-stroke"
        />
        {values.map((v, i) => {
          const h = (v / max) * 96;
          const y = 100 - h;
          const x = i * slotWidth + barOffset;
          const isHighlight = i === highlightIndex;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 0.05)}
              rx={0.4}
              className={clsx(
                'transition-all duration-200 ease-out',
                isHighlight ? 'fill-accent' : 'fill-border-strong',
              )}
            />
          );
        })}
      </svg>
      {labels && (
        <div
          className="flex mt-2 font-mono text-[11px] text-dim select-none"
          aria-hidden="true"
        >
          {labels.map((l, i) => (
            <span
              key={i}
              className="flex-1 text-center tabular-nums"
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}
