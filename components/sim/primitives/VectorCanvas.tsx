'use client';

import * as React from 'react';
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import clsx from 'clsx';

export interface VectorCanvasVector {
  id: string;
  label: string;
  /** Tip position in math coordinates. */
  value: readonly [number, number];
}

interface VectorCanvasProps {
  vectors: readonly VectorCanvasVector[];
  /** Math-coordinate bounds. Default [-2, 2] on both axes. */
  range?: { x: [number, number]; y: [number, number] };
  /** Called when a tip is dragged to a new position. */
  onChange?: (id: string, value: [number, number]) => void;
  /** Render the light grid + axes. Default true. */
  showGrid?: boolean;
  /** Disable drag. Default false. */
  readOnly?: boolean;
  /** Rendered height in pixels. */
  height?: number;
  /**
   * Optional overlay: a function that receives `toScreen` and returns
   * additional SVG children to render on top of the plane, between
   * the axes and the vector labels. Use this for projection lines,
   * residual arrows, ghost vectors, etc.
   */
  overlay?: (toScreen: (x: number, y: number) => [number, number]) => ReactNode;
  ariaLabel?: string;
}

const VIEW = 100; // viewBox size (square). viewBox stays 0..100, all math
                  // is in the reader's coordinate system.

/**
 * 2D vector canvas with draggable tips. All vectors share the origin at
 * the math (0, 0). The reader drags the tip circles to change values;
 * arrow lines update in real time.
 *
 * The accent color is reserved for manipulable elements per the design
 * rule, so every tip and arrow line uses it. Labels disambiguate.
 */
export function VectorCanvas({
  vectors,
  range = { x: [-2, 2], y: [-2, 2] },
  onChange,
  showGrid = true,
  readOnly = false,
  height = 320,
  overlay,
  ariaLabel,
}: VectorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const toScreen = useCallback(
    (x: number, y: number): [number, number] => {
      const sx = ((x - range.x[0]) / (range.x[1] - range.x[0])) * VIEW;
      const sy = VIEW - ((y - range.y[0]) / (range.y[1] - range.y[0])) * VIEW;
      return [sx, sy];
    },
    [range],
  );

  const toMath = useCallback(
    (sx: number, sy: number): [number, number] => {
      const x = (sx / VIEW) * (range.x[1] - range.x[0]) + range.x[0];
      const y =
        ((VIEW - sy) / VIEW) * (range.y[1] - range.y[0]) + range.y[0];
      // Clamp to the range.
      return [
        Math.max(range.x[0], Math.min(range.x[1], x)),
        Math.max(range.y[0], Math.min(range.y[1], y)),
      ];
    },
    [range],
  );

  const onPointerDown = (
    id: string,
    e: ReactPointerEvent<SVGCircleElement>,
  ) => {
    if (readOnly || !onChange) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(id);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || !onChange || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW;
    const sy = ((e.clientY - rect.top) / rect.height) * VIEW;
    onChange(dragging, toMath(sx, sy));
  };

  const onPointerUp = () => setDragging(null);

  const [ox, oy] = toScreen(0, 0);
  const titleId = `vc-${vectors.map((v) => v.id).join('-')}`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="w-full block touch-none select-none"
      style={{ height }}
      role="img"
      aria-labelledby={titleId}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <title id={titleId}>
        {ariaLabel ??
          `2D plane with ${vectors.length} vector${vectors.length === 1 ? '' : 's'}.`}
      </title>

      {/* Background */}
      <rect x={0} y={0} width={VIEW} height={VIEW} className="fill-surface" />

      {/* Grid */}
      {showGrid && (
        <g
          className="text-border"
          stroke="currentColor"
          strokeWidth={0.2}
          vectorEffect="non-scaling-stroke"
        >
          {Array.from({ length: 5 }, (_, i) => {
            const x = (i / 4) * VIEW;
            return (
              <line key={`v${i}`} x1={x} y1={0} x2={x} y2={VIEW} />
            );
          })}
          {Array.from({ length: 5 }, (_, i) => {
            const y = (i / 4) * VIEW;
            return (
              <line key={`h${i}`} x1={0} y1={y} x2={VIEW} y2={y} />
            );
          })}
        </g>
      )}

      {/* Axes through origin */}
      {showGrid && (
        <g
          className="text-border-strong"
          stroke="currentColor"
          strokeWidth={0.4}
          vectorEffect="non-scaling-stroke"
        >
          <line x1={ox} y1={0} x2={ox} y2={VIEW} />
          <line x1={0} y1={oy} x2={VIEW} y2={oy} />
        </g>
      )}

      {/* Optional overlay: projection lines, residuals, ghost vectors. */}
      {overlay?.(toScreen)}

      {/* Vectors */}
      {vectors.map((v) => {
        const [tx, ty] = toScreen(v.value[0], v.value[1]);
        const isDragging = dragging === v.id;
        const labelDx = v.value[0] >= 0 ? 3.5 : -3.5;
        const anchor: 'start' | 'end' = v.value[0] >= 0 ? 'start' : 'end';
        return (
          <g key={v.id}>
            {/* Arrow line */}
            <line
              x1={ox}
              y1={oy}
              x2={tx}
              y2={ty}
              className={clsx(
                'transition-all duration-150 ease-out',
                isDragging ? 'stroke-accent-hover' : 'stroke-accent',
              )}
              strokeWidth={isDragging ? 1.8 : 1.2}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
            />
            {/* Arrow head (a small triangle) */}
            <polygon
              points={`${tx},${ty} ${tx - 2.6},${ty - 1.5} ${tx - 2.6},${ty + 1.5}`}
              className={clsx(
                'transition-all duration-150 ease-out',
                isDragging ? 'fill-accent-hover' : 'fill-accent',
              )}
            />
            {/* Invisible larger hit area for easier targeting. */}
            <circle
              cx={tx}
              cy={ty}
              r={6}
              fill="transparent"
              className={clsx(
                !readOnly && 'cursor-grab',
                isDragging && 'cursor-grabbing',
                readOnly && 'cursor-default',
              )}
              onPointerDown={(e) => onPointerDown(v.id, e)}
            />
            {/* Visible tip circle. */}
            <circle
              cx={tx}
              cy={ty}
              r={isDragging ? 3.6 : 2.8}
              className={clsx(
                'transition-all duration-150 ease-out pointer-events-none',
                'fill-accent',
              )}
              stroke={isDragging ? '#0B0D10' : 'transparent'}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {/* Label */}
            <text
              x={tx + labelDx}
              y={ty - 3}
              textAnchor={anchor}
              className="fill-ink font-mono"
              fontSize={11}
              style={{ fontSize: 11, paintOrder: 'stroke' }}
              stroke="#0B0D10"
              strokeWidth={3}
              strokeLinejoin="round"
            >
              {v.label}
            </text>
            <text
              x={tx + labelDx}
              y={ty - 3}
              textAnchor={anchor}
              className="fill-ink font-mono pointer-events-none"
              fontSize={11}
              style={{ fontSize: 11 }}
            >
              {v.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
