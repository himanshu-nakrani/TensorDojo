/**
 * Scaling laws — Kaplan et al. (2020) and Hoffmann et al.
 * (Chinchilla, 2022). For a fixed compute budget C, how should
 * you split between parameter count N and training-token count
 * D?
 *
 * Chinchilla fitted the loss surface
 *   L(N, D) = E + A / N^α + B / D^β
 * and reported a headline result of roughly 20 tokens per
 * parameter at compute-optimal training. Most pre-2022 models
 * were well below that ratio — GPT-3 had ~1.7 tokens per
 * parameter; Gopher had ~1.1. Both were undertrained.
 *
 * Modern production (LLaMA-3, Mistral, Qwen) deliberately
 * trains *past* Chinchilla-optimal — over-training shifts cost
 * from inference to training, which is the right trade when
 * the model will serve many requests.
 *
 * Pedagogical scope: this module implements the Chinchilla
 * functional form and the standard 6·N·D FLOPs estimate. No
 * actual model training.
 *
 * Note on the constants: Hoffmann et al.'s "Approach 3" Table 9
 * gives the (A, B, alpha, beta, E) below. Plugging them into a
 * straight minimization of L(N, D) at fixed compute does NOT
 * reproduce the paper's headline 20-tokens-per-parameter rule
 * — it gives closer to 80 tokens/parameter at Chinchilla's
 * budget. The discrepancy was noted publicly by Besiroglu et
 * al. (Epoch AI, 2024) and is an artifact of how Hoffmann
 * combined three different fitting approaches. The lesson
 * teaches with the published constants and acknowledges the
 * gap explicitly — it's a real wart of the literature, not
 * something to hide.
 */

// Chinchilla "Approach 3" constants (Hoffmann et al. 2022, Table 9).
// L(N, D) = E + A · N^(-alpha) + B · D^(-beta)
export const CHINCHILLA_E = 1.69;
export const CHINCHILLA_A = 406.4;
export const CHINCHILLA_B = 410.7;
export const CHINCHILLA_ALPHA = 0.34;
export const CHINCHILLA_BETA = 0.28;

/** The Chinchilla loss surface as a function of N (params) and D (tokens). */
export function chinchillaLoss(N: number, D: number): number {
  if (N <= 0 || D <= 0) {
    throw new Error('N and D must be > 0');
  }
  return (
    CHINCHILLA_E +
    CHINCHILLA_A * Math.pow(N, -CHINCHILLA_ALPHA) +
    CHINCHILLA_B * Math.pow(D, -CHINCHILLA_BETA)
  );
}

/**
 * Training FLOPs estimate for a transformer (Kaplan 2020):
 *   C ≈ 6 · N · D
 *
 * The factor of 6 comes from 2 (multiply-accumulate) × 3
 * (forward + backward pass roughly = 3 · forward). Ignores
 * attention's O(seq²) term, which is sub-leading for the
 * sequence lengths typical in pretraining.
 */
export function computeFlops(N: number, D: number): number {
  if (N <= 0 || D <= 0) {
    throw new Error('N and D must be > 0');
  }
  return 6 * N * D;
}

/**
 * Compute-optimal (N, D) split at a given total budget C.
 *
 * Minimize L(N, D) subject to 6·N·D = C. Setting the Lagrangian
 * derivative to zero gives a closed-form for the optimal N:
 *
 *   N* = ((A · alpha · D) / (B · beta · N)) ... messy.
 *
 * Numerical 1-D minimization is cleaner and pedagogically
 * honest — we sweep N on a log grid, derive D = C/(6·N), and
 * pick the minimum. The sims do the same.
 */
export function chinchillaOptimalSplit(
  C: number,
  opts: { nSteps?: number } = {},
): { N: number; D: number; loss: number } {
  if (C <= 0) throw new Error('C must be > 0');
  const steps = opts.nSteps ?? 200;
  // Search N over a wide log range; D follows from the budget.
  const logNMin = Math.log10(1e6);
  const logNMax = Math.log10(1e13);

  let bestN = 0;
  let bestLoss = Infinity;
  for (let i = 0; i < steps; i++) {
    const logN = logNMin + (i / (steps - 1)) * (logNMax - logNMin);
    const N = Math.pow(10, logN);
    const D = C / (6 * N);
    if (D <= 0) continue;
    const L = chinchillaLoss(N, D);
    if (L < bestLoss) {
      bestLoss = L;
      bestN = N;
    }
  }
  return { N: bestN, D: C / (6 * bestN), loss: bestLoss };
}

/**
 * Tokens-per-parameter ratio at the compute-optimal split for
 * budget C. Chinchilla's headline finding is that this number
 * is ~20 across a wide range of practical scales, and growing
 * slowly with N.
 */
export function chinchillaTokensPerParam(C: number): number {
  const { N, D } = chinchillaOptimalSplit(C);
  return D / N;
}
