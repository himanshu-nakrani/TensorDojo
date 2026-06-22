'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

/**
 * Toy weight-tying demo.
 *
 * A handful of tokens with 2D embeddings (so they can be drawn).
 * The hidden state h is a unit-vector controlled by an angle slider.
 * The output logit for each token is dot(h, E[v]) — the same matrix
 * used for the input embedding is used to score the output.
 *
 * The points are arranged in semantic clusters (function words near
 * each other, animals near each other, verbs near each other) so the
 * "rotate h toward this cluster, watch its logits rise together"
 * lesson is visible.
 */

interface Token {
  word: string;
  x: number;
  y: number;
  cluster: 'animal' | 'function' | 'verb';
}

// Hand-placed embeddings; cluster geometry is what the lesson is about.
const TOKENS: Token[] = [
  // Animals (top-right)
  { word: 'cat', x: 0.85, y: 0.55, cluster: 'animal' },
  { word: 'dog', x: 0.95, y: 0.45, cluster: 'animal' },
  { word: 'kitten', x: 0.75, y: 0.65, cluster: 'animal' },
  { word: 'puppy', x: 0.85, y: 0.35, cluster: 'animal' },
  // Function words (bottom-right)
  { word: 'the', x: 0.55, y: -0.85, cluster: 'function' },
  { word: 'and', x: 0.45, y: -0.95, cluster: 'function' },
  { word: 'of', x: 0.65, y: -0.75, cluster: 'function' },
  // Verbs (left)
  { word: 'run', x: -0.9, y: 0.2, cluster: 'verb' },
  { word: 'jump', x: -0.85, y: 0.35, cluster: 'verb' },
  { word: 'sit', x: -0.95, y: 0.1, cluster: 'verb' },
];

const CLUSTER_COLOR: Record<Token['cluster'], string> = {
  animal: 'fill-[rgb(15,118,110)]',
  function: 'fill-[rgb(180,83,9)]',
  verb: 'fill-[rgb(67,56,202)]',
};

