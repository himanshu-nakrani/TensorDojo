'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { CORPUS, QUERIES, rankDocs, topK } from '@/lib/math/rag';

/**
 * Demonstrate retrieval-augmented generation against a toy 10-doc
 * corpus. The user picks one of the preset queries; the centerpiece
 * shows the cosine similarity of each document, the top-k panel that
 * would get pasted into the LLM prompt, and a "prompt preview" panel
 * showing the actual text the LLM would see.
 */
export function RagExplorer() {
  const [queryId, setQueryId] = useState<string>(QUERIES[0]!.id);
  const [k, setK] = useState(3);

  const query = QUERIES.find((q) => q.id === queryId)!;
  const ranked = useMemo(
    () => rankDocs(query.embedding, CORPUS),
    [query],
  );
  const top = useMemo(() => topK(ranked, k), [ranked, k]);
  const topScore = ranked[0]?.score ?? 0;

  // Threshold heuristic: below 0.6 the top match is weak enough that
  // a production system would refuse to answer.
  const lowConfidence = topScore < 0.6;

  return (
    <SimFrame
      title="RAG: retrieve top-k, then generate"
      onReset={() => {
        setQueryId(QUERIES[0]!.id);
        setK(3);
      }}
    >
      {/* Query picker */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
          query
        </div>
        <div className="flex flex-wrap gap-2">
          {QUERIES.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setQueryId(q.id)}
              aria-pressed={queryId === q.id}
              className={clsx(
                'text-[12px] font-mono px-2.5 py-1 rounded border focus-ring transition-colors text-left',
                queryId === q.id
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-muted hover:text-ink hover:border-border-strong',
              )}
            >
              {q.text}
            </button>
          ))}
        </div>
      </div>

      {/* k slider */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label
              htmlFor="rag-k"
              className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
            >
              top-k retrieved
            </label>
            <span className="font-mono text-[14px] text-accent tabular-nums">
              {k}
            </span>
          </div>
          <input
            id="rag-k"
            type="range"
            min={1}
            max={CORPUS.length}
            step={1}
            value={k}
            onChange={(e) => setK(parseInt(e.target.value, 10))}
            className="w-full accent-[rgb(var(--accent))]"
          />
        </div>
        <div className="rounded-md border border-border bg-bg/40 px-3 py-2 flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            top match score
          </span>
          <span
            className={clsx(
              'text-[14px] font-mono tabular-nums',
              lowConfidence
                ? 'text-[rgb(var(--negative))]'
                : 'text-accent',
            )}
          >
            {topScore.toFixed(3)}
            {lowConfidence && (
              <span className="ml-2 text-[10px] uppercase tracking-[0.12em]">
                low confidence
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* All-docs ranked list */}
        <RankedList ranked={ranked} k={k} />
        {/* Synthesized prompt preview */}
        <PromptPreview query={query.text} top={top} lowConfidence={lowConfidence} />
      </div>
    </SimFrame>
  );
}

function RankedList({
  ranked,
  k,
}: {
  ranked: ReturnType<typeof rankDocs>;
  k: number;
}) {
  const maxScore = Math.max(...ranked.map((r) => r.score), 0.01);
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
        cosine similarity · all {ranked.length} documents
      </div>
      <div className="space-y-1.5">
        {ranked.map((r, i) => {
          const inTopK = i < k;
          const widthPct = (r.score / maxScore) * 100;
          return (
            <div
              key={r.doc.id}
              className="grid grid-cols-[1fr_56px_42px] items-center gap-2"
            >
              <span
                className={clsx(
                  'text-[11px] font-mono truncate',
                  inTopK ? 'text-accent font-semibold' : 'text-fg-muted',
                )}
              >
                {r.doc.title}
              </span>
              <div className="h-3 rounded-sm bg-bg/40 border border-border overflow-hidden">
                <div
                  className={clsx(
                    'h-full',
                    inTopK
                      ? 'bg-[rgb(var(--accent))]'
                      : 'bg-fg-subtle',
                  )}
                  style={{
                    width: `${widthPct}%`,
                    opacity: inTopK ? 0.85 : 0.4,
                  }}
                />
              </div>
              <span
                className={clsx(
                  'text-[10px] font-mono tabular-nums text-right',
                  inTopK ? 'text-accent' : 'text-fg-muted',
                )}
              >
                {r.score.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PromptPreview({
  query,
  top,
  lowConfidence,
}: {
  query: string;
  top: ReturnType<typeof topK>;
  lowConfidence: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
        prompt sent to the LLM
      </div>
      <div className="text-[11px] font-mono leading-relaxed text-ink space-y-2">
        <div className="text-fg-muted">
          Answer the question using only the context below.
        </div>
        <div>
          <div className="text-fg-subtle uppercase tracking-[0.12em] text-[10px] mb-1">
            Context
          </div>
          {top.map((r) => (
            <div
              key={r.doc.id}
              className="border-l-2 border-accent/40 pl-2 mb-2"
            >
              <div className="text-accent text-[10px] mb-0.5">
                [{r.doc.title}]
              </div>
              <div className="text-ink">{r.doc.text}</div>
            </div>
          ))}
        </div>
        <div>
          <span className="text-fg-subtle uppercase tracking-[0.12em] text-[10px]">
            Question
          </span>{' '}
          <span>{query}</span>
        </div>
        <div className="text-fg-subtle">Answer:</div>
      </div>
      {lowConfidence && (
        <div className="mt-3 text-[11px] text-[rgb(var(--negative))] font-mono">
          → A production system would likely refuse to answer at this confidence.
        </div>
      )}
    </div>
  );
}
