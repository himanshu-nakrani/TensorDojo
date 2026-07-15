/**
 * DPO-style preference loss and gradient for lesson 31.
 * Single-triple form; the lesson's sim loops over triples manually.
 *
 * Reference: Rafailov et al., "Direct Preference Optimization" (2023).
 */

import { softmax } from './softmax';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Softmax over an arbitrary-length logits vector. */
export function policySoftmax(logits: readonly number[]): number[] {
  return softmax(logits, 1);
}

/**
 * DPO loss for one preference triple.
 *   loss = -log σ( β · ( log π(y+|x) - log π(y-|x) - log π_ref(y+|x) + log π_ref(y-|x) ) )
 *
 * Because log π(y|x) = logits[y] - logSumExp(logits), the logSumExp terms
 * cancel in the difference, leaving:
 *   z = β · ( logits[y+] - logits[y-] - logitsRef[y+] + logitsRef[y-] )
 *   loss = -log σ(z) = softplus(-z)
 */
export function dpoLoss(
  logits: readonly number[],
  logitsRef: readonly number[],
  preferredIdx: number,
  dispreferredIdx: number,
  beta: number,
): number {
  const z = beta * (
    (logits[preferredIdx] as number) -
    (logits[dispreferredIdx] as number) -
    (logitsRef[preferredIdx] as number) +
    (logitsRef[dispreferredIdx] as number)
  );
  return softplus(-z);
}

/**
 * Gradient of dpoLoss with respect to `logits` (length K).
 * Closed-form via chain rule on σ:
 *   z = β · Δ,  where Δ = logits[y+] - logits[y-] - logitsRef[y+] + logitsRef[y-]
 *   dL/dz = σ(z) - 1
 *   dz/d logits[y+] =  β  →  dL/d logits[y+] = β · (σ(β·Δ) - 1)   (≤ 0)
 *   dz/d logits[y-] = -β  →  dL/d logits[y-] = β · (1 - σ(β·Δ))   (≥ 0)
 *   all other entries = 0
 */
export function dpoGradient(
  logits: readonly number[],
  logitsRef: readonly number[],
  preferredIdx: number,
  dispreferredIdx: number,
  beta: number,
): number[] {
  const delta =
    (logits[preferredIdx] as number) -
    (logits[dispreferredIdx] as number) -
    (logitsRef[preferredIdx] as number) +
    (logitsRef[dispreferredIdx] as number);

  const z = beta * delta;
  const sigmaZ = sigmoid(z);              // σ(β·Δ)

  const grad = new Array<number>(logits.length).fill(0);
  grad[preferredIdx]    = beta * (sigmaZ - 1);    // ≤ 0: pushes preferred logit up
  grad[dispreferredIdx] = -beta * (sigmaZ - 1);   // ≥ 0: pushes dispreferred logit down

  return grad;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Numerically stable sigmoid: avoids overflow for large |x|.
 *   σ(x) = 1 / (1 + exp(-x))
 * For x < 0 we use exp(x) / (1 + exp(x)) to keep the exponent non-negative.
 */
function sigmoid(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  } else {
    const e = Math.exp(x);
    return e / (1 + e);
  }
}

/**
 * Numerically stable softplus: softplus(x) = log(1 + exp(x)).
 * Uses the identity: softplus(x) = max(x, 0) + log(1 + exp(-|x|))
 * so that the argument to exp is always ≤ 0 and never overflows.
 */
function softplus(x: number): number {
  return Math.max(x, 0) + Math.log1p(Math.exp(-Math.abs(x)));
}
