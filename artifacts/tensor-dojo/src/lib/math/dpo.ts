/**
 * DPO loss helpers.
 *
 * Direct Preference Optimization replaces the RLHF reward-model +
 * PPO stack with one closed-form loss:
 *
 *   L = -log σ(β · [ (logπ_θ(y_w|x) - logπ_ref(y_w|x))
 *                  - (logπ_θ(y_l|x) - logπ_ref(y_l|x)) ])
 *
 * Here we operate on already-summed log-probabilities, since the
 * sim presents per-completion totals. We expose the loss and its
 * gradient w.r.t. the chosen/rejected policy log-ratios for the
 * heatmap and the live trajectory.
 */

const LN_2 = Math.log(2);

/** Numerically stable -log σ(x) = softplus(-x) = log(1 + e^{-x}). */
export function negLogSigmoid(x: number): number {
  if (x >= 0) {
    return Math.log(1 + Math.exp(-x));
  }
  return -x + Math.log(1 + Math.exp(x));
}

export interface DpoInputs {
  /** log π_θ(y_w | x) - log π_ref(y_w | x) — "chosen" log-ratio */
  rChosen: number;
  /** log π_θ(y_l | x) - log π_ref(y_l | x) — "rejected" log-ratio */
  rRejected: number;
  /** KL strength; typical [0.05, 0.5] */
  beta: number;
}

/** Single-example DPO loss. */
export function dpoLoss({ rChosen, rRejected, beta }: DpoInputs): number {
  const logit = beta * (rChosen - rRejected);
  return negLogSigmoid(logit);
}

/** Implicit reward gap r(x, y_w) - r(x, y_l) under DPO's parametrization. */
export function rewardMargin({ rChosen, rRejected, beta }: DpoInputs): number {
  return beta * (rChosen - rRejected);
}

/** The loss at the "no preference yet" point. Useful as a baseline. */
export const DPO_BASELINE_LOSS = LN_2;

/**
 * Gradient of the loss with respect to (rChosen, rRejected).
 * dL/dgap = -σ(-gap) · β where gap = β · (rChosen - rRejected).
 * The two partials are equal in magnitude, opposite in sign.
 */
export function dpoGrad(
  inputs: DpoInputs,
): { dChosen: number; dRejected: number } {
  const gap = rewardMargin(inputs);
  const sigmaNeg = 1 / (1 + Math.exp(gap));
  return {
    dChosen: -inputs.beta * sigmaNeg,
    dRejected: inputs.beta * sigmaNeg,
  };
}
