'use client';

import { useMemo, useState } from 'react';
import { Heatmap } from '@/components/sim/primitives/Heatmap';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { sinusoidalPE } from '@/lib/math/positional';
import {
  transformerBlock,
  type TransformerBlockInput,
} from '@/lib/math/transformer-block';

// -----------------------------------------------------------------------------
// BlockDepth
//
// Secondary widget for the transformer-block capstone. Compresses the
// full block pipeline into a single depth slider + a stack of output
// vectors, so the reader can watch the residual stream drift through
// depth without the rest of the data-flow view's chrome. The toggles
// (LN 1, residual 1, LN 2, residual 2) are exposed too — toggling any
// of them visibly accelerates the drift.
// -----------------------------------------------------------------------------

const SENTENCES: ReadonlyArray<{
  id: string;
  label: string;
  tokens: readonly string[];
  embeds: ReadonlyArray<readonly number[]>;
}> = [
  {
    id: 'coref',
    label: 'the cat saw the',
    tokens: ['the', 'cat', 'saw', 'the'],
    embeds: [
      [1, 0, 1, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0, 0, 0, 0],
      [-1, 0, 0, 0, 1, 0, 0, 0],
      [0, -1, 0, 0, 0, 1, 0, 0],
    ],
  },
  {
    id: 'trivial',
    label: 'a a a a',
    tokens: ['a', 'a', 'a', 'a'],
    embeds: [
      [1, 0, 1, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 0],
      [-1, 0, 1, 0, 0, 0, 0, 0],
      [0, -1, 1, 0, 0, 0, 0, 0],
    ],
  },
];

// A simple block-input fixture. We do not need the centerpiece
// interactive's full weight set here — the depth story is
// qualitative, not quantitative.
function makeBlockInput(x: ReadonlyArray<readonly number[]>): TransformerBlockInput {
  const D = 8;
  const dFf = 32;
  // W1, W2 deterministic (small scale — the drift comes from the
  // toggles, not from the FFN).
  const seed = (r: number, c: number, s: number): number => {
    const v = Math.sin((r + 1) * 7.31 + (c + 1) * 3.7 + s * 11.1);
    return (v - Math.floor(v) - 0.5) * 0.8;
  };
  return {
    x: x.map((r) => r.slice()) as number[][],
    Wq: identity(D),
    Wk: identity(D),
    Wv: identity(D),
    Wo: identity(D),
    h: 4,
    W1: Array.from({ length: D }, (_, i) =>
      Array.from({ length: dFf }, (_, j) => seed(i, j, 1)),
    ),
    b1: new Array<number>(dFf).fill(0),
    W2: Array.from({ length: dFf }, (_, i) =>
      Array.from({ length: D }, (_, j) => seed(i, j, 2)),
    ),
    b2: new Array<number>(D).fill(0),
    lnGamma: new Array<number>(D).fill(1),
    lnBeta: new Array<number>(D).fill(0),
    causal: true,
  };
}

function identity(n: number): number[][] {
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i += 1) m[i]![i] = 1;
  return m;
}

