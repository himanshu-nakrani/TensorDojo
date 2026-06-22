'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

const MIN = 1;
const MAX = 6;

/**
 * "Shapes must agree" sandbox. Three independent sliders pick m, k_A,
 * k_B, n; if `k_A !== k_B` the product is undefined and the sim shows
 * a red mismatch state. When they match, the third slot turns into a
 * regular AB matrix preview.
 *
 * The point of the lesson: matmul is a shape contract, not just an
 * arithmetic operation. Drag k_A and k_B independently and feel the
 * rule by hitting it.
 */
export function MatmulShapeRules() {
  const [m, setM] = useState(2);
  const [kA, setKA] = useState(3);
  const [kB, setKB] = useState(3);
  const [n, setN] = useState(2);

  const matches = kA === kB;

  return (
    <SimFrame
      title="Shape Rules"
      onReset={() => {
        setM(2);
        setKA(3);
        setKB(3);
        setN(2);
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
        <Slider label="m  (rows of A)" value={m} setValue={setM} />
        <Slider label="k  (cols of A)" value={kA} setValue={setKA} accent={!matches} />
        <Slider label="k  (rows of B)" value={kB} setValue={setKB} accent={!matches} />
        <Slider label="n  (cols of B)" value={n} setValue={setN} />
      </div>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <ShapeBox rows={m} cols={kA} label="A" tone="ink" />
        <Operator>·</Operator>
        <ShapeBox rows={kB} cols={n} label="B" tone="ink" />
        <Operator>=</Operator>
        {matches ? (
          <ShapeBox rows={m} cols={n} label="AB" tone="accent" />
        ) : (
          <div className="rounded-md border border-[var(--negative-bg)] bg-[var(--negative-bg)]/10 px-3 py-2 text-[12px] font-mono text-[rgb(var(--negative))]">
            shapes don&apos;t match
          </div>
        )}
      </div>

      <p
        className={clsx(
          'mt-5 pt-4 border-t border-border text-[12px] font-mono leading-relaxed',
          matches ? 'text-fg-muted' : 'text-[rgb(var(--negative))]',
        )}
      >
        {matches
          ? `(${m}×${kA}) · (${kB}×${n}) → (${m}×${n}). The inner dims agree (k = ${kA}), so the product is defined.`
          : `(${m}×${kA}) · (${kB}×${n}) is undefined. The inner dims must be equal — A has ${kA} columns, but B has ${kB} rows.`}
      </p>
    </SimFrame>
  );
}

function Slider({
  label,
  value,
  setValue,
  accent = false,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  accent?: boolean;
}) {
  const id = `shape-${label.replace(/[^a-z]/gi, '').toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label
          htmlFor={id}
          className={clsx(
            'text-[11px] uppercase tracking-[0.12em] font-mono',
            accent ? 'text-[rgb(var(--negative))]' : 'text-dim',
          )}
        >
          {label}
        </label>
        <span
          className={clsx(
            'font-mono text-[13px] tabular-nums',
            accent ? 'text-[rgb(var(--negative))]' : 'text-accent',
          )}
        >
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value, 10))}
        className="w-full accent-[rgb(var(--accent))]"
      />
    </div>
  );
}

function ShapeBox({
  rows,
  cols,
  label,
  tone,
}: {
  rows: number;
  cols: number;
  label: string;
  tone: 'ink' | 'accent';
}) {
  // Each cell is a fixed pixel size so the visual scales linearly
  // with m, k, n. Capped at MAX so the layout never blows out.
  const CELL = 14;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={clsx(
          'text-[11px] font-semibold tracking-[-0.005em]',
          tone === 'accent' ? 'text-accent' : 'text-ink',
        )}
      >
        {label}{' '}
        <span className="text-[11px] font-mono text-fg-muted">
          ({rows}×{cols})
        </span>
      </div>
      <div
        className={clsx(
          'grid gap-px p-1 rounded-sm border',
          tone === 'accent'
            ? 'border-accent/40 bg-accent-faint'
            : 'border-border bg-bg/40',
        )}
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL}px)`,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: rows * cols }).map((_, idx) => (
          <div
            key={idx}
            className={clsx(
              'rounded-[1px]',
              tone === 'accent' ? 'bg-accent/50' : 'bg-border-strong/40',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Operator({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1 text-[18px] font-mono text-fg-muted self-center">
      {children}
    </span>
  );
}
