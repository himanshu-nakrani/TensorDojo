'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Centerpiece sim for the speculative-decoding lesson. Step
 * through draft rounds. The draft model proposes γ tokens; on
 * the first rejected token, the target's correction replaces
 * it and a new draft round starts from there.
 *
 * The point of the visualization is the *rhythm*: long
 * accept-runs are pure speedup; on a rejection, the round
 * truncates and we restart. The acceptance rate determines
 * the average run length.
 */

const TOKENS = [
  'The', 'quick', 'brown', 'fox', 'jumped', 'over', 'the', 'lazy',
  'dog', 'while', 'the', 'cat', 'watched', 'from', 'the', 'fence',
  '.', 'Then', 'the', 'cat', 'yawned', 'and', 'went', 'inside',
];
const GAMMA_OPTIONS = [2, 4, 8] as const;
type Gamma = (typeof GAMMA_OPTIONS)[number];
const ALPHA_OPTIONS = [
  { label: 'α=0.3 (hostile)', alpha: 0.3 },
  { label: 'α=0.7 (typical)', alpha: 0.7 },
  { label: 'α=0.9 (easy text)', alpha: 0.9 },
] as const;

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type CellState = 'accepted' | 'rejected' | 'correction';
interface Cell {
  text: string;
  state: CellState;
  roundIdx: number;
}

export function SpeculativeRounds() {
  const [gamma, setGamma] = useState<Gamma>(4);
  const [alphaIdx, setAlphaIdx] = useState(1);
  const [seed, setSeed] = useState(3);

  const alpha = ALPHA_OPTIONS[alphaIdx]!.alpha;

  // Build the full token sequence with per-cell state. We
  // simulate rounds until we exhaust TOKENS.
  const { cells, rounds, totalAccepted } = useMemo(() => {
    const rng = mulberry32(seed * 1000 + gamma * 100 + alphaIdx);
    const out: Cell[] = [];
    let pos = 0;
    let r = 0;
    while (pos < TOKENS.length) {
      // Draft γ tokens, sequentially accept/reject.
      let acceptedThisRound = 0;
      for (let i = 0; i < gamma && pos < TOKENS.length; i++) {
        if (rng() < alpha) {
          out.push({ text: TOKENS[pos]!, state: 'accepted', roundIdx: r });
          pos++;
          acceptedThisRound++;
        } else {
          // Reject this draft, target's correction takes its place
          // and the round ends.
          out.push({ text: TOKENS[pos]!, state: 'rejected', roundIdx: r });
          pos++;
          break;
        }
      }
      // If we accepted all γ without rejection, the target appends
      // its own +1 bonus token (always accepted).
      if (acceptedThisRound === gamma && pos < TOKENS.length) {
        out.push({ text: TOKENS[pos]!, state: 'correction', roundIdx: r });
        pos++;
      }
      r++;
    }
    const totalAcc = out.filter((c) => c.state !== 'rejected').length;
    return { cells: out, rounds: r, totalAccepted: totalAcc };
  }, [seed, gamma, alphaIdx, alpha]);

  const tokensPerRound = totalAccepted / Math.max(1, rounds);

  const reset = () => {
    setGamma(4);
    setAlphaIdx(1);
    setSeed(3);
  };

  return (
    <SimFrame
      title="Speculative draft rounds: accept, reject, correct"
      headerWrap
      headerAction={
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {GAMMA_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGamma(g)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  gamma === g
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                γ={g}
              </button>
            ))}
          </div>
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {ALPHA_OPTIONS.map((a, i) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setAlphaIdx(i)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  alphaIdx === i
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Re-sample
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Reset
          </button>
        </div>
      }
    >
      <div className="border border-border rounded p-4 bg-surface mb-4">
        <div className="flex flex-wrap gap-1 font-mono text-[12px] leading-relaxed">
          {cells.map((c, i) => {
            const prevRound = i > 0 ? cells[i - 1]!.roundIdx : -1;
            const newRound = c.roundIdx !== prevRound;
            return (
              <span key={i} className="contents">
                {newRound && i > 0 && (
                  <span className="w-2 h-5 inline-block" aria-hidden />
                )}
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded border',
                    c.state === 'accepted' &&
                      'border-accent/40 bg-accent-soft text-ink',
                    c.state === 'rejected' &&
                      'border-[rgb(var(--negative))] bg-[rgb(var(--negative)/0.12)] text-[rgb(var(--negative))] line-through',
                    c.state === 'correction' &&
                      'border-accent bg-accent-soft text-accent font-semibold',
                  )}
                  title={`round ${c.roundIdx + 1} · ${c.state}`}
                >
                  {c.text}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border font-mono text-[11px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Rounds
          </div>
          <div className="text-ink tabular-nums">{rounds}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Tokens produced
          </div>
          <div className="text-ink tabular-nums">{totalAccepted}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Tokens per round (this run)
          </div>
          <div className="text-accent tabular-nums">
            {tokensPerRound.toFixed(2)}×
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Green tokens are accepted from the draft model. Red strikethroughs
        are draft tokens the target rejected — the target's corrective
        token (filled accent) starts the next round at that position. Each
        round costs <span className="text-ink">one</span> big-model forward
        pass plus γ cheap draft passes; if the draft is much cheaper than
        the target, "tokens per round" is roughly the speedup factor.
        At α=0.7 typical speech tokens, this is ~2-3× without any quality
        loss.
      </p>
    </SimFrame>
  );
}