export function BlockDepth() {
  const [sentenceId, setSentenceId] = useState<string>('coref');
  const [depth, setDepth] = useState<number>(3);
  const [useRes1, setUseRes1] = useState<boolean>(true);
  const [useRes2, setUseRes2] = useState<boolean>(true);
  const [useLN1, setUseLN1] = useState<boolean>(true);
  const [useLN2, setUseLN2] = useState<boolean>(true);

  const sentence =
    SENTENCES.find((s) => s.id === sentenceId) ?? SENTENCES[0]!;

  const { outputs, drift, xIn } = useMemo(() => {
    const T = 4;
    const D = 8;
    const pe = sinusoidalPE(T, D);
    const x0 = sentence.embeds.map((row, t) =>
      row.map((v, k) => v + pe[t]![k]!),
    );
    const input = makeBlockInput(x0);
    const allOutputs: number[][][] = [];
    let x: readonly (readonly number[])[] = x0;
    for (let b = 0; b < depth; b += 1) {
      const out = transformerBlock({
        ...input,
        x,
        useRes1,
        useRes2,
        useLN1,
        useLN2,
      });
      allOutputs.push(out.xOut);
      x = out.xOut;
    }
    // Drift: cosine similarity of each block's output to the *input*
    // xIn (the embed + PE, the true "starting point").
    const d: number[] = [];
    for (const out of allOutputs) {
      let total = 0;
      for (let t = 0; t < T; t += 1) {
        let dot = 0;
        let na = 0;
        let nb = 0;
        for (let k = 0; k < D; k += 1) {
          const a = x0[t]![k]!;
          const b = out[t]![k]!;
          dot += a * b;
          na += a * a;
          nb += b * b;
        }
        total += dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
      }
      d.push(total / T);
    }
    return { outputs: allOutputs, drift: d, xIn: x0 };
  }, [sentence, depth, useRes1, useRes2, useLN1, useLN2]);

  const reset = () => {
    setSentenceId('coref');
    setDepth(3);
    setUseRes1(true);
    setUseRes2(true);
    setUseLN1(true);
    setUseLN2(true);
  };

  return (
    <SimFrame title="Block depth" onReset={reset}>
      <div className="space-y-3 mb-5">
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
          Sentence
          <select
            value={sentenceId}
            onChange={(e) => setSentenceId(e.target.value)}
            className="number-input font-mono text-[11px] py-0.5 px-2 bg-bg border border-border rounded"
            aria-label="Sentence"
          >
            {SENTENCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2 font-mono text-[12px]">
          <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono shrink-0">
            Run
          </span>
          <div className="flex-1 min-w-0">
            <Slider
              value={depth}
              min={1}
              max={6}
              step={1}
              onChange={setDepth}
              formatValue={(v) => `${v} block${v === 1 ? '' : 's'}`}
              ariaLabel="Block depth"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mr-1">
            Toggles
          </span>
          <MiniToggle label="LN 1" on={useLN1} onChange={setUseLN1} />
          <MiniToggle label="Res 1" on={useRes1} onChange={setUseRes1} />
          <MiniToggle label="LN 2" on={useLN2} onChange={setUseLN2} />
          <MiniToggle label="Res 2" on={useRes2} onChange={setUseRes2} />
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
        Stacked output at each block
      </div>
      <div className="space-y-2 overflow-x-auto">
        <div
          className="rounded border border-border bg-bg/30 p-2 flex items-center gap-2"
          title="input x (embed + PE), shape (4, 8)"
        >
          <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono shrink-0 w-16">
            input
          </span>
          <Heatmap
            values={xIn}
            colormap="diverging"
            cellSize={10}
            precision={2}
            compact
            rowLabels={sentence.tokens as string[]}
            ariaLabel="input x, shape (4, 8)"
          />
        </div>
        {outputs.map((out, b) => (
          <div
            key={b}
            className="rounded border border-border bg-bg/30 p-2 flex items-center gap-2"
            title={`output of block ${b + 1}, shape (4, 8)`}
          >
            <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono shrink-0 w-16">
              block {b + 1}
            </span>
            <Heatmap
              values={out}
              colormap="diverging"
              cellSize={10}
              precision={2}
              compact
              rowLabels={sentence.tokens as string[]}
              ariaLabel={`output of block ${b + 1}, shape (4, 8)`}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded border border-border bg-bg/30 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Cosine to input
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {drift.map((c, b) => (
              <div
                key={b}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-dim">block {b + 1}</span>
                <span
                  className={
                    c < 0.5
                      ? 'text-[rgb(var(--negative))] tabular-nums'
                      : 'text-ink tabular-nums'
                  }
                >
                  {c < 0.5 && '↓ '}{c.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-border bg-bg/30 p-3 text-[11px] text-muted font-mono leading-relaxed">
          Each block re-reads its input through attention and the FFN, then
          writes the result back into the residual stream. The residual
          stream is the message that flows through the network — every
          sublayer is an edit, never a replacement. Toggle a residual off
          and the stream is replaced by the sublayer's output; the deeper
          you stack, the more it drifts.
        </div>
      </div>
    </SimFrame>
  );
}

function MiniToggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={
        'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
        (on
          ? 'border-accent text-accent'
          : 'border-border text-muted hover:text-ink')
      }
      aria-pressed={on}
    >
      {label}: {on ? 'on' : 'off'}
    </button>
  );
}
