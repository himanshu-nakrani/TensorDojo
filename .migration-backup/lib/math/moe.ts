/**
 * Mixture of experts (MoE) — Shazeer et al., 2017
 * (sparsely-gated) and the production design behind Mixtral,
 * DeepSeek-V2/V3, GPT-OSS variants, and Switch Transformer.
 *
 * The architectural idea: replace one dense FFN with N
 * "expert" FFNs and a small router. For each token, the router
 * picks the top-k experts and routes the token to them. Only
 * those k experts compute; the other N - k experts sit idle
 * for this token. Total parameter count scales as N; active
 * FLOPs per token scale as k.
 *
 * The win: a Mixtral-8x7B-style model has 47B total parameters
 * but only ~13B active per token (top-2 of 8). The compute cost
 * is comparable to a dense 13B; the model capacity is closer to
 * a dense 47B. The catch is load balancing — if the router
 * always picks the same experts, training collapses.
 *
 * Pedagogical scope: this file models the routing math and the
 * cost ratios. No actual FFN computation.
 */

export interface RoutingResult {
  /**
   * Per token, the indices of the chosen experts (length k).
   * Shape: [nTokens][k].
   */
  readonly expertAssignments: number[][];
  /**
   * Per token, the renormalized softmax weights of the chosen
   * experts (length k, sums to 1).
   * Shape: [nTokens][k].
   */
  readonly weights: number[][];
}

/**
 * Route each token to its top-k experts by softmax over the
 * given router logits. Weights of unselected experts are
 * dropped, then the remaining k weights are renormalized to
 * sum to 1 (the convention Mixtral/DeepSeek use).
 *
 * @param logits Router logits, shape [nTokens][nExperts].
 * @param topK Number of experts each token uses.
 */
export function routeTokens(
  logits: ReadonlyArray<readonly number[]>,
  topK: number,
): RoutingResult {
  if (logits.length === 0) {
    return { expertAssignments: [], weights: [] };
  }
  const nExperts = logits[0]!.length;
  if (topK < 1 || topK > nExperts) {
    throw new Error(`topK ${topK} out of range [1, ${nExperts}]`);
  }

  const expertAssignments: number[][] = [];
  const weights: number[][] = [];

  for (const tokenLogits of logits) {
    if (tokenLogits.length !== nExperts) {
      throw new Error('all rows of logits must have the same length');
    }
    // Softmax with numerical stabilization.
    const m = Math.max(...tokenLogits);
    const exps = tokenLogits.map((l) => Math.exp(l - m));
    const z = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map((e) => e / z);

    // Pick top-k indices by descending prob.
    const indexed = probs.map((p, i) => ({ p, i }));
    indexed.sort((a, b) => b.p - a.p);
    const top = indexed.slice(0, topK);

    const chosenIdx = top.map((x) => x.i);
    const chosenP = top.map((x) => x.p);
    const sumChosen = chosenP.reduce((a, b) => a + b, 0);
    const renorm = chosenP.map((p) => p / sumChosen);

    expertAssignments.push(chosenIdx);
    weights.push(renorm);
  }

  return { expertAssignments, weights };
}

/**
 * Load-balance stats: how many tokens each expert handled, and
 * a scalar imbalance metric (max load / mean load). Perfect
 * balance is 1.0; the higher the number the more lopsided.
 *
 * Real MoE training adds an aux load-balancing loss to keep
 * this near 1.0.
 */
export function loadBalance(
  assignments: ReadonlyArray<readonly number[]>,
  nExperts: number,
): { perExpertLoad: number[]; imbalance: number } {
  if (nExperts < 1) throw new Error('nExperts must be ≥ 1');
  const counts = new Array<number>(nExperts).fill(0);
  let totalAssigns = 0;
  for (const row of assignments) {
    for (const e of row) {
      if (e < 0 || e >= nExperts) throw new Error(`expert index ${e} out of range`);
      counts[e]!++;
      totalAssigns++;
    }
  }
  if (totalAssigns === 0) {
    return { perExpertLoad: counts.slice(), imbalance: 1 };
  }
  const mean = totalAssigns / nExperts;
  const max = Math.max(...counts);
  return { perExpertLoad: counts, imbalance: mean === 0 ? 1 : max / mean };
}

/**
 * Fraction of FFN FLOPs computed per token compared to a dense
 * baseline (which is the same as a single full expert). For
 * Mixtral-8×7B with top-2 routing, this is 2/8 = 0.25.
 */
export function activeFlopsRatio(nExperts: number, topK: number): number {
  if (nExperts < 1 || topK < 1 || topK > nExperts) {
    throw new Error('invalid (nExperts, topK)');
  }
  return topK / nExperts;
}

/**
 * Ratio of total FFN parameters in MoE to a dense baseline of
 * one expert. MoE has N copies of the FFN, so this is just N.
 * (Ignores the router itself, which is tiny.)
 */
export function totalParamsRatio(nExperts: number): number {
  if (nExperts < 1) throw new Error('nExperts must be ≥ 1');
  return nExperts;
}
