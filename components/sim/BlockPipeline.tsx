'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Heatmap } from '@/components/sim/primitives/Heatmap';
import { Slider } from '@/components/sim/primitives/Slider';
import { sinusoidalPE } from '@/lib/math/positional';
import {
  transformerBlock,
  type TransformerBlockInput,
  type TransformerBlockOutput,
} from '@/lib/math/transformer-block';
import { softmaxRows } from '@/lib/math/softmax';

// -----------------------------------------------------------------------------
// Authored constants
// -----------------------------------------------------------------------------
//
// Everything in this section is hand-tuned so the four sentences produce
// visibly different attention patterns and the four toggles produce visibly
// broken outputs. The model is 4 tokens × 8 dims, 4 heads of d_k = 2.
//
// Position encoding: dims 0, 1 of every token's embed are a 2D unit-circle
// point (cos(i·π/2), sin(i·π/2)) for position i = 0..3. This is the same
// across all sentences — the per-head Wq/Wk rotations then produce the
// 4 different attention patterns.
//
// Token identity: dims 2..5 are a 4-dim one-hot for the token within the
// sentence (positions 2..5 of the embed; the 4 dims choose among 4 tokens).
// Dims 6, 7 are zero and reserved for the "coreference" head.

const D = 8;
const H = 4;
const D_K = D / H;
const T = 4;

const POS_ANGLES: readonly number[] = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

// Per-head Wk rotation (radians). Q uses identity; K is the input rotated.
//   head 0: rotation = π/2 → attends to position i-1
//   head 1: rotation = 0   → attends to position i (diagonal)
//   head 2: rotation = π   → attends to position i+1
//   head 3: rotation = 3π/2 → attends to position i+2
const HEAD_K_ROTATIONS: readonly number[] = [
  Math.PI / 2,
  0,
  Math.PI,
  (3 * Math.PI) / 2,
];

const HEAD_LABELS: readonly string[] = [
  'i − 1',
  'i',
  'i + 1',
  'i + 2',
];

function rotation2D(theta: number): number[][] {
  return [
    [Math.cos(theta), -Math.sin(theta)],
    [Math.sin(theta), Math.cos(theta)],
  ];
}

function zeros(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
}

function identity(n: number): number[][] {
  const m = zeros(n, n);
  for (let i = 0; i < n; i += 1) m[i]![i] = 1;
  return m;
}

/**
 * Build the per-head Wq, Wk, Wv matrices. Each is 8×8 and
 * block-diagonal with 4 2×2 head blocks. Wq, Wv are identity on
 * each block; Wk is identity for head 1, rotation by HEAD_K_ROTATIONS[h]
 * for the others.
 */
function buildHeadProjections(): {
  Wq: number[][];
  Wk: number[][];
  Wv: number[][];
} {
  const Wq = identity(D);
  const Wk = identity(D);
  const Wv = identity(D);
  for (let h = 0; h < H; h += 1) {
    const rot = rotation2D(HEAD_K_ROTATIONS[h]!);
    for (let i = 0; i < D_K; i += 1) {
      for (let j = 0; j < D_K; j += 1) {
        Wk[h * D_K + i]![h * D_K + j] = rot[i]![j]!;
      }
    }
  }
  return { Wq, Wk, Wv };
}

const { Wq: W_Q, Wk: W_K, Wv: W_V } = buildHeadProjections();
const W_O = identity(D);

// FFN: 8 → 32 → 8, with deterministic weights. The scale is large
// (≈ 1.5) so that toggling LayerNorm 2 off produces a visibly
// different output (the FFN input drifts in scale).
function buildFFN(): {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
} {
  const dFf = 32;
  // Deterministic pseudo-random W1, W2 (mulberry32-ish hash).
  const seed = (r: number, c: number, s: number): number => {
    const v = Math.sin((r + 1) * 12.9898 + (c + 1) * 78.233 + s * 43.5453);
    return (v - Math.floor(v) - 0.5) * 1.5; // uniform in [-0.75, 0.75]
  };
  const W1: number[][] = Array.from({ length: D }, (_, i) =>
    Array.from({ length: dFf }, (_, j) => seed(i, j, 1)),
  );
  const W2: number[][] = Array.from({ length: dFf }, (_, i) =>
    Array.from({ length: D }, (_, j) => seed(i, j, 2)),
  );
  const b1: number[] = new Array<number>(dFf).fill(0);
  const b2: number[] = new Array<number>(D).fill(0);
  return { W1, b1, W2, b2 };
}

