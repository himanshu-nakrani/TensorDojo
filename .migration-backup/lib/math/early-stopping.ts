/**
 * Early stopping: keep the best model checkpoint by validation
 * loss, with a configurable patience.
 *
 * The lesson's secondary widget uses this to mark the "best
 * step" on each loss curve. The training-end-to-end + early
 * stopping centerpiece threads the validation loss through
 * the same early-stopper to decide when to stop.
 *
 *   - patience: how many consecutive non-improving steps to
 *     tolerate before declaring "stop". 0 = stop on the first
 *     non-improvement (effectively not running at all).
 *   - minDelta: the smallest improvement that counts. Defaults
 *     to 0 — any strict decrease qualifies. Some libraries use
 *     1e-4 to avoid treating floating-point noise as improvement.
 *
 *   best: { loss, step, params } | null
 *     - `loss` is the lowest validation loss seen so far.
 *     - `step` is the step at which it was achieved.
 *     - `params` is an opaque params blob (caller-defined).
 *   badSteps: number of consecutive steps since `best` was set
 *     that did not improve.
 *   stopped: true if `badSteps` has reached `patience`.
 */
export interface EarlyStopper {
  patience: number;
  minDelta: number;
  bestLoss: number | null;
  bestStep: number;
  bestParams: unknown;
  badSteps: number;
  stopped: boolean;
}

export function makeEarlyStopper(
  patience: number,
  minDelta = 0,
): EarlyStopper {
  if (patience < 0) {
    throw new Error(
      `makeEarlyStopper: patience must be non-negative (got ${patience})`,
    );
  }
  if (minDelta < 0) {
    throw new Error(
      `makeEarlyStopper: minDelta must be non-negative (got ${minDelta})`,
    );
  }
  return {
    patience,
    minDelta,
    bestLoss: null,
    bestStep: -1,
    bestParams: null,
    badSteps: 0,
    stopped: false,
  };
}

export interface EarlyStopStep {
  step: number;
  loss: number;
  params: unknown;
  /** True iff this call set a new best (and updated the checkpoint). */
  improved: boolean;
}

/**
 * Observe one (loss, params) pair. Updates the internal state;
 * sets the `stopped` flag if patience is exhausted. Returns a
 * summary so the caller can log the call.
 */
export function observe(
  stopper: EarlyStopper,
  step: number,
  loss: number,
  params: unknown,
): EarlyStopStep {
  if (!Number.isFinite(loss)) {
    // Non-finite losses cannot be compared. Don't update best,
    // but still count as a "bad" step so a string of NaNs
    // eventually stops the run.
    stopper.badSteps += 1;
    if (stopper.badSteps > stopper.patience) stopper.stopped = true;
    return { step, loss, params, improved: false };
  }
  const first = stopper.bestLoss === null;
  const better = first || (stopper.bestLoss as number) - loss > stopper.minDelta;
  if (better) {
    stopper.bestLoss = loss;
    stopper.bestStep = step;
    stopper.bestParams = params;
    stopper.badSteps = 0;
    return { step, loss, params, improved: true };
  }
  stopper.badSteps += 1;
  if (stopper.badSteps > stopper.patience) stopper.stopped = true;
  return { step, loss, params, improved: false };
}

/**
 * Force the stop without another observation. Used when the
 * caller has reached the end of a fixed-length run and wants
 * the early-stopper's verdict.
 */
export function finalize(stopper: EarlyStopper): void {
  if (stopper.badSteps > stopper.patience) stopper.stopped = true;
}
