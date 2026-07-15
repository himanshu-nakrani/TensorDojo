/**
 * Toy 2D loss surfaces for the loss-landscape lesson centerpiece.
 *
 * Each surface is a closed-form scalar function of (x, y) plus an
 * analytic gradient. The lesson visualizes the surface as a
 * heatmap and lets the reader click a starting point; SGD takes
 * steps in the direction of the negative gradient and the trajectory
 * is overlaid on the heatmap.
 *
 * Four named surfaces:
 *
 *   - bowl       : convex paraboloid, one minimum at origin.
 *   - saddle     : x² − y², a saddle at origin (zero gradient,
 *                  not a minimum).
 *   - sharp-min  : narrow steep basin near origin, very flat
 *                  outside; gradients are huge near the minimum
 *                  and tiny far away.
 *   - flat-min   : wide shallow basin, gradients small everywhere
 *                  so SGD takes many small steps to make progress.
 *
 * The bowl and saddle are classroom canon; the sharp/flat pair is
 * the "Keskar et al. 2017" generalization-vs-curvature framing,
 * boiled down to two analytic surfaces a reader can feel.
 */

export type SurfaceId = 'bowl' | 'saddle' | 'sharp-min' | 'flat-min';

export interface Surface {
  id: SurfaceId;
  label: string;
  description: string;
  /** Value of the loss at (x, y). */
  f: (x: number, y: number) => number;
  /** Gradient (∂f/∂x, ∂f/∂y) at (x, y). */
  grad: (x: number, y: number) => [number, number];
  /** Default learning rate for the SGD trajectory. */
  defaultLR: number;
  /** Plot extent: x and y both range over [-extent, +extent]. */
  extent: number;
}

const SURFACES_LIST: readonly Surface[] = [
  {
    id: 'bowl',
    label: 'Bowl',
    description:
      'Convex paraboloid, one global minimum at origin. The shape SGD was designed for.',
    f: (x, y) => x * x + y * y,
    grad: (x, y) => [2 * x, 2 * y],
    defaultLR: 0.15,
    extent: 2,
  },
  {
    id: 'saddle',
    label: 'Saddle',
    description:
      'f(x,y) = x² − y². Zero gradient at the origin, but it is a saddle, not a minimum. SGD passes through and continues downhill in y.',
    f: (x, y) => x * x - y * y,
    grad: (x, y) => [2 * x, -2 * y],
    defaultLR: 0.1,
    extent: 2,
  },
  {
    id: 'sharp-min',
    label: 'Sharp minimum',
    description:
      'A steep, narrow basin near origin. Gradients are huge close to the minimum, so SGD overshoots if the learning rate is too high.',
    // f(x,y) = 12·(x² + y²) − 6·exp(−6·(x²+y²)). The exp term carves
    // a deep narrow well at origin; the quadratic provides a gentle
    // background slope so the rest of the plot is not entirely flat.
    f: (x, y) => {
      const r2 = x * x + y * y;
      return 12 * r2 - 6 * Math.exp(-6 * r2);
    },
    grad: (x, y) => {
      const r2 = x * x + y * y;
      const e = Math.exp(-6 * r2);
      // d/dx of 12 r² = 24 x; d/dx of −6 e^{−6 r²} = 72 x e^{−6 r²}.
      const gx = 24 * x + 72 * x * e;
      const gy = 24 * y + 72 * y * e;
      return [gx, gy];
    },
    defaultLR: 0.015,
    extent: 1.2,
  },
  {
    id: 'flat-min',
    label: 'Flat minimum',
    description:
      'A wide shallow basin. Gradients are small everywhere — SGD makes slow, steady progress toward the broad minimum at origin.',
    // f(x,y) = 1 − exp(−0.6·(x² + y²)). Smooth, bounded, with a
    // single shallow minimum at origin. Gradients top out at ~0.5
    // in magnitude near r ≈ 1 and shrink in both directions from
    // there.
    f: (x, y) => {
      const r2 = x * x + y * y;
      return 1 - Math.exp(-0.6 * r2);
    },
    grad: (x, y) => {
      const r2 = x * x + y * y;
      const c = 1.2 * Math.exp(-0.6 * r2);
      return [c * x, c * y];
    },
    defaultLR: 0.6,
    extent: 2.5,
  },
];

export const SURFACES: Readonly<Record<SurfaceId, Surface>> =
  Object.fromEntries(SURFACES_LIST.map((s) => [s.id, s])) as Readonly<
    Record<SurfaceId, Surface>
  >;

export function listSurfaces(): readonly Surface[] {
  return SURFACES_LIST;
}

/**
 * Run vanilla gradient descent on `surface` from `start` for at
 * most `maxSteps`. Stops early when the gradient norm falls below
 * `gradTol` or a step would land outside the plot extent (clamped).
 * Returns the full path including the starting point.
 */
export function sgdTrajectory(
  surface: Surface,
  start: readonly [number, number],
  lr: number = surface.defaultLR,
  maxSteps: number = 60,
  gradTol: number = 1e-3,
): [number, number][] {
  const path: [number, number][] = [[start[0], start[1]]];
  let [x, y] = start;
  for (let i = 0; i < maxSteps; i++) {
    const [gx, gy] = surface.grad(x, y);
    const gNorm = Math.hypot(gx, gy);
    if (gNorm < gradTol) break;
    x -= lr * gx;
    y -= lr * gy;
    // Clamp to plot extent so we don't fly off-screen on a steep
    // surface with an aggressive learning rate.
    const e = surface.extent;
    x = Math.max(-e, Math.min(e, x));
    y = Math.max(-e, Math.min(e, y));
    path.push([x, y]);
  }
  return path;
}