const { W1, b1, W2, b2 } = buildFFN();

// LayerNorm parameters (defaults: affine identity).
const LN_GAMMA: number[] = new Array<number>(D).fill(1);
const LN_BETA: number[] = new Array<number>(D).fill(0);

// -----------------------------------------------------------------------------
// Sentences
// -----------------------------------------------------------------------------

interface Sentence {
  id: string;
  label: string;
  tokens: readonly string[];
  /** 4 × 8 hand-authored embeddings. */
  embeds: readonly (readonly number[])[];
}

function makeEmbed(positions: readonly number[], tokenId: number): number[] {
  // positions[i] is the angle (radians) for the 2D position encoding at
  // slot i. tokenId is 0..3 for the one-hot token code.
  const emb = new Array<number>(D).fill(0);
  emb[0] = Math.cos(positions[0]!);
  emb[1] = Math.sin(positions[0]!);
  emb[2 + tokenId] = 1;
  return emb;
}

const POSITIONS_0123 = POS_ANGLES; // [0, π/2, π, 3π/2]

const SENTENCES: readonly Sentence[] = [
  {
    id: 'coref',
    label: 'the cat saw the  (coreference)',
    tokens: ['the', 'cat', 'saw', 'the'],
    embeds: [
      makeEmbed([POSITIONS_0123[0]!], 0), // "the"
      makeEmbed([POSITIONS_0123[1]!], 1), // "cat"
      makeEmbed([POSITIONS_0123[2]!], 2), // "saw"
      makeEmbed([POSITIONS_0123[3]!], 0), // "the" (same token id as 0)
    ],
  },
  {
    id: 'syn',
    label: 'she runs fast now  (syntactic)',
    tokens: ['she', 'runs', 'fast', 'now'],
    embeds: [
      makeEmbed([POSITIONS_0123[0]!], 0),
      makeEmbed([POSITIONS_0123[1]!], 1),
      makeEmbed([POSITIONS_0123[2]!], 2),
      makeEmbed([POSITIONS_0123[3]!], 3),
    ],
  },
  {
    id: 'pos',
    label: 'first one then last  (positional)',
    tokens: ['first', 'one', 'then', 'last'],
    embeds: [
      makeEmbed([POSITIONS_0123[0]!], 0),
      makeEmbed([POSITIONS_0123[1]!], 1),
      makeEmbed([POSITIONS_0123[2]!], 2),
      makeEmbed([POSITIONS_0123[3]!], 3),
    ],
  },
  {
    id: 'trivial',
    label: 'a a a a  (uniform)',
    tokens: ['a', 'a', 'a', 'a'],
    embeds: [
      makeEmbed([POSITIONS_0123[0]!], 0),
      makeEmbed([POSITIONS_0123[1]!], 0),
      makeEmbed([POSITIONS_0123[2]!], 0),
      makeEmbed([POSITIONS_0123[3]!], 0),
    ],
  },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function BlockPipeline() {
  const [sentenceId, setSentenceId] = useState<string>('coref');
  const [headIdx, setHeadIdx] = useState<number>(0);
  const [showAllHeads, setShowAllHeads] = useState<boolean>(false);
  const [useRes1, setUseRes1] = useState<boolean>(true);
  const [useRes2, setUseRes2] = useState<boolean>(true);
  const [useLN1, setUseLN1] = useState<boolean>(true);
  const [useLN2, setUseLN2] = useState<boolean>(true);
  const [blockDepth, setBlockDepth] = useState<number>(1);

  const sentence = useMemo(
    () => SENTENCES.find((s) => s.id === sentenceId) ?? SENTENCES[0]!,
    [sentenceId],
  );

  // Build the input: xIn = embed + PE for the chosen sentence.
  const xIn = useMemo(() => {
    const pe = sinusoidalPE(T, D);
    return sentence.embeds.map((row, t) =>
      row.map((v, k) => v + pe[t]![k]!),
    );
  }, [sentence]);

  // Run the block N times. We collect:
  //   - the *full* intermediate trace of the LAST block (for the 4-row view)
  //   - the output of every block (for the stacked depth view)
  const { lastBlock, depthOutputs } = useMemo(() => {
    const input: TransformerBlockInput = {
      x: xIn,
      Wq: W_Q,
      Wk: W_K,
      Wv: W_V,
      Wo: W_O,
      h: H,
      W1,
      b1,
      W2,
      b2,
      lnGamma: LN_GAMMA,
      lnBeta: LN_BETA,
      causal: true,
      useLN1,
      useRes1,
      useLN2,
      useRes2,
    };
    const outputs: number[][][] = [];
    let x: readonly (readonly number[])[] = xIn;
    let last: TransformerBlockOutput = transformerBlock({ ...input, x });
    outputs.push(last.xOut);
    for (let b = 1; b < blockDepth; b += 1) {
      x = last.xOut;
      last = transformerBlock({ ...input, x });
      outputs.push(last.xOut);
    }
    return { lastBlock: last, depthOutputs: outputs };
  }, [xIn, blockDepth, useLN1, useRes1, useLN2, useRes2]);

  // Per-head attention weights and Q/K/V (for the selected head's
  // score + weight matrix in the diagram).
  const headData = useMemo(() => {
    // For each head h, the head's Q slice is the 2-dim slice of
    // xNorm1 at [h*2:h*2+2] (Wq is identity per head). The K slice is
    // the same 2 dims rotated by HEAD_K_ROTATIONS[h] (Wk is that
    // rotation per head). The V slice is identity.
    const headSlice = (
      row: readonly number[],
      h: number,
      rotate: boolean,
    ): number[] => {
      const x0 = row[h * D_K]!;
      const x1 = row[h * D_K + 1]!;
      if (!rotate) return [x0, x1];
      const theta = HEAD_K_ROTATIONS[h]!;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      return [c * x0 - s * x1, s * x0 + c * x1];
    };
    const computeHeadWeights = (h: number): number[][] => {
      const Q = lastBlock.xNorm1.map((row) => headSlice(row, h, false));
      const K = lastBlock.xNorm1.map((row) => headSlice(row, h, true));
      const scores: number[][] = Array.from({ length: T }, (_, i) =>
        Array.from({ length: T }, (_, j) => {
          let s = 0;
          for (let k = 0; k < D_K; k += 1) s += Q[i]![k]! * K[j]![k]!;
          return s / Math.sqrt(D_K);
        }),
      );
      const masked = scores.map((row, i) =>
        row.map((v, j) => (j <= i ? v : Number.NEGATIVE_INFINITY)),
      );
      return softmaxRows(masked);
    };
    const Qh = lastBlock.xNorm1.map((row) => headSlice(row, headIdx, false));
    const Kh = lastBlock.xNorm1.map((row) => headSlice(row, headIdx, true));
    const Vh = Qh; // Wv is identity per head
    // Raw (pre-softmax, pre-mask) scores, masked only for the
    // upper-triangle display.
    const rawScores: number[][] = Array.from({ length: T }, (_, i) =>
      Array.from({ length: T }, (_, j) => {
        let s = 0;
        for (let k = 0; k < D_K; k += 1) s += Qh[i]![k]! * Kh[j]![k]!;
        return s / Math.sqrt(D_K);
      }),
    );
    const scores = rawScores.map((row, i) =>
      row.map((v, j) => (j <= i ? v : Number.NEGATIVE_INFINITY)),
    );
    const weights = computeHeadWeights(headIdx);
    const allHeadWeights: number[][][] = [];
    for (let h = 0; h < H; h += 1) allHeadWeights.push(computeHeadWeights(h));
    return { Qh, Kh, Vh, scores, weights, allHeadWeights };
  }, [lastBlock, headIdx]);

  const showDepth = blockDepth > 1;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Block pipeline
        </h3>
        <div className="flex items-center gap-2 flex-wrap font-mono text-[10px] uppercase tracking-[0.18em]">
          <span className="text-dim">d_model={D}</span>
          <span className="text-border-strong">·</span>
          <span className="text-dim">h={H}</span>
          <span className="text-border-strong">·</span>
          <span className="text-dim">T={T}</span>
        </div>
      </div>

      <Controls
        sentenceId={sentenceId}
        setSentenceId={setSentenceId}
        headIdx={headIdx}
        setHeadIdx={setHeadIdx}
        showAllHeads={showAllHeads}
        setShowAllHeads={setShowAllHeads}
        useRes1={useRes1}
        setUseRes1={setUseRes1}
        useRes2={useRes2}
        setUseRes2={setUseRes2}
        useLN1={useLN1}
        setUseLN1={setUseLN1}
        useLN2={useLN2}
        setUseLN2={setUseLN2}
        blockDepth={blockDepth}
        setBlockDepth={setBlockDepth}
      />

      <div className="mt-6">
        {showDepth ? (
          <DepthView
            sentence={sentence}
            depthOutputs={depthOutputs}
            blockDepth={blockDepth}
            toggles={{
              useRes1,
              useRes2,
              useLN1,
              useLN2,
            }}
          />
        ) : (
          <DataFlow
            sentence={sentence}
            xIn={xIn}
            lastBlock={lastBlock}
            headData={headData}
            headIdx={headIdx}
            showAllHeads={showAllHeads}
            toggles={{
              useRes1,
              useRes2,
              useLN1,
              useLN2,
            }}
          />
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Controls row
// -----------------------------------------------------------------------------

interface ControlsProps {
  sentenceId: string;
  setSentenceId: (v: string) => void;
  headIdx: number;
  setHeadIdx: (v: number) => void;
  showAllHeads: boolean;
  setShowAllHeads: (v: boolean) => void;
  useRes1: boolean;
  setUseRes1: (v: boolean) => void;
  useRes2: boolean;
  setUseRes2: (v: boolean) => void;
  useLN1: boolean;
  setUseLN1: (v: boolean) => void;
  useLN2: boolean;
  setUseLN2: (v: boolean) => void;
  blockDepth: number;
  setBlockDepth: (v: number) => void;
}

function Controls(props: ControlsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
          Sentence
          <select
            value={props.sentenceId}
            onChange={(e) => props.setSentenceId(e.target.value)}
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mr-1">
          Head
        </span>
        {HEAD_LABELS.map((label, h) => (
          <button
            key={h}
            type="button"
            onClick={() => props.setHeadIdx(h)}
            className={clsx(
              'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border transition-colors',
              props.headIdx === h
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink',
            )}
            aria-pressed={props.headIdx === h}
          >
            h{h + 1}: {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => props.setShowAllHeads(!props.showAllHeads)}
          className={clsx(
            'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border transition-colors',
            props.showAllHeads
              ? 'border-accent text-accent'
              : 'border-border text-muted hover:text-ink',
          )}
          aria-pressed={props.showAllHeads}
        >
          Compare all heads
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mr-1">
          Toggles
        </span>
        <Toggle
          label="LN 1"
          on={props.useLN1}
          onChange={props.setUseLN1}
        />
        <Toggle
          label="Residual 1"
          on={props.useRes1}
          onChange={props.setUseRes1}
        />
        <Toggle
          label="LN 2"
          on={props.useLN2}
          onChange={props.setUseLN2}
        />
        <Toggle
          label="Residual 2"
          on={props.useRes2}
          onChange={props.setUseRes2}
        />
      </div>

      <div className="flex items-center gap-3 font-mono text-[12px]">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono shrink-0">
          Block depth
        </span>
        <div className="flex-1 min-w-0 max-w-[260px]">
          <Slider
            value={props.blockDepth}
            min={1}
            max={6}
            step={1}
            onChange={props.setBlockDepth}
            formatValue={(v) => String(v)}
            ariaLabel="Block depth"
          />
        </div>
      </div>
    </div>
  );
}

function Toggle({
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
      className={clsx(
        'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border transition-colors',
        on
          ? 'border-accent text-accent'
          : 'border-border text-muted hover:text-ink',
      )}
      aria-pressed={on}
    >
      {label}: {on ? 'on' : 'off'}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Data-flow view (block depth = 1)
// -----------------------------------------------------------------------------

interface TogglesState {
  useRes1: boolean;
  useRes2: boolean;
  useLN1: boolean;
  useLN2: boolean;
}

function DataFlow({
  sentence,
  xIn,
  lastBlock,
  headData,
  headIdx,
  showAllHeads,
  toggles,
}: {
  sentence: Sentence;
  xIn: number[][];
  lastBlock: TransformerBlockOutput;
  headData: {
    Qh: number[][];
    Kh: number[][];
    Vh: number[][];
    scores: number[][];
    weights: number[][];
    allHeadWeights: number[][][];
  };
  headIdx: number;
  showAllHeads: boolean;
  toggles: TogglesState;
}) {
  // Per-token row labels.
  const rowLabels = sentence.tokens;

  return (
    <div className="space-y-5 overflow-x-auto">
      {/* Token labels */}
      <div className="grid grid-cols-4 gap-3 text-center text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
        {sentence.tokens.map((t, i) => (
          <div key={i}>{t}</div>
        ))}
      </div>

      <Row
        title="Row 1 — Input"
        cells={[
          {
            kind: 'matrix',
            label: 'token embed',
            values: sentence.embeds as number[][],
            tooltip: 'token embeddings, shape (4, 8), per-token learned lookup',
          },
          { kind: 'op', op: '+' },
          {
            kind: 'matrix',
            label: 'PE',
            values: sinusoidalPE(T, D),
            tooltip: 'positional encoding, shape (4, 8), sinusoidal',
          },
          { kind: 'op', op: '=' },
          {
            kind: 'matrix',
            label: 'input x',
            values: xIn,
            tooltip: 'input to block, shape (4, 8), embed + PE',
            highlight: true,
          },
        ]}
      />

      <Row
        title="Row 2 — Pre-norm + attention"
        cells={[
          {
            kind: 'matrix',
            label: toggles.useLN1 ? 'LN1' : 'xIn',
            values: lastBlock.xNorm1,
            tooltip: toggles.useLN1
              ? 'LayerNorm 1, shape (4, 8), zero mean, unit variance per token'
              : 'LN1 disabled — xIn used directly, scale unbounded',
          },
          { kind: 'op', op: '→' },
          {
            kind: 'matrix',
            label: `Q h${headIdx + 1}`,
            values: headData.Qh,
            tooltip: `head ${headIdx + 1} query vectors, shape (4, 2)`,
          },
          {
            kind: 'matrix',
            label: `K h${headIdx + 1}`,
            values: headData.Kh,
            tooltip: `head ${headIdx + 1} key vectors, shape (4, 2)`,
          },
          {
            kind: 'matrix',
            label: `V h${headIdx + 1}`,
            values: headData.Vh,
            tooltip: `head ${headIdx + 1} value vectors, shape (4, 2)`,
          },
          { kind: 'op', op: '→' },
          {
            kind: 'score',
            label: 'scores',
            values: headData.scores,
            tooltip: `head ${headIdx + 1} scores with causal mask, shape (4, 4)`,
          },
          { kind: 'op', op: '→' },
          {
            kind: 'score',
            label: 'weights',
            values: headData.weights,
            tooltip: `head ${headIdx + 1} attention weights, shape (4, 4), row-wise softmax`,
            highlight: true,
          },
          { kind: 'op', op: '→' },
          {
            kind: 'matrix',
            label: 'attn out',
            values: lastBlock.attnOut,
            tooltip: 'multi-head attention output, shape (4, 8)',
          },
        ]}
      />

      <Row
        title="Row 3 — Residual 1 + pre-norm"
        cells={[
          {
            kind: 'matrix',
            label: 'attn out',
            values: lastBlock.attnOut,
            tooltip: 'attention output from Row 2',
          },
          { kind: 'op', op: toggles.useRes1 ? '+' : '·' },
          {
            kind: 'matrix',
            label: 'xIn',
            values: xIn,
            tooltip: 'block input from Row 1',
          },
          { kind: 'op', op: '=' },
          {
            kind: 'matrix',
            label: toggles.useRes1 ? 'h' : 'h = attn',
            values: lastBlock.residual1,
            tooltip: toggles.useRes1
              ? 'h = xIn + attn, residual stream after attention'
              : 'residual 1 disabled — h = attn out, the residual stream lost xIn',
            highlight: true,
          },
          { kind: 'op', op: '→' },
          {
            kind: 'matrix',
            label: toggles.useLN2 ? 'LN2' : 'h',
            values: lastBlock.xNorm2,
            tooltip: toggles.useLN2
              ? 'LayerNorm 2, shape (4, 8), zero mean, unit variance per token'
              : 'LN2 disabled — h used directly, FFN input scale unbounded',
          },
        ]}
      />

      <Row
        title="Row 4 — FFN + residual 2"
        cells={[
          {
            kind: 'matrix',
            label: 'LN2',
            values: lastBlock.xNorm2,
            tooltip: 'LayerNorm 2 output from Row 3',
          },
          { kind: 'op', op: '→' },
          {
            kind: 'matrix',
            label: 'FFN out',
            values: lastBlock.ffnOut,
            tooltip: 'two-layer FFN output, shape (4, 8), GELU activation',
          },
          { kind: 'op', op: toggles.useRes2 ? '+' : '·' },
          {
            kind: 'matrix',
            label: 'h',
            values: lastBlock.residual1,
            tooltip: 'residual stream h from Row 3',
          },
          { kind: 'op', op: '=' },
          {
            kind: 'matrix',
            label: 'block out',
            values: lastBlock.xOut,
            tooltip: 'block output, shape (4, 8), feeds the next block',
            highlight: true,
          },
        ]}
      />

      {showAllHeads && (
        <div className="rounded-lg border border-border bg-bg/40 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">
            All heads: attention weights
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {headData.allHeadWeights.map((w, h) => (
              <div key={h} className="flex flex-col items-center">
                <div className="text-[9px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
                  h{h + 1} ({HEAD_LABELS[h]})
                </div>
                <Heatmap
                  values={w}
                  colormap="accent"
                  cellSize={20}
                  precision={2}
                  compact
                  ariaLabel={`head ${h + 1} attention weights, shape (4, 4)`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RowCell {
  kind: 'matrix' | 'score' | 'op';
  label?: string;
  values?: number[][];
  tooltip?: string;
  op?: string;
  highlight?: boolean;
}

function Row({ title, cells }: { title: string; cells: RowCell[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg/30 p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
        {title}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {cells.map((cell, i) => (
          <RowCellView key={i} cell={cell} />
        ))}
      </div>
    </div>
  );
}

function RowCellView({ cell }: { cell: RowCell }) {
  if (cell.kind === 'op') {
    return (
      <div className="text-muted font-mono text-[16px] px-1 select-none">
        {cell.op}
      </div>
    );
  }
  const isMatrix = cell.kind === 'matrix';
  return (
    <div
      className={clsx(
        'flex flex-col items-center shrink-0',
        cell.highlight && 'ring-1 ring-accent/40 rounded p-1',
      )}
      title={cell.tooltip}
    >
      <div className="text-[9px] uppercase tracking-[0.18em] text-dim font-mono mb-1">
        {cell.label}
      </div>
      <Heatmap
        values={cell.values!}
        colormap={isMatrix ? 'diverging' : 'accent'}
        cellSize={isMatrix ? 14 : 18}
        precision={2}
        compact
        ariaLabel={cell.tooltip ?? cell.label}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Depth view (block depth ≥ 2)
// -----------------------------------------------------------------------------

function DepthView({
  sentence,
  depthOutputs,
  blockDepth,
  toggles,
}: {
  sentence: Sentence;
  depthOutputs: number[][][];
  blockDepth: number;
  toggles: TogglesState;
}) {
  // For the depth view, also report the cosine similarity of each
  // block's output to the original input embedding (the "drift" story).
  const drift = useMemo(() => {
    const pe = sinusoidalPE(T, D);
    const input = sentence.embeds.map((row, t) =>
      row.map((v, k) => v + pe[t]![k]!),
    );
    return depthOutputs.map((out) => {
      // Average cosine similarity across the 4 tokens.
      let total = 0;
      for (let t = 0; t < T; t += 1) {
        let dot = 0;
        let na = 0;
        let nb = 0;
        for (let k = 0; k < D; k += 1) {
          const a = input[t]![k]!;
          const b = out[t]![k]!;
          dot += a * b;
          na += a * a;
          nb += b * b;
        }
        total += dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
      }
      return total / T;
    });
  }, [sentence, depthOutputs]);

  return (
    <div className="space-y-4 overflow-x-auto">
      <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
        Block depth view ({blockDepth} blocks stacked; toggles apply to every block)
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <div className="space-y-2">
          {depthOutputs.map((out, b) => (
            <div
              key={b}
              className="rounded-lg border border-border bg-bg/30 p-2 flex items-center gap-3"
              title={`output of block ${b + 1}, shape (4, 8)`}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono shrink-0 w-16">
                block {b + 1}
              </div>
              <Heatmap
                values={out}
                colormap="diverging"
                cellSize={12}
                precision={2}
                compact
                rowLabels={sentence.tokens as string[]}
                ariaLabel={`output of block ${b + 1}, shape (4, 8)`}
              />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-bg/30 p-3 min-w-[180px]">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Drift from input
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {drift.map((c, b) => (
              <div key={b} className="flex items-center justify-between gap-2">
                <span className="text-dim">block {b + 1}</span>
                <span className={clsx('tabular-nums', c < 0.5 ? 'text-amber-300' : 'text-ink')}>
                  {c.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-dim font-mono leading-relaxed">
            Cosine similarity of each block's output to the original input.
            With residual + LN, the stream stays close to 1. Without,
            it drifts toward 0 (or negative).
          </div>
          {(!toggles.useRes1 || !toggles.useRes2) && (
            <div className="mt-2 text-[10px] text-amber-300 font-mono leading-relaxed">
              ⚠ a residual is off — drift accelerates with depth.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
