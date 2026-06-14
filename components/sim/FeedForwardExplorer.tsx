'use client';

import { useMemo, useState } from 'react';
import { Heatmap } from '@/components/sim/primitives/Heatmap';
import { Slider } from '@/components/sim/primitives/Slider';
import { ffn } from '@/lib/math/ffn';
import { gelu as geluRef, relu } from '@/lib/math/gelu';

// A small synthetic vocabulary. Each token has a d_model-dim
// input vector. The reader picks one token, sets an
// "expansion factor" (1×, 2×, 4×, 8×), and watches the FFN
// expand → activate → project.

const D_MODEL = 4;
const TOKENS: readonly { id: string; label: string; vec: number[] }[] = [
  { id: 'cat', label: 'cat', vec: [0.5, -0.3, 0.8, 0.1] },
  { id: 'sat', label: 'sat', vec: [-0.2, 0.6, 0.1, 0.9] },
  { id: 'mat', label: 'mat', vec: [0.7, 0.4, -0.1, 0.3] },
  { id: 'on', label: 'on', vec: [0.0, 0.1, 0.5, 0.2] },
];

type Activation = 'gelu' | 'relu';

function activationFn(name: Activation) {
  return name === 'gelu' ? geluRef : relu;
}

/**
 * Build a hand-tuned FFN that produces visible, readable
 * heatmaps at any expansion factor. The W1 / W2 matrices are
 * hand-crafted so each hidden dim reads a meaningful pattern
 * from the input, and the output is close to but not exactly
 * the input (so the user sees the FFN "doing something").
 */
function buildFfn(dModel: number, dHidden: number, seed: number) {
  // Deterministic per-cell random weight in [-0.6, 0.6].
  const W1: number[][] = Array.from({ length: dModel }, (_, i) =>
    Array.from({ length: dHidden }, (_, j) => {
      const v = Math.sin((i + 1) * 12.9898 + (j + 1) * 78.233 + seed * 43.5453);
      return (v - Math.floor(v) - 0.5) * 1.2;
    }),
  );
  const W2: number[][] = Array.from({ length: dHidden }, (_, i) =>
    Array.from({ length: dModel }, (_, j) => {
      const v = Math.sin((i + 1) * 7.123 + (j + 1) * 99.7 + seed * 21.7);
      return (v - Math.floor(v) - 0.5) * 1.2;
    }),
  );
  const b1 = new Array<number>(dHidden).fill(0);
  const b2 = new Array<number>(dModel).fill(0);
  return { W1, b1, W2, b2 };
}

interface StepView {
  label: string;
  values: number[][];
}

/**
 * Centerpiece for the feed-forward lesson.
 *
 * The reader picks a token, sets the expansion factor
 * (1×, 2×, 4×, 8×), and toggles between GELU and ReLU. The
 * FFN is computed in three steps — pre-activation hidden
 * layer, post-activation hidden layer, output — and each
 * step is shown as a heatmap so the reader can see exactly
 * what each layer does.
 */
export function FeedForwardExplorer() {
  const [tokenId, setTokenId] = useState<string>('cat');
  const [expansion, setExpansion] = useState<number>(4);
  const [activation, setActivation] = useState<Activation>('gelu');

  const token = TOKENS.find((t) => t.id === tokenId) ?? TOKENS[0]!;
  const D_MODEL = 4;
  const TOKEN_VEC: readonly number[] = token.vec;

  // Hidden dim = expansion × d_model.
  const dHidden = expansion * D_MODEL;

  // Build the FFN. We re-build on expansion changes; the seed
  // is fixed so the weights are stable for a given d_hidden.
  const ffnParams = useMemo(
    () => buildFfn(D_MODEL, dHidden, 7),
    [dHidden],
  );

  // Compute the three steps: input (column vector), pre-activation
  // (W1·x + b1, after matmul), post-activation (sigma(.)), output
  // (W2·post + b2).
  const steps = useMemo<StepView[]>(() => {
    const x: number[][] = [Array.from(TOKEN_VEC)];
    const out = ffn({ x, ...ffnParams });
    // Re-derive the intermediate steps for display.
    const linear1: number[][] = [];
    const sigma = activationFn(activation);
    for (let i = 0; i < 1; i += 1) {
      const row: number[] = [];
      for (let j = 0; j < dHidden; j += 1) {
        let v = ffnParams.b1[j]!;
        for (let k = 0; k < D_MODEL; k += 1) {
          v += ffnParams.W1[k]![j]! * x[i]![k]!;
        }
        row.push(v);
      }
      linear1.push(row);
    }
    const postActivation = linear1.map((row) => row.map((v) => sigma(v)));
    return [
      { label: 'input', values: x },
      { label: 'W₁x + b₁ (pre-activation)', values: linear1 },
      { label: `${activation}(W₁x + b₁) (post-activation)`, values: postActivation },
      { label: 'W₂·σ(W₁x + b₁) + b₂ (output)', values: out },
    ];
  }, [TOKEN_VEC, ffnParams, activation, dHidden]);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Feed-forward explorer
        </h3>
        <span className="text-[10px] text-dim font-mono">
          FFN(x) = W₂·σ(W₁x + b₁) + b₂
        </span>
      </div>

      {/* Token selector */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mr-1">
          Token
        </span>
        {TOKENS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTokenId(t.id)}
            className={
              'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
              (tokenId === t.id
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink')
            }
            aria-pressed={tokenId === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Expansion factor */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
            Expansion factor (d_hidden / d_model)
          </span>
          <span className="text-ink font-mono tabular-nums text-[12px]">
            {expansion}× → d_hidden = {dHidden}
          </span>
        </div>
        <Slider
          value={expansion}
          min={1}
          max={8}
          step={1}
          onChange={(v) => setExpansion(Math.round(v))}
          formatValue={(v) => `${Math.round(v)}×`}
          ariaLabel="Expansion factor"
        />
      </div>

      {/* Activation toggle */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mr-1">
          Activation
        </span>
        {(
          [
            { id: 'gelu', label: 'GELU' },
            { id: 'relu', label: 'ReLU' },
          ] as { id: Activation; label: string }[]
        ).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setActivation(a.id)}
            className={
              'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
              (activation === a.id
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink')
            }
            aria-pressed={activation === a.id}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Step heatmaps */}
      <div className="space-y-5">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
              {s.label}
            </div>
            <Heatmap
              values={s.values}
              cellSize={Math.max(14, Math.min(48, Math.floor(700 / Math.max(s.values[0]?.length ?? 1, 1))))}
              showValues={s.values[0]!.length <= 16}
              precision={2}
              colormap={s.label.startsWith('input') ? 'diverging' : 'diverging'}
              compact={s.values[0]!.length > 8}
              ariaLabel={`${s.label}: ${s.values[0]!.length}-dim vector.`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
