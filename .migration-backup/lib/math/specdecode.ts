/**
 * Speculative decoding — Leviathan et al., 2023 (and Chen et
 * al., 2023, concurrently). The other major inference
 * optimization beyond KV cache. Insight: most next tokens are
 * easy, so let a small "draft" model propose γ tokens at a
 * time and the big "target" model verify them in parallel. On
 * the first rejection, the target's correction is used and we
 * start a new draft round.
 *
 * The math is clean: if the draft accepts at rate α per token,
 * the expected number of accepted tokens per round is
 * (1 - α^(γ+1)) / (1 - α), and each round costs (γ+1) forward
 * passes (γ draft + 1 target verification, all in parallel).
 * The wall-clock speedup is (expected accepted) / (one
 * sequential target step).
 *
 * Pedagogical scope: this file computes the expected-accepted
 * formula and the speedup ratio. The sim animates round-by-
 * round draft and accept/reject behavior.
 */

/**
 * Expected number of tokens accepted per round (including the
 * target's own corrective token), given:
 *   - acceptanceRate α ∈ [0, 1]: probability a given draft
 *     token is accepted (i.i.d. across draft positions).
 *   - gamma γ ≥ 1: number of tokens proposed per draft round.
 *
 * Closed-form: for α < 1, sum_{i=0}^{γ} α^i = (1 - α^(γ+1)) / (1 - α).
 * For α = 1, this is γ+1 (all draft accepted + one target step).
 *
 * The +1 in α^(γ+1) accounts for the target's corrective token,
 * which is always accepted (it's the target's own sample).
 */
export function expectedAcceptedTokens(
  acceptanceRate: number,
  gamma: number,
): number {
  if (acceptanceRate < 0 || acceptanceRate > 1) {
    throw new Error('acceptanceRate must be in [0, 1]');
  }
  if (!Number.isInteger(gamma) || gamma < 1) {
    throw new Error('gamma must be a positive integer');
  }
  if (acceptanceRate === 1) return gamma + 1;
  if (acceptanceRate === 0) return 1; // every draft rejected → just the target's correction
  return (1 - Math.pow(acceptanceRate, gamma + 1)) / (1 - acceptanceRate);
}

/**
 * Wall-clock speedup of speculative decoding over plain
 * autoregressive decoding.
 *
 * One round of speculative decoding costs:
 *   - γ sequential draft forward passes (cheap, small model)
 *   - 1 target forward pass in parallel for all γ+1 positions
 *     (the verify step; one big-model pass per round, not γ)
 *
 * Plain decoding produces 1 target token per target forward
 * pass. So:
 *   speedup = E[accepted] · verifyCost / (γ · draftCost + verifyCost)
 *
 * For draft costs much smaller than verify (e.g. 7B vs 70B),
 * the ratio is dominated by E[accepted].
 *
 * @param acceptanceRate α
 * @param gamma γ
 * @param draftCost cost of one draft-model forward pass
 *        (relative units)
 * @param verifyCost cost of one target-model forward pass
 *        (relative units, typically ≫ draftCost)
 */
export function speculativeSpeedup(
  acceptanceRate: number,
  gamma: number,
  draftCost: number,
  verifyCost: number,
): number {
  if (draftCost <= 0 || verifyCost <= 0) {
    throw new Error('costs must be positive');
  }
  const expected = expectedAcceptedTokens(acceptanceRate, gamma);
  return (expected * verifyCost) / (gamma * draftCost + verifyCost);
}
