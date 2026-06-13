'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { BarChart } from '@/components/sim/primitives/BarChart';
import {
  effectiveDistribution,
  greedyDecode,
  temperatureSample,
  topKSample,
  topPSample,
  type SamplingStrategy,
} from '@/lib/math/sampling';

const NEXT_TOKEN_CANDIDATES: readonly string[] = [
  'cat',
  'dog',
  'rabbit',
  'hamster',
  'parrot',
  'sat',
  'stood',
  'on',
  'under',
  'the',
  'a',
  'mat',
];

// Hand-tuned logits for "The cat sat on the ___". The model
// thinks "mat" is the most likely, with a few near-tied
// alternatives.
const LOGITS: readonly number[] = [
  0.3, // cat
  0.4, // dog
  -0.5, // rabbit
  -1.2, // hamster
  -0.8, // parrot
  -1.5, // sat
  -1.0, // stood
  0.8, // on
  -0.6, // under
  0.2, // the
  0.0, // a
  1.5, // mat
];

function fmt(x: number): string {
  if (Math.abs(x) < 0.005) return (0).toFixed(3);
  return x.toFixed(3);
}

interface StrategyParams {
  temperature: number;
  k: number;
  p: number;
}

function getEffective(
  strategy: SamplingStrategy,
  params: StrategyParams,
): number[] {
  return effectiveDistribution(LOGITS, strategy, {
    temperature: params.temperature,
    k: params.k,
    p: params.p,
  });
}

/**
 * Centerpiece for the sampling-and-decoding lesson.
 *
 * A vocabulary of 12 plausible next-tokens after "The cat sat
 * on the ___". The reader picks a strategy and tunes its
 * parameter; the bar chart shows the *effective* sampling
 * distribution (the post-strategy probabilities). A "Sample
 * 100 times" button shows the empirical distribution and
 * makes the strategy+parameter story concrete.
 */
