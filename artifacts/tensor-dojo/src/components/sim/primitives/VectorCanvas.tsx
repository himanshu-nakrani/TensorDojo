

import * as React from 'react';
import {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useMemo,
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
const LABEL_OFF = 5; // radial distance (viewBox units) the label sits beyond a tip
const LABEL_FONT = 10;

interface LabelPos {
  lx: number;
  ly: number;
  anchor: 'start' | 'middle' | 'end';
  width: number;
}

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
  const [focused, setFocused] = useState<string | null>(null);

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

  /**
   * Label placement, de-collided. Each label is pushed radially outward
   * past its own tip (so vectors pointing different ways get well-separated
   * labels), then a greedy top-to-bottom pass nudges any label that would
   * still overlap an already-placed one downward. This keeps clusters of
   * near-parallel vectors (q, c_R, c₁ …) from piling their labels into an
   * unreadable blob.
   */
  const labelLayout = useMemo<Record<string, LabelPos>>(() => {
    const [ox2, oy2] = toScreen(0, 0);
    const raw = vectors.map((v): LabelPos & { id: string } => {
      const [tx, ty] = toScreen(v.value[0], v.value[1]);
      let dx = tx - ox2;
      let dy = ty - oy2;
      const len = Math.hypot(dx, dy);
      if (len < 1e-3) {
        // Zero-length vector: default its label up-and-right of the origin.
        dx = 0.8;
        dy = -0.6;
      } else {
        dx /= len;
        dy /= len;
      }
      const anchor: 'start' | 'middle' | 'end' =
        dx > 0.25 ? 'start' : dx < -0.25 ? 'end' : 'middle';
      const width = Math.max(1, v.label.length) * LABEL_FONT * 0.62;
      return {
        id: v.id,
        lx: tx + dx * LABEL_OFF,
        ly: ty + dy * LABEL_OFF,
        anchor,
        width,
      };
    });
    const gap = LABEL_FONT * 1.05;
    const leftEdge = (l: LabelPos) =>
      l.anchor === 'start'
        ? l.lx
        : l.anchor === 'end'
          ? l.lx - l.width
          : l.lx - l.width / 2;
    const placed: Array<LabelPos & { id: string }> = [];
    for (const l of [...raw].sort((a, b) => a.ly - b.ly)) {
      let ly = l.ly;
      for (const p of placed) {
        const hOverlap =
          leftEdge(l) < leftEdge(p) + p.width && leftEdge(p) < leftEdge(l) + l.width;
        if (hOverlap && Math.abs(ly - p.ly) < gap) {
          ly = Math.max(ly, p.ly + gap);
        }
      }
      placed.push({ ...l, ly });
    }
    const out: Record<string, LabelPos> = {};
    for (const p of placed) {
      out[p.id] = { lx: p.lx, ly: p.ly, anchor: p.anchor, width: p.width };
    }
    return out;
  }, [vectors, toScreen]);

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

  /**
   * Arrow keys nudge the focused tip by 0.05 of the range, Shift × 5
   * for coarse nudges. Clamping is handled by the same path the drag
   * uses (via clamp on the math side below).
   */
  const onKeyDown = (
    id: string,
    v: readonly [number, number],
    e: ReactKeyboardEvent<SVGCircleElement>,
  ) => {
    if (readOnly || !onChange) return;
    const KEYS: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    };
    const dir = KEYS[e.key];
    if (!dir) return;
    e.preventDefault();
    const baseStep = 0.05;
    const mul = e.shiftKey ? 5 : 1;
    const dx = dir[0] * baseStep * (range.x[1] - range.x[0]) * mul;
    const dy = dir[1] * baseStep * (range.y[1] - range.y[0]) * mul;
    const nx = Math.max(range.x[0], Math.min(range.x[1], v[0] + dx));
    const ny = Math.max(range.y[0], Math.min(range.y[1], v[1] + dy));
    onChange(id, [nx, ny]);
  };

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
        const lay =
          labelLayout[v.id] ??
          ({ lx: tx + 4, ly: ty - 4, anchor: 'start', width: 0 } as LabelPos);
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
            {/* Focus ring — visible only when this tip has keyboard
                focus. Rendered as a separate non-interactive ring under
                the hit area so the SVG stroke is genuinely thicker than
                the 1.5px non-scaling stroke we used to apply to the
                hit-target itself (which was invisible against the
                accent-colored tip beneath it). */}
            {focused === v.id && (
              <circle
                cx={tx}
                cy={ty}
                r={5}
                fill="none"
                stroke="rgb(var(--accent-hover))"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
                opacity={0.9}
                pointerEvents="none"
              />
            )}
            {/* Invisible larger hit area for easier targeting. Also the
                keyboard-focusable handle: tab to it, arrow-keys nudge. */}
            <circle
              cx={tx}
              cy={ty}
              r={6}
              fill="transparent"
              className={clsx(
                !readOnly && 'cursor-grab focus:outline-none',
                isDragging && 'cursor-grabbing',
                readOnly && 'cursor-default',
              )}
              onPointerDown={(e) => onPointerDown(v.id, e)}
              onKeyDown={(e) => onKeyDown(v.id, v.value, e)}
              onFocus={() => setFocused(v.id)}
              onBlur={() => setFocused((prev) => (prev === v.id ? null : prev))}
              tabIndex={readOnly ? -1 : 0}
              role={readOnly ? undefined : 'slider'}
              aria-label={`${v.label} vector. Arrow keys nudge; hold Shift for coarse steps.`}
              aria-valuetext={`x ${v.value[0].toFixed(2)}, y ${v.value[1].toFixed(2)}`}
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
              stroke={isDragging ? 'rgb(var(--bg))' : 'transparent'}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {/* Label — drawn with a halo (--cell-halo = page bg) so it
                reads against any background. */}
            <text
              x={lay.lx}
              y={lay.ly}
              textAnchor={lay.anchor}
              dominantBaseline="middle"
              className="fill-ink font-mono"
              fontSize={LABEL_FONT}
              style={{ fontSize: LABEL_FONT, paintOrder: 'stroke' }}
              stroke="rgb(var(--bg-elevated))"
              strokeWidth={3}
              strokeLinejoin="round"
            >
              {v.label}
            </text>
            <text
              x={lay.lx}
              y={lay.ly}
              textAnchor={lay.anchor}
              dominantBaseline="middle"
              className="fill-ink font-mono pointer-events-none"
              fontSize={LABEL_FONT}
            >
              {v.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
