'use client';

import { useCallback, useRef, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { dpoGradient, policySoftmax } from '@/lib/math/rlhf';
import {
  BETA,
  LR,
  PREFERENCES,
  PROMPT,
  RESPONSES,
} from './_lesson31-prefs';

const N_PREFS = PREFERENCES.length; // 6
const REF_LOGITS = [0, 0, 0, 0] as const;

// ---------------------------------------------------------------------------
// Sigmoid helper (needed for Bradley-Terry gradient)
// ---------------------------------------------------------------------------

function sigmoid(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

// ---------------------------------------------------------------------------
// Step helper — applies one DPO update to policy and one BT update to reward
// ---------------------------------------------------------------------------

interface StepResult {
  policyLogits: number[];
  rewardScores: number[];
  nextIndex: number;
}

function applyStep(
  policyLogits: number[],
  rewardScores: number[],
  stepIndex: number,
): StepResult {
  const pref = PREFERENCES[stepIndex % N_PREFS]!;
  const { preferred: w, dispreferred: l } = pref;

  // 1. DPO gradient on policy
  const pGrad = dpoGradient(
    policyLogits,
    REF_LOGITS,
    w,
    l,
    BETA,
  );
  const nextPolicy = policyLogits.map((v, i) => v - LR * pGrad[i]!);

  // 2. Bradley-Terry gradient on reward model
  //    L_RM = -log σ(r[w] - r[l])
  //    dL/dr[w] = σ(r[w] - r[l]) - 1   (≤ 0: pushes r[w] up)
  //    dL/dr[l] = -(σ(r[w] - r[l]) - 1) (≥ 0: pushes r[l] down)
  const diff = (rewardScores[w] as number) - (rewardScores[l] as number);
  const sig = sigmoid(diff);
  const rGrad = new Array<number>(RESPONSES.length).fill(0);
  rGrad[w] = sig - 1; // ≤ 0
  rGrad[l] = -(sig - 1); // ≥ 0
  const nextReward = rewardScores.map((v, i) => v - LR * rGrad[i]!);

  return {
    policyLogits: nextPolicy,
    rewardScores: nextReward,
    nextIndex: (stepIndex + 1) % N_PREFS,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Horizontal bar chart for policy probabilities (0–100%). */
function PolicyBars({ probs }: { probs: number[] }) {
  return (
    <div className="space-y-2">
      {RESPONSES.map((resp, i) => {
        const pct = probs[i]! * 100;
        return (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] text-muted w-4 shrink-0 tabular-nums">
              {i}
            </span>
            <span className="font-mono text-[11px] text-ink flex-1 truncate min-w-0">
              {resp}
            </span>
            <div className="w-28 bg-bg/60 rounded-sm overflow-hidden h-3 shrink-0">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${pct.toFixed(2)}%`,
                  backgroundColor: 'rgb(var(--accent))',
                  transition: 'width 200ms ease-out',
                }}
              />
            </div>
            <span className="font-mono text-[11px] text-ink tabular-nums w-10 text-right shrink-0">
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal bar chart for reward scores (can be negative). */
function RewardBars({ scores }: { scores: number[] }) {
  const absMax = Math.max(0.01, ...scores.map(Math.abs));

  return (
    <div className="space-y-2">
      {RESPONSES.map((resp, i) => {
        const score = scores[i]!;
        const isPositive = score >= 0;
        // Width as % of the max absolute score, capped at 100%
        const pct = Math.min(100, (Math.abs(score) / absMax) * 100);
        return (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] text-muted w-4 shrink-0 tabular-nums">
              {i}
            </span>
            <span className="font-mono text-[11px] text-ink flex-1 truncate min-w-0">
              {resp}
            </span>
            <div className="w-28 bg-bg/60 rounded-sm overflow-hidden h-3 shrink-0">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${pct.toFixed(2)}%`,
                  backgroundColor: isPositive
                    ? 'rgb(var(--accent))'
                    : 'rgb(var(--fg-muted))',
                  opacity: isPositive ? 1 : 0.6,
                  transition: 'width 200ms ease-out, background-color 200ms ease-out',
                }}
              />
            </div>
            <span className="font-mono text-[11px] text-ink tabular-nums w-12 text-right shrink-0">
              {score >= 0 ? '+' : ''}{score.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Secondary sim for lesson 31: the same preference data trains a DPO policy
 * (left) and a Bradley-Terry reward model (right) in parallel. Both shift in
 * the same direction — illustrating that DPO mathematically collapses the
 * reward model and policy into one training signal.
 */
export function RewardModelView() {
  const [policyLogits, setPolicyLogits] = useState<number[]>([0, 0, 0, 0]);
  const [rewardScores, setRewardScores] = useState<number[]>([0, 0, 0, 0]);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const probs = policySoftmax(policyLogits);
  const nextPref = PREFERENCES[stepIndex % N_PREFS]!;
  const epoch = Math.floor(totalSteps / N_PREFS);

  const handleStep = useCallback(() => {
    const result = applyStep(policyLogits, rewardScores, stepIndex);
    setPolicyLogits(result.policyLogits);
    setRewardScores(result.rewardScores);
    setStepIndex(result.nextIndex);
    setTotalSteps((t) => t + 1);
  }, [policyLogits, rewardScores, stepIndex]);

  const handleStep6 = useCallback(() => {
    if (animRef.current !== null) return;
    let state = {
      policyLogits: policyLogits.slice(),
      rewardScores: rewardScores.slice(),
      stepIndex,
    };
    let tick = 0;

    const run = () => {
      const result = applyStep(
        state.policyLogits,
        state.rewardScores,
        state.stepIndex,
      );
      state = {
        policyLogits: result.policyLogits,
        rewardScores: result.rewardScores,
        stepIndex: result.nextIndex,
      };
      tick += 1;

      setPolicyLogits(result.policyLogits.slice());
      setRewardScores(result.rewardScores.slice());
      setStepIndex(result.nextIndex);
      setTotalSteps((t) => t + 1);

      if (tick < N_PREFS) {
        animRef.current = setTimeout(run, 200);
      } else {
        animRef.current = null;
      }
    };

    animRef.current = setTimeout(run, 0);
  }, [policyLogits, rewardScores, stepIndex]);

  const handleReset = useCallback(() => {
    if (animRef.current !== null) {
      clearTimeout(animRef.current);
      animRef.current = null;
    }
    setPolicyLogits([0, 0, 0, 0]);
    setRewardScores([0, 0, 0, 0]);
    setStepIndex(0);
    setTotalSteps(0);
  }, []);

  return (
    <SimFrame
      title="Two heads, same preferences: policy + reward model"
      headerAction={
        <span className="text-[11px] font-mono text-muted tabular-nums">
          step {totalSteps % N_PREFS} of {N_PREFS} &middot; epoch {epoch}
        </span>
      }
    >
      <div className="space-y-5">
      {/* Prompt */}
      <div className="rounded border border-border bg-bg/50 px-3 py-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-dim font-mono mr-2">
          Prompt
        </span>
        <span className="font-mono text-[12px] text-ink">{PROMPT}</span>
      </div>

      {/* Two-pane bar charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Left: policy */}
        <section aria-label="Policy probabilities">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
            Policy &pi;(y|x)
          </div>
          <PolicyBars probs={probs} />
        </section>

        {/* Right: reward model */}
        <section aria-label="Reward model scores">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
            Reward model r(y|x)
          </div>
          <RewardBars scores={rewardScores} />
        </section>
      </div>

      {/* Next preference preview */}
      <div className="rounded border border-border bg-bg/40 px-3 py-2 font-mono text-[11px] text-muted">
        <span className="text-dim uppercase tracking-[0.14em] text-[11px] mr-2">
          Next preference
        </span>
        response {nextPref.preferred} preferred over response{' '}
        {nextPref.dispreferred}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleStep}
          className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[12px] hover:border-border-strong transition-colors"
        >
          Step
        </button>
        <button
          type="button"
          onClick={handleStep6}
          className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[12px] hover:border-border-strong transition-colors"
        >
          Step &times;6
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[12px] hover:border-border-strong transition-colors text-muted"
        >
          Reset
        </button>
      </div>

      {/* Caption */}
      <p className="font-mono text-[11px] text-muted leading-relaxed border-t border-border pt-4">
        Both models see the same preference data. The reward model assigns
        scores to responses; the policy makes them probabilities. In DPO,
        these are mathematically the same training signal &mdash; the same
        gradient direction shows up in both.
      </p>
      </div>
    </SimFrame>
  );
}
