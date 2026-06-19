'use client';

import { useMemo, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { perplexity } from '@/lib/math/evaluation';

/**
 * Centerpiece sim for the evaluation lesson. A fixed sentence
 * with per-token model "confidence" — the user adjusts a
 * temperature-like knob that sharpens or flattens the model's
 * predicted distribution. Per-token log-prob and total
 * perplexity update live.
 *
 * The teaching beat is that perplexity is just exp(mean
 * cross-entropy). Confident-correct predictions drive
 * perplexity toward 1; flat or wrong predictions blow it up.
 */

const TOKENS = ['The', 'cat', 'sat', 'on', 'the', 'mat', '.'];

// Per-token "true-token probability under a perfect model" — the
// model that knows English would assign these. We then warp the
// distribution with a confidence knob to simulate weaker models.
const TRUE_PROBS = [0.40, 0.30, 0.25, 0.35, 0.55, 0.22, 0.45] as const;

export function PerplexityCalculator() {
  // confidence ∈ [0.1, 2.0]; >1 sharpens (model is over-confident),
  // <1 flattens (model is under-confident). 1.0 = baseline.
  const [confidence, setConfidence] = useState(1.0);

  const { logProbs, ppl } = useMemo(() => {
    // Warp each probability by raising to (1/confidence) and
    // renormalizing in a 2-class "true vs other" space, so the
    // probability of the true token shifts smoothly.
    // confidence > 1: probability moves toward 1 (sharper).
    // confidence < 1: probability moves toward 0.5 (flatter).
    const warped = TRUE_PROBS.map((p) => {
      const x = Math.pow(p, 1 / confidence);
      const y = Math.pow(1 - p, 1 / confidence);
      return x / (x + y);
    });
    const lp = warped.map((p) => Math.log(Math.max(1e-9, p)));
    return { logProbs: lp, ppl: perplexity(lp) };
  }, [confidence]);

  const reset = () => setConfidence(1.0);

  return (
    <SimFrame
      title="Perplexity = exp(mean negative log-likelihood)"
      onReset={reset}
      headerAction={
        <button
          type="button"
          onClick={reset}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted hover:text-ink focus-ring transition-colors"
        >
          Reset
        </button>
      }
    >
      <div className="border border-border rounded p-4 bg-surface mb-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
          Predicted next-token probability per position
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          {TOKENS.map((tok, i) => {
            const p = Math.exp(logProbs[i]!);
            const lp = logProbs[i]!;
            return (
              <div
                key={i}
                className="grid grid-cols-[80px_1fr_60px_60px] items-center gap-3"
              >
                <span className="text-ink text-right">{tok}</span>
                <div className="h-3 rounded border border-border bg-bg-elevated overflow-hidden">
                  <div
                    className="h-full bg-accent-soft border-r border-accent/40 transition-all duration-150"
                    style={{ width: `${Math.max(0.5, p * 100)}%` }}
                  />
                </div>
                <span className="text-dim tabular-nums text-right">
                  p = {p.toFixed(3)}
                </span>
                <span className="text-dim tabular-nums text-right">
                  ℓ = {lp.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <label className="block mb-5">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
            Model confidence (1.0 = baseline, &gt;1 sharper, &lt;1 flatter)
          </span>
          <span className="text-[11px] font-mono tabular-nums text-ink">
            {confidence.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={2.0}
          step={0.02}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="w-full focus-ring"
          aria-label="Model confidence"
        />
        <div className="flex justify-between text-[9px] text-dim font-mono mt-1">
          <span>flat</span>
          <span>baseline</span>
          <span>sharp</span>
        </div>
      </label>

      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border font-mono text-[11px]">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim mb-1">
            Mean cross-entropy (nats)
          </div>
          <div className="text-ink tabular-nums">
            {(-logProbs.reduce((a, b) => a + b, 0) / logProbs.length).toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim mb-1">
            Perplexity (exp of the above)
          </div>
          <div className="text-accent text-[14px] tabular-nums">
            {ppl.toFixed(3)}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Perplexity is exactly <span className="text-ink">exp(cross-entropy)</span> —
        the same loss the model was trained to minimize, just in
        token-space units instead of nats. A perfect model has perplexity
        1.0 (probability 1 on every true token); uniform over a
        50,000-token vocabulary has perplexity 50,000. Real LLMs on natural
        text land around 8-20 perplexity, which means roughly "the model is
        as uncertain as a 10-way choice at every token." Bigger / better
        models score lower, which is why perplexity was the field's main
        metric for years before benchmarks took over.
      </p>
    </SimFrame>
  );
}
