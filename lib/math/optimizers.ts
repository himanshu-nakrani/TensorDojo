/**
 * Optimizer step functions: SGD, SGD-with-momentum, Adam.
 *
 * Each function is pure: (params, gradients, state) → (newParams, newState).
 * No in-place mutation, so the centerpiece can hold a history of
 * states and step through them deterministically.
 *
 * Conventions:
 *   - `params` and `gradients` are parallel arrays of length `n`.
 *   - `state` for SGD-with-momentum is `velocity: number[]` of length `n`.
 *   - `state` for Adam is `{ m: number[]; v: number[]; t: number }`.
 *   - The `step` parameter is the global step count, needed by Adam
 *     for bias correction.
 *
 *   SGD:
 *     θ ← θ − η · g
 *
 *   SGD with momentum (Polyak / "heavy ball"):
 *     v ← β · v + g
 *     θ ← θ − η · v
 *
 *   Adam (Kingma & Ba, 2014):
 *     m ← β₁ · m + (1 − β₁) · g
 *     v ← β₂ · v + (1 − β₂) · g²
 *     m̂ ← m / (1 − β₁^t)
 *     v̂ ← v / (1 − β₂^t)
 *     θ ← θ − η · m̂ / (√v̂ + ε)
 *
 *   Bias correction matters at the start of training when m and v
 *   are near zero and would otherwise bias the early steps small.
 *   We bias-correct both m and v. After many steps the (1 − β^t)
 *   denominators approach 1 and the correction vanishes.
 */

/** Plain SGD: no state. */
export interface SgdState {
  kind: 'sgd';
}

export function sgdStep(
  params: readonly number[],
  grads: readonly number[],
  eta: number,
  _state: SgdState = { kind: 'sgd' },
): { params: number[]; state: SgdState } {
  if (eta < 0 || !Number.isFinite(eta)) {
    throw new Error(`optimizers.sgdStep: eta must be a non-negative finite number (got ${eta})`);
  }
  if (params.length !== grads.length) {
    throw new Error(
      `optimizers.sgdStep: params and grads must have the same length (got ${params.length} vs ${grads.length})`,
    );
  }
  const next = new Array<number>(params.length);
  for (let i = 0; i < params.length; i += 1) {
    next[i] = (params[i] ?? 0) - eta * (grads[i] ?? 0);
  }
  return { params: next, state: { kind: 'sgd' } };
}

/** SGD with momentum (Polyak "heavy ball"). */
export interface MomentumState {
  kind: 'momentum';
  velocity: number[];
}

export function sgdMomentumStep(
  params: readonly number[],
  grads: readonly number[],
  eta: number,
  beta: number,
  state: MomentumState = { kind: 'momentum', velocity: new Array(params.length).fill(0) },
): { params: number[]; state: MomentumState } {
  if (eta < 0 || !Number.isFinite(eta)) {
    throw new Error(
      `optimizers.sgdMomentumStep: eta must be a non-negative finite number (got ${eta})`,
    );
  }
  if (beta < 0 || beta >= 1 || !Number.isFinite(beta)) {
    throw new Error(`optimizers.sgdMomentumStep: beta must be in [0, 1) (got ${beta})`);
  }
  if (params.length !== grads.length) {
    throw new Error(
      `optimizers.sgdMomentumStep: params and grads must have the same length (got ${params.length} vs ${grads.length})`,
    );
  }
  if (state.velocity.length !== params.length) {
    throw new Error(
      `optimizers.sgdMomentumStep: state.velocity length (${state.velocity.length}) must match params (${params.length})`,
    );
  }
  const v = new Array<number>(params.length);
  const next = new Array<number>(params.length);
  for (let i = 0; i < params.length; i += 1) {
    v[i] = beta * (state.velocity[i] ?? 0) + (grads[i] ?? 0);
    next[i] = (params[i] ?? 0) - eta * (v[i] as number);
  }
  return { params: next, state: { kind: 'momentum', velocity: v } };
}

/** Adam. State is the per-parameter running moments plus the step count. */
export interface AdamState {
  kind: 'adam';
  m: number[];
  v: number[];
  /** 1-indexed step count (t=1 on the first call). */
  t: number;
}

export const ADAM_BETA1_DEFAULT = 0.9;
export const ADAM_BETA2_DEFAULT = 0.999;
export const ADAM_EPSILON = 1e-8;

export function adamStep(
  params: readonly number[],
  grads: readonly number[],
  eta: number,
  beta1: number = ADAM_BETA1_DEFAULT,
  beta2: number = ADAM_BETA2_DEFAULT,
  epsilon: number = ADAM_EPSILON,
  state: AdamState = {
    kind: 'adam',
    m: new Array(params.length).fill(0),
    v: new Array(params.length).fill(0),
    t: 0,
  },
): { params: number[]; state: AdamState } {
  if (eta < 0 || !Number.isFinite(eta)) {
    throw new Error(
      `optimizers.adamStep: eta must be a non-negative finite number (got ${eta})`,
    );
  }
  if (beta1 < 0 || beta1 >= 1 || !Number.isFinite(beta1)) {
    throw new Error(`optimizers.adamStep: beta1 must be in [0, 1) (got ${beta1})`);
  }
  if (beta2 < 0 || beta2 >= 1 || !Number.isFinite(beta2)) {
    throw new Error(`optimizers.adamStep: beta2 must be in [0, 1) (got ${beta2})`);
  }
  if (epsilon <= 0 || !Number.isFinite(epsilon)) {
    throw new Error(`optimizers.adamStep: epsilon must be a positive finite number (got ${epsilon})`);
  }
  if (params.length !== grads.length) {
    throw new Error(
      `optimizers.adamStep: params and grads must have the same length (got ${params.length} vs ${grads.length})`,
    );
  }
  if (state.m.length !== params.length || state.v.length !== params.length) {
    throw new Error(
      `optimizers.adamStep: state m/v length must match params (got ${state.m.length} / ${state.v.length} vs ${params.length})`,
    );
  }
  const t = state.t + 1;
  const m = new Array<number>(params.length);
  const v = new Array<number>(params.length);
  const next = new Array<number>(params.length);
  const biasCorr1 = 1 - Math.pow(beta1, t);
  const biasCorr2 = 1 - Math.pow(beta2, t);
  for (let i = 0; i < params.length; i += 1) {
    m[i] = beta1 * (state.m[i] ?? 0) + (1 - beta1) * (grads[i] ?? 0);
    v[i] = beta2 * (state.v[i] ?? 0) + (1 - beta2) * (grads[i] ?? 0) ** 2;
    const mHat = (m[i] as number) / biasCorr1;
    const vHat = (v[i] as number) / biasCorr2;
    // vHat is always > 0 because v[i] >= 0 and biasCorr2 > 0, so the
    // sqrt is well-defined. The + epsilon keeps the step bounded if
    // vHat is extremely small (e.g. when a parameter has received
    // exactly zero gradient for many steps).
    next[i] = (params[i] ?? 0) - eta * (mHat / (Math.sqrt(vHat) + epsilon));
  }
  return { params: next, state: { kind: 'adam', m, v, t } };
}
