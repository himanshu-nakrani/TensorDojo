/**
 * Learning-rate schedules.
 *
 *   constant(t, total, peak)        = peak
 *   linearDecay(t, total, peak)     = peak · max(0, 1 − t/total)
 *   cosineDecay(t, total, peak)     = peak · ½(1 + cos(π · t/total))
 *   warmupCosine(t, total, peak,    = warmup-then-cosine, the
 *                  warmup)            modern default
 *
 *   t = current step (0-indexed; "at step t" means before the
 *       t-th update is applied)
 *   total = total number of steps in the schedule
 *   peak = peak learning rate (the maximum value reached)
 *   warmup = number of warmup steps at the start
 *
 * All four return 0 once t >= total.
 */

export type ScheduleKind = 'constant' | 'linear' | 'cosine' | 'warmup-cosine';

/** `total <= 0` is a malformed schedule; we throw. */
function requireValid(total: number, warmup: number, peak: number): void {
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(`schedules: total must be a positive finite number (got ${total})`);
  }
  if (!Number.isFinite(warmup) || warmup < 0) {
    throw new Error(`schedules: warmup must be a non-negative finite number (got ${warmup})`);
  }
  if (!Number.isFinite(peak) || peak < 0) {
    throw new Error(`schedules: peak must be a non-negative finite number (got ${peak})`);
  }
  if (warmup > total) {
    throw new Error(
      `schedules: warmup (${warmup}) cannot exceed total (${total})`,
    );
  }
}

/** Constant: lr(t) = peak for all t in [0, total). */
export function constant(t: number, total: number, peak: number): number {
  if (!Number.isFinite(t) || t < 0) {
    throw new Error(`schedules.constant: t must be a non-negative finite number (got ${t})`);
  }
  requireValid(total, 0, peak);
  if (t >= total) return 0;
  return peak;
}

/** Linear decay: lr(t) = peak · max(0, 1 − t/total). */
export function linearDecay(t: number, total: number, peak: number): number {
  if (!Number.isFinite(t) || t < 0) {
    throw new Error(`schedules.linearDecay: t must be a non-negative finite number (got ${t})`);
  }
  requireValid(total, 0, peak);
  if (t >= total) return 0;
  return peak * Math.max(0, 1 - t / total);
}

/**
 * Cosine decay: lr(t) = η_min + (η_max − η_min) · ½(1 + cos(π · t/total)).
 * Starts at η_max (cos 0 = 1), ends at η_min (cos π = −1 → 0). With
 * η_min = 0 this reduces to the conventional `peak · ½(1 + cos(...))`
 * form; the floor lets modern recipes (warmup+cosine with a small
 * positive minimum, e.g. η_min = 0.1 · η_max) keep a non-zero step
 * size at the end of training.
 */
export function cosineDecay(
  t: number,
  total: number,
  peak: number,
  min: number = 0,
): number {
  if (!Number.isFinite(t) || t < 0) {
    throw new Error(`schedules.cosineDecay: t must be a non-negative finite number (got ${t})`);
  }
  if (!Number.isFinite(min) || min < 0) {
    throw new Error(`schedules.cosineDecay: min must be a non-negative finite number (got ${min})`);
  }
  if (min > peak) {
    throw new Error(
      `schedules.cosineDecay: min (${min}) cannot exceed peak (${peak})`,
    );
  }
  requireValid(total, 0, peak);
  if (t >= total) return 0;
  return min + (peak - min) * 0.5 * (1 + Math.cos((Math.PI * t) / total));
}

/**
 * Warmup + cosine decay: linearly ramp from 0 to peak over the
 * first `warmup` steps, then cosine decay from peak to η_min
 * over the remaining `total - warmup` steps. The peak is
 * reached exactly at t = warmup; from there the cosine ends at
 * η_min at t = total.
 *
 * Special case: warmup === 0 reduces to cosineDecay.
 * Special case: warmup === total makes the warmup the entire
 *   schedule; the cosine phase is a single point (peak at t =
 *   warmup = total − 0 = total, returns 0 at total).
 */
export function warmupCosine(
  t: number,
  total: number,
  peak: number,
  warmup: number,
  min: number = 0,
): number {
  if (!Number.isFinite(t) || t < 0) {
    throw new Error(`schedules.warmupCosine: t must be a non-negative finite number (got ${t})`);
  }
  if (!Number.isFinite(min) || min < 0) {
    throw new Error(`schedules.warmupCosine: min must be a non-negative finite number (got ${min})`);
  }
  if (min > peak) {
    throw new Error(
      `schedules.warmupCosine: min (${min}) cannot exceed peak (${peak})`,
    );
  }
  requireValid(total, warmup, peak);
  if (t >= total) return 0;
  if (t < warmup) {
    // Linear ramp 0 → peak.
    return peak * (t / warmup);
  }
  // Cosine decay peak → η_min over the remaining (total − warmup) steps.
  const remaining = total - warmup;
  const tt = t - warmup; // 0 at start of cosine, (total−warmup) at end
  return min + (peak - min) * 0.5 * (1 + Math.cos((Math.PI * tt) / remaining));
}

/**
 * Sample `numSamples` evenly-spaced values from a schedule and
 * return the (step, lr) pairs. The lesson's centerpiece uses
 * this to plot the schedule curve without re-running the
 * function on every render.
 */
export function sampleSchedule(
  fn: (t: number) => number,
  total: number,
  numSamples: number,
): { steps: number[]; lrs: number[] } {
  if (numSamples <= 0 || !Number.isInteger(numSamples)) {
    throw new Error(
      `schedules.sampleSchedule: numSamples must be a positive integer (got ${numSamples})`,
    );
  }
  const steps: number[] = [];
  const lrs: number[] = [];
  for (let i = 0; i < numSamples; i += 1) {
    const t = (i / (numSamples - 1)) * total;
    steps.push(t);
    lrs.push(fn(t));
  }
  return { steps, lrs };
}
