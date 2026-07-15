/**
 * Gradient descent on a toy 2D loss landscape.
 *
 * The lesson is *concept-level*: no backprop, no chain rule, no
 * training loop. Just: from any point on a 2D loss surface, the
 * gradient points uphill, the negative gradient points downhill,
 * and gradient descent walks the surface downhill in steps of
 * size proportional to the learning rate η.
 *
 * The toy landscape is a fixed two-parameter function — a
 * 2D Gaussian-bump with a valley — so the gradient has a
 * single minimum and at least one saddle/valley feature the
 * reader can watch the descent interact with.
 *
 * Pedagogical coverage:
 * - gradient direction is correct (verified analytically)
 * - one small step reduces the loss for small η
 * - too-large η causes oscillation or divergence
 * - too-small η converges very slowly
 */

export type Point = readonly [number, number];

export interface GradientDescentStep {
  /** New point after taking a step from `from` of size η. */
  next: Point;
  /** Loss at `next`. */
  loss: number;
  /** Whether this step is judged divergent (loss > 10× the loss at the previous point). */
  diverged: boolean;
}

// ---------------------------------------------------------------------------
// Toy landscape: a single-bump potential with a saddle along x=0.
//
//   L(x, y) = (x² − 1)² + y² / 2 + 0.3·sin(3x)
//
// Properties the lesson exercises:
// - Global minimum at (1, 0): L(1, 0) = 0.
// - Local minimum at (-1, 0): L(-1, 0) = 0 (same height, by symmetry).
// - Saddle along the y-axis: at x=0, L = 1 + y²/2 + 0.3·sin(0) = 1 + y²/2,
//   so x=0 is a *ridge* in y but a *saddle* with respect to x (going
//   to x=±1 lowers the loss).
// - Small oscillations in -0.5 < x < 0.5 from the sin term.
// ---------------------------------------------------------------------------

const TOY_HALF = 0.3;
const TOY_FREQ = 3;

export function loss(p: Point): number {
  const x = p[0];
  const y = p[1];
  return (x * x - 1) * (x * x - 1) + (y * y) / 2 + TOY_HALF * Math.sin(TOY_FREQ * x);
}

/**
 * Gradient of the toy loss. dL/dx = 4x(x²−1) + 0.9·cos(3x).
 * dL/dy = y.
 */
export function gradient(p: Point): Point {
  const x = p[0];
  const y = p[1];
  const dLdx = 4 * x * (x * x - 1) + TOY_HALF * TOY_FREQ * Math.cos(TOY_FREQ * x);
  const dLdy = y;
  return [dLdx, dLdy];
}

/**
 * Take a single gradient-descent step from `from` with learning
 * rate `eta`:
 *   next = from − η · ∇L(from)
 *
 * `diverged` is set when the new loss is more than 10× the loss
 * at `from` (a heuristic the lesson uses to flag a too-large η).
 */
export function step(from: Point, eta: number, prevLoss?: number): GradientDescentStep {
  if (eta < 0 || !Number.isFinite(eta)) {
    throw new Error(`gradientDescent.step: eta must be a non-negative finite number (got ${eta})`);
  }
  const g = gradient(from);
  const next: Point = [from[0] - eta * g[0], from[1] - eta * g[1]];
  const newLoss = loss(next);
  const reference = prevLoss ?? loss(from);
  const diverged = newLoss > 10 * Math.max(reference, 1e-6);
  return { next, loss: newLoss, diverged };
}

/**
 * Iterate `numSteps` gradient-descent steps from `start`. Returns
 * the full trajectory (including `start`). The lesson's
 * centerpiece calls this with `numSteps = 0..200` to show
 * convergence, oscillation, and divergence side-by-side.
 */
export function run(
  start: Point,
  eta: number,
  numSteps: number,
): { trajectory: Point[]; losses: number[]; divergedAt: number | null } {
  if (numSteps < 0 || !Number.isInteger(numSteps)) {
    throw new Error(`gradientDescent.run: numSteps must be a non-negative integer (got ${numSteps})`);
  }
  const trajectory: Point[] = [start];
  const losses: number[] = [loss(start)];
  let current: Point = start;
  let prevLoss = loss(start);
  let divergedAt: number | null = null;
  for (let i = 0; i < numSteps; i += 1) {
    const { next, loss: newLoss, diverged } = step(current, eta, prevLoss);
    trajectory.push(next);
    losses.push(newLoss);
    if (diverged && divergedAt === null) divergedAt = i + 1;
    current = next;
    prevLoss = newLoss;
  }
  return { trajectory, losses, divergedAt };
}
