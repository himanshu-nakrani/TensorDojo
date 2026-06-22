'use client';

import { useEffect, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Secondary for the batch-norm lesson: the training-vs-
 * inference footgun. Two paths through the same model.
 *
 *   Training:  normalize using the per-batch mean/variance.
 *              Updates running statistics.
 *   Inference: normalize using the *running* mean/variance
 *              (no batch is available).
 *
 * If you accidentally use batch statistics at inference with
 * batch size 1, the per-feature variance is zero, the
 * normalization is zero, and the model's output is the learned
 * bias β. The classic "model outputs nonsense in production"
 * bug — a real-world paper-worthy debugging story.
 *
 * The widget shows both paths side by side at the same
 * trained model.
 */
export function BatchNormTrainVsInference() {
  const [batch, setBatch] = useState<number>(1);
  const [useRunning, setUseRunning] = useState<boolean>(true);
  const [mod, setMod] = useState<typeof import('@/lib/math/batchnorm') | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/math/batchnorm').then((m) => {
      if (!cancelled) setMod(() => m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build a fake "trained" batchnorm: γ=1, β=0, but the
  // running stats are non-trivial so inference ≠ training.
  // We train by running forward passes on a stream of
  // small batches and letting the running stats accumulate.
  const trainedBN = ((): import('@/lib/math/batchnorm').BatchNormParams | null => {
    if (!mod) return null;
    const params = mod.defaultBNParams(2);
    // Manually seed the running stats to non-trivial values
    // so the inference path produces something visible.
    params.runningMean = [0.4, -0.2];
    params.runningVar = [0.8, 1.2];
    params.gamma = [1.0, 1.0];
    params.beta = [0.3, -0.5];
    return params;
  })();

  // Build a synthetic batch of N examples (1 or 4) to
  // demonstrate the "batch size 1 at inference" footgun.
  const x: number[][] = (() => {
    const out: number[][] = [];
    for (let i = 0; i < Math.max(1, batch); i += 1) {
      out.push([0.1 + i * 0.05, 0.2 - i * 0.03]);
    }
    return out;
  })();

  // Training-mode path (uses batch stats) — would be wrong
  // at inference, but is the right behavior during training.
  // Inference-mode path (uses running stats) — the correct
  // path at deployment.
  const yTrain = trainedBN && mod
    ? mod.batchNormForward(x, trainedBN, { training: true, momentum: 0 })
    : null;
  const yInf = trainedBN && mod ? mod.batchNormInference(x, trainedBN) : null;

  const reset = () => {
    setBatch(1);
    setUseRunning(true);
  };

  return (
    <SimFrame
      title="Train vs inference"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-dim font-mono">
            the classic batchnorm footgun
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reset
          </button>
        </div>
      }
      headerWrap
    >
      <div className="space-y-3 font-mono text-[12px]">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
              Batch size
            </span>
            <span className="text-ink tabular-nums">{batch}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBatch(1)}
              className={
                'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
                (batch === 1
                  ? 'border-accent text-accent'
                  : 'border-border text-muted hover:text-ink')
              }
              aria-pressed={batch === 1}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => setBatch(4)}
              className={
                'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
                (batch === 4
                  ? 'border-accent text-accent'
                  : 'border-border text-muted hover:text-ink')
              }
              aria-pressed={batch === 4}
            >
              4
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-dim">μ_running (feature 0)</span>
            <span className="text-ink tabular-nums">
              {trainedBN ? trainedBN.runningMean[0]!.toFixed(2) : '—'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dim">σ²_running (feature 0)</span>
            <span className="text-ink tabular-nums">
              {trainedBN ? trainedBN.runningVar[0]!.toFixed(2) : '—'}
            </span>
          </div>
        </div>

        {yTrain && yInf && (
          <div className="pt-3 border-t border-border space-y-2 text-[11px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
                Output at training (batch stats)
              </div>
              <div className="space-y-0.5">
                {yTrain.y.map((row, i) => (
                  <div key={i} className="font-mono tabular-nums">
                    <span className="text-fg-subtle">y[{i}]</span>{' '}
                    <span className="text-ink">=</span>{' '}
                    <span className="text-ink">
                      [{row.map((v) => v.toFixed(3)).join(', ')}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
                Output at inference (running stats)
              </div>
              <div className="space-y-0.5">
                {yInf.map((row, i) => (
                  <div key={i} className="font-mono tabular-nums">
                    <span className="text-fg-subtle">y[{i}]</span>{' '}
                    <span className="text-ink">=</span>{' '}
                    <span className="text-ink">
                      [{row.map((v) => v.toFixed(3)).join(', ')}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {batch === 1 && (
              <p className="text-[11px] text-[rgb(var(--negative))] font-mono leading-relaxed">
                ⚠ With batch size 1 the per-feature variance in
                the batch is 0, so the training-time output is
                just the learned bias β — the activations carry
                no information. Inference (which uses the
                running stats) gives the right answer. Always
                call the BN module in eval/inference mode at
                deployment.
              </p>
            )}
          </div>
        )}
      </div>
    </SimFrame>
  );
}