export function WeightTyingExplorer() {
  const [angleDeg, setAngleDeg] = useState(33);
  const [V, setV] = useState(128000);
  const [d, setD] = useState(4096);

  // Normalize embeddings to unit length so logits are bounded in [-1, 1].
  const tokens = useMemo(() => {
    return TOKENS.map((t) => {
      const r = Math.hypot(t.x, t.y);
      return { ...t, x: t.x / r, y: t.y / r };
    });
  }, []);

  const angle = (angleDeg * Math.PI) / 180;
  const hx = Math.cos(angle);
  const hy = Math.sin(angle);

  const logits = useMemo(() => {
    return tokens.map((t) => ({
      word: t.word,
      cluster: t.cluster,
      logit: t.x * hx + t.y * hy,
    }));
  }, [tokens, hx, hy]);

  const sorted = useMemo(
    () => [...logits].sort((a, b) => b.logit - a.logit),
    [logits],
  );

  const savedParams = V * d;
  const untiedTotal = 2 * V * d;
  const tiedTotal = V * d;

  return (
    <SimFrame
      title="Weight tying: input embedding == output projection"
      onReset={() => {
        setAngleDeg(33);
        setV(128000);
        setD(4096);
      }}
    >
      {/* Hidden state direction */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <label
            htmlFor="wt-angle"
            className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
          >
            hidden state direction
          </label>
          <span className="font-mono text-[14px] text-accent tabular-nums">
            {angleDeg.toFixed(0)}°
          </span>
        </div>
        <input
          id="wt-angle"
          type="range"
          min={0}
          max={359}
          step={1}
          value={angleDeg}
          onChange={(e) => setAngleDeg(parseFloat(e.target.value))}
          className="w-full accent-[rgb(var(--accent))]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 2D plot */}
        <EmbeddingPlot tokens={tokens} hx={hx} hy={hy} />
        {/* Logits as a bar chart */}
        <LogitsList sorted={sorted} />
      </div>

      {/* Param savings */}
      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
          parameter cost of the embed + output-projection pair
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <Slider
            id="wt-V"
            label="vocabulary V"
            value={V}
            min={1000}
            max={200000}
            step={1000}
            format={(v) => v.toLocaleString()}
            onChange={setV}
          />
          <Slider
            id="wt-d"
            label="hidden width d"
            value={d}
            min={128}
            max={8192}
            step={128}
            format={(v) => v.toLocaleString()}
            onChange={setD}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat
            label="untied"
            value={`${(untiedTotal / 1e6).toFixed(0)}M params`}
            tone="muted"
          />
          <Stat
            label="tied"
            value={`${(tiedTotal / 1e6).toFixed(0)}M params`}
            tone="accent"
          />
          <Stat
            label="saved"
            value={`${(savedParams / 1e6).toFixed(0)}M params (-50%)`}
            tone="accent"
          />
        </div>
      </div>
    </SimFrame>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label
          htmlFor={id}
          className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
        >
          {label}
        </label>
        <span className="font-mono text-[14px] text-accent tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[rgb(var(--accent))]"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'accent' | 'muted';
}) {
  return (
    <div className="rounded-md border border-border bg-bg/40 px-3 py-2 flex flex-col">
      <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
        {label}
      </span>
      <span
        className={clsx(
          'text-[14px] font-mono tabular-nums',
          tone === 'accent' ? 'text-accent' : 'text-fg-muted',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function EmbeddingPlot({
  tokens,
  hx,
  hy,
}: {
  tokens: readonly Token[];
  hx: number;
  hy: number;
}) {
  const W = 280;
  const H = 280;
  const cx = W / 2;
  const cy = H / 2;
  const R = 110;

  const toScreen = (x: number, y: number) => ({
    x: cx + x * R,
    y: cy - y * R,
  });

  const h = toScreen(hx, hy);

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
        embedding space (2D toy · V = 10)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
        {/* Unit circle */}
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          className="stroke-border"
          strokeWidth={0.75}
          strokeDasharray="3 3"
        />
        {/* Axes */}
        <line
          x1={0}
          x2={W}
          y1={cy}
          y2={cy}
          className="stroke-border"
          strokeWidth={0.5}
        />
        <line
          x1={cx}
          x2={cx}
          y1={0}
          y2={H}
          className="stroke-border"
          strokeWidth={0.5}
        />
        {/* Hidden-state arrow */}
        <line
          x1={cx}
          y1={cy}
          x2={h.x}
          y2={h.y}
          className="stroke-accent"
          strokeWidth={2}
          markerEnd="url(#wt-arrow)"
        />
        <defs>
          <marker
            id="wt-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" className="fill-accent" />
          </marker>
        </defs>
        {/* Token points */}
        {tokens.map((t) => {
          const p = toScreen(t.x, t.y);
          return (
            <g key={t.word}>
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                className={CLUSTER_COLOR[t.cluster]}
                fillOpacity={0.85}
              />
              <text
                x={p.x + (t.x >= 0 ? 6 : -6)}
                y={p.y - 4}
                textAnchor={t.x >= 0 ? 'start' : 'end'}
                fontSize={10}
                fontFamily="monospace"
                className="fill-ink"
              >
                {t.word}
              </text>
            </g>
          );
        })}
        {/* h label */}
        <text
          x={h.x + 6}
          y={h.y - 4}
          fontSize={11}
          fontFamily="monospace"
          className="fill-accent"
        >
          h
        </text>
      </svg>
      <div className="mt-1 text-[10px] font-mono text-fg-subtle text-center">
        each dot is a row of E · h is the hidden state at the output
      </div>
    </div>
  );
}

function LogitsList({
  sorted,
}: {
  sorted: readonly { word: string; cluster: Token['cluster']; logit: number }[];
}) {
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.logit)), 0.1);

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-3">
        output logits = E · h (sorted)
      </div>
      <div className="space-y-1.5">
        {sorted.map((s, i) => {
          const pct = (Math.abs(s.logit) / maxAbs) * 100;
          const isTop = i === 0;
          return (
            <div key={s.word} className="flex items-center gap-3">
              <span
                className={clsx(
                  'text-[12px] font-mono w-14 truncate',
                  isTop ? 'text-accent font-semibold' : 'text-fg-muted',
                )}
              >
                {s.word}
              </span>
              <div className="relative flex-1 h-4 rounded-sm bg-bg/40 border border-border overflow-hidden">
                <div
                  className={clsx(
                    'absolute top-0 h-full',
                    s.logit >= 0
                      ? 'bg-[rgb(var(--accent))] left-1/2'
                      : 'bg-[rgb(var(--negative))] right-1/2',
                  )}
                  style={{
                    width: `${pct / 2}%`,
                    opacity: isTop ? 0.9 : 0.5,
                  }}
                />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-strong" />
              </div>
              <span
                className={clsx(
                  'text-[11px] font-mono w-14 text-right tabular-nums',
                  isTop ? 'text-accent font-semibold' : 'text-fg-muted',
                )}
              >
                {s.logit >= 0 ? '+' : ''}
                {s.logit.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
