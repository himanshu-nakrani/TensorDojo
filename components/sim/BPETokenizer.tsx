'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { EOW, encode, learnBPE } from '@/lib/math/bpe';

/**
 * Three small pre-built corpora trained at different merge budgets.
 * The point is to show that the same input string tokenizes
 * differently depending on what the vocabulary was trained on and
 * how many merges it ran for.
 */
const VOCABS: ReadonlyArray<{
  id: string;
  label: string;
  corpus: readonly string[];
  numMerges: number;
}> = [
  {
    id: 'small',
    label: 'Small (few merges)',
    corpus: ['the cat sat on the mat. the dog sat too.'],
    numMerges: 4,
  },
  {
    id: 'verbs',
    label: 'Trained on -er / -est words',
    corpus: [
      'low low low low low lower lower lowest lowest',
      'new new newer newer newer newest newest newest',
      'wide wider widest widest widest',
    ],
    numMerges: 14,
  },
  {
    id: 'tech',
    label: 'Trained on programming words',
    corpus: [
      'function function class class class import import import import',
      'return return return return value value value variable variable',
      'object object array array string string string number number',
    ],
    numMerges: 16,
  },
];

const DEFAULT_INPUT = 'lowest newer widely';

export function BPETokenizer() {
  const [vocabId, setVocabId] = useState<string>(VOCABS[1]!.id);
  const [input, setInput] = useState<string>(DEFAULT_INPUT);

  const vocabDef = VOCABS.find((v) => v.id === vocabId) ?? VOCABS[1]!;
  const training = useMemo(
    () => learnBPE(vocabDef.corpus, vocabDef.numMerges),
    [vocabDef],
  );
  const tokens = useMemo(
    () => encode(input, training.merges),
    [input, training],
  );

  // Color tokens with a small rotating palette so adjacent tokens are
  // easy to tell apart. Same token in different positions gets the
  // same color so the reader can spot repeats.
  const palette = useMemo(() => buildPalette(tokens), [tokens]);

  const reset = () => {
    setVocabId(VOCABS[1]!.id);
    setInput(DEFAULT_INPUT);
  };

  return (
    <SimFrame title="BPE tokenizer" onReset={reset}>
      <div className="space-y-4 font-mono text-[12px]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Input string
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="number-input font-mono w-full text-left"
              aria-label="Input string to tokenize"
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Vocabulary
            </div>
            <select
              value={vocabId}
              onChange={(e) => setVocabId(e.target.value)}
              className="number-input font-mono w-full text-left"
              aria-label="Pretrained vocabulary"
            >
              {VOCABS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
              Tokens
            </div>
            <div className="text-[11px] text-dim font-mono tabular-nums">
              <span className="text-ink">{tokens.length}</span> tokens
              {' · '}
              <span className="text-ink">{vocabDef.numMerges}</span> merges in this vocab
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tokens.length === 0 ? (
              <span className="text-dim text-[11px]">— empty —</span>
            ) : (
              tokens.map((tok, i) => (
                <span
                  key={i}
                  className={clsx(
                    'px-1.5 py-0.5 rounded border',
                    palette.get(tok) ?? 'border-border text-ink bg-bg-elevated',
                  )}
                  title={tok}
                >
                  {tok}
                </span>
              ))
            )}
          </div>
        </div>

        <p className="text-[11px] text-dim font-mono leading-relaxed pt-2">
          Type any word. With fewer merges, every word breaks into more,
          smaller pieces. With more merges trained on the right corpus,
          common subwords collapse to single tokens. <span className="text-ink">{EOW}</span> marks
          the end of a word — that&apos;s how BPE distinguishes <span className="text-ink">low{EOW}</span> from <span className="text-ink">low</span> (a prefix).
        </p>
      </div>
    </SimFrame>
  );
}

/**
 * Map each unique token to a Tailwind class string. Stable across
 * re-renders for the same set of tokens.
 */
const COLORS: readonly string[] = [
  'border-accent text-accent bg-accent-soft',
  'border-border text-ink bg-bg-elevated',
  'border-border-strong text-muted bg-bg-elevated',
  'border-accent/60 text-accent/90 bg-accent-soft/60',
];
function buildPalette(tokens: readonly string[]): Map<string, string> {
  const unique = Array.from(new Set(tokens));
  const out = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 1) {
    out.set(unique[i]!, COLORS[i % COLORS.length]!);
  }
  return out;
}