export function SamplingDecodingExplorer() {
  const [strategy, setStrategy] = useState<SamplingStrategy>('temperature');
  const [params, setParams] = useState<StrategyParams>({
    temperature: 1.0,
    k: 5,
    p: 0.9,
  });
  const [empirical, setEmpirical] = useState<number[] | null>(null);
  const [seed, setSeed] = useState<number>(0);

  const effective = useMemo(
    () => getEffective(strategy, params),
    [strategy, params.temperature, params.k, params.p],
  );
  const dominant = useMemo(() => {
    let bestIdx = 0;
    let bestVal = effective[0] ?? 0;
    for (let i = 1; i < effective.length; i += 1) {
      if ((effective[i] ?? 0) > bestVal) {
        bestVal = effective[i] ?? 0;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [effective]);

  const sample = () => {
    let idx: number;
    switch (strategy) {
      case 'greedy':
        idx = greedyDecode(LOGITS);
        break;
      case 'temperature':
        idx = temperatureSample(LOGITS, params.temperature, seed + 1);
        break;
      case 'top-k':
        idx = topKSample(LOGITS, params.k, params.temperature, seed + 1);
        break;
      case 'top-p':
        idx = topPSample(LOGITS, params.p, params.temperature, seed + 1);
        break;
    }
    return idx;
  };

  const sample100 = () => {
    const counts = new Array<number>(LOGITS.length).fill(0);
    for (let s = 0; s < 100; s += 1) {
      const idx = sampleOnce(strategy, params, s + 1);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    return counts.map((c) => c / 100);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
          Sampling explorer
        </h3>
        <button
          type="button"
          onClick={() => {
            setEmpirical(sample100());
            setSeed((s) => s + 1);
          }}
          className="text-[11px] uppercase tracking-[0.18em] font-mono text-accent hover:text-accent-hover transition-colors border border-accent px-2 py-0.5 rounded"
        >
          Sample 100 times
        </button>
      </div>

      {/* Prompt */}
      <div className="text-[12px] text-muted font-mono mb-5">
        <span className="text-dim">Prompt: </span>
        <span className="text-ink">The cat sat on the ___</span>
      </div>

      {/* Strategy tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mr-1">
          Strategy
        </span>
        {(
          [
            { id: 'greedy', label: 'Greedy' },
            { id: 'temperature', label: 'Temperature' },
            { id: 'top-k', label: 'Top-k' },
            { id: 'top-p', label: 'Top-p' },
          ] as { id: SamplingStrategy; label: string }[]
        ).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStrategy(s.id)}
            className={
              'text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border transition-colors ' +
              (strategy === s.id
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink')
            }
            aria-pressed={strategy === s.id}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Parameter sliders */}
      <section className="mb-5 space-y-3">
        {strategy !== 'greedy' && (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Temperature
              </span>
              <span className="text-ink font-mono tabular-nums text-[12px]">
                T = {params.temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              value={params.temperature}
              min={0.1}
              max={3.0}
              step={0.05}
              onChange={(v) =>
                setParams((p) => ({ ...p, temperature: v }))
              }
              formatValue={(v) => v.toFixed(2)}
              ariaLabel="Temperature"
            />
          </div>
        )}
        {strategy === 'top-k' && (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Top-k
              </span>
              <span className="text-ink font-mono tabular-nums text-[12px]">
                k = {params.k}
              </span>
            </div>
            <Slider
              value={params.k}
              min={1}
              max={LOGITS.length}
              step={1}
              onChange={(v) => setParams((p) => ({ ...p, k: Math.round(v) }))}
              formatValue={(v) => String(Math.round(v))}
              ariaLabel="Top-k"
            />
          </div>
        )}
        {strategy === 'top-p' && (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
                Top-p
              </span>
              <span className="text-ink font-mono tabular-nums text-[12px]">
                p = {params.p.toFixed(2)}
              </span>
            </div>
            <Slider
              value={params.p}
              min={0.1}
              max={1.0}
              step={0.01}
              onChange={(v) => setParams((p) => ({ ...p, p: v }))}
              formatValue={(v) => v.toFixed(2)}
              ariaLabel="Top-p"
            />
          </div>
        )}
      </section>

      {/* Distribution bars */}
      <section aria-label="Effective sampling distribution" className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
            Effective sampling distribution
          </div>
          <div className="text-[10px] text-dim font-mono tabular-nums">
            mode ={' '}
            <span className="text-accent">{NEXT_TOKEN_CANDIDATES[dominant]}</span>
          </div>
        </div>
        <BarChart
          values={effective}
          highlightIndex={dominant}
          labels={NEXT_TOKEN_CANDIDATES}
          height={200}
          ariaLabel={`Effective sampling distribution. Most-likely token: ${NEXT_TOKEN_CANDIDATES[dominant]}.`}
        />
      </section>

      {/* Empirical */}
      {empirical && (
        <section aria-label="Empirical distribution" className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">
            Empirical distribution (100 samples)
          </div>
          <BarChart
            values={empirical}
            highlightIndex={dominant}
            labels={NEXT_TOKEN_CANDIDATES}
            height={160}
            ariaLabel={`Empirical distribution from 100 samples. The dominant mode is ${NEXT_TOKEN_CANDIDATES[dominant]}.`}
          />
        </section>
      )}

      <div className="flex items-baseline justify-between pt-3 border-t border-border text-[11px] font-mono text-muted">
        <button
          type="button"
          onClick={() => {
            const idx = sample();
            setEmpirical(null);
            // Highlight the sampled token by making a brief toast
            // in the top bar.
            setParams((p) => ({ ...p }));
            setSeed((s) => s + 1);
            alert(
              `Sampled: "${NEXT_TOKEN_CANDIDATES[idx]}" (strategy = ${strategy})`,
            );
          }}
          className="text-accent hover:text-accent-hover transition-colors"
        >
          Sample once →
        </button>
        <span>logits are static; the strategy chooses how to interpret them.</span>
      </div>
    </div>
  );
}

function sampleOnce(
  strategy: SamplingStrategy,
  params: StrategyParams,
  seed: number,
): number {
  switch (strategy) {
    case 'greedy':
      return greedyDecode(LOGITS);
    case 'temperature':
      return temperatureSample(LOGITS, params.temperature, seed);
    case 'top-k':
      return topKSample(LOGITS, params.k, params.temperature, seed);
    case 'top-p':
      return topPSample(LOGITS, params.p, params.temperature, seed);
  }
}
