/**
 * Toy beam-search engine for the beam-search lesson centerpiece.
 *
 * A real LM emits per-token logits over a vocabulary of tens of
 * thousands. To make beam search tangible we use a 5-token toy
 * vocabulary and a deterministic next-token-distribution function
 * keyed on the current prefix. The point of the lesson is the
 * search procedure, not the language model.
 *
 * Vocabulary: `the`, `cat`, `sat`, `on`, `mat` plus the end-of-
 * sequence marker `<eos>`. The next-token distribution is hand-
 * designed so that:
 *
 *   - "the" → mostly "cat", a little "mat"
 *   - "cat" → mostly "sat"
 *   - "sat" → mostly "on"
 *   - "on"  → mostly "the", a little "mat"
 *   - "mat" → mostly <eos>
 *
 * Greedy decoding on "the" produces "the cat sat on the mat <eos>",
 * which is exactly the same path a width-1 beam takes. Wider beams
 * explore alternatives at each step.
 */

export const VOCAB = ['the', 'cat', 'sat', 'on', 'mat', '<eos>'] as const;
export type Token = (typeof VOCAB)[number];

const EOS: Token = '<eos>';

/**
 * Per-token next-distribution table keyed on the last token of the
 * prefix. Each row sums to 1.0 (probabilities, not logits — log
 * probs are taken at search time).
 */
const NEXT: Record<Token, Record<Token, number>> = {
  the: { the: 0.02, cat: 0.7, sat: 0.05, on: 0.03, mat: 0.18, '<eos>': 0.02 },
  cat: { the: 0.05, cat: 0.02, sat: 0.78, on: 0.08, mat: 0.04, '<eos>': 0.03 },
  sat: { the: 0.06, cat: 0.04, sat: 0.02, on: 0.8, mat: 0.05, '<eos>': 0.03 },
  on: { the: 0.66, cat: 0.06, sat: 0.04, on: 0.02, mat: 0.2, '<eos>': 0.02 },
  mat: { the: 0.06, cat: 0.04, sat: 0.04, on: 0.04, mat: 0.02, '<eos>': 0.8 },
  '<eos>': {
    the: 0,
    cat: 0,
    sat: 0,
    on: 0,
    mat: 0,
    '<eos>': 1,
  },
};

/**
 * Next-token log-probabilities given the previous token. We use the
 * last token only — the toy model is a bigram. Real LMs condition
 * on the full prefix; the lesson is about the search procedure, so
 * a bigram is enough to make beam-search behavior visible.
 */
export function nextLogProbs(prevToken: Token): Map<Token, number> {
  const row = NEXT[prevToken];
  const out = new Map<Token, number>();
  for (const tok of VOCAB) {
    const p = row[tok];
    out.set(tok, p > 0 ? Math.log(p) : -Infinity);
  }
  return out;
}

export interface Beam {
  /** Tokens chosen so far. */
  tokens: Token[];
  /** Sum of log-probabilities along this path. */
  logProb: number;
  /** True once <eos> has been emitted; further expansion freezes. */
  finished: boolean;
}

/** A fresh beam holding a single seed token (default: "the"). */
export function makeSeedBeam(seed: Token = 'the'): Beam {
  return { tokens: [seed], logProb: 0, finished: false };
}

/**
 * One beam-search step. Given the current `beams`, expand every
 * un-finished beam by every vocabulary token, score each expansion
 * by `logProb + log P(token | last)`, and return the top `k`
 * across all expansions. Finished beams (ending in <eos>) pass
 * through unchanged.
 *
 * The score is the path log-probability — no length normalization,
 * no temperature. Real beam search adds those; this is the
 * core operation.
 */
export function beamStep(beams: readonly Beam[], k: number): Beam[] {
  if (k < 1) throw new Error('beamStep: k must be >= 1');

  type Cand = { beam: Beam; score: number };
  const candidates: Cand[] = [];

  for (const beam of beams) {
    if (beam.finished) {
      candidates.push({ beam, score: beam.logProb });
      continue;
    }
    const last = beam.tokens[beam.tokens.length - 1] as Token;
    const dist = nextLogProbs(last);
    for (const [tok, lp] of dist) {
      if (!Number.isFinite(lp)) continue;
      const nextBeam: Beam = {
        tokens: [...beam.tokens, tok],
        logProb: beam.logProb + lp,
        finished: tok === EOS,
      };
      candidates.push({ beam: nextBeam, score: nextBeam.logProb });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, k).map((c) => c.beam);
}

/**
 * Run beam search to completion (every beam finished or `maxSteps`
 * reached). Returns the beams in score order, best first.
 */
export function runBeamSearch(
  seed: Token,
  k: number,
  maxSteps = 12,
): Beam[] {
  let beams: Beam[] = [makeSeedBeam(seed)];
  for (let step = 0; step < maxSteps; step++) {
    if (beams.every((b) => b.finished)) break;
    beams = beamStep(beams, k);
  }
  beams.sort((a, b) => b.logProb - a.logProb);
  return beams;
}
