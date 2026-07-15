

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { matmul, matmulCell, matmulCellTerms } from '@/lib/math/matmul';

type Cell = number;
type Grid = Cell[][];

const M = 2;
const K = 3;
const N = 2;

const DEFAULT_A: Grid = [
  [1.2, 0.4, -0.3],
  [0.8, -0.6, 0.2],
];

const DEFAULT_B: Grid = [
  [0.5, 0.1],
  [-0.7, 0.9],
  [0.2, -0.4],
];

function fmt(x: number, digits = 2): string {
  if (Math.abs(x) < Math.pow(10, -digits)) return (0).toFixed(digits);
  return x.toFixed(digits);
}

function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

/**
 * The lesson centerpiece. Three matrices side-by-side: A (2x3),
 * B (3x2), and the live product C = AB (2x2). Every input cell is
 * editable. Hovering or focusing an output cell highlights the
 * source row of A and column of B, and shows the term-by-term
 * dot-product expansion under the grids with live values.
 */
export function MatmulExplorer() {
  const [A, setA] = useState<Grid>(() => cloneGrid(DEFAULT_A));
  const [B, setB] = useState<Grid>(() => cloneGrid(DEFAULT_B));
  const [focus, setFocus] = useState<{ i: number; j: number } | null>(null);

  const C = useMemo(() => matmul(A, B), [A, B]);
  const focused = focus ?? { i: 0, j: 0 };
  const focusedTerms = matmulCellTerms(A, B, focused.i, focused.j);
  const focusedValue = matmulCell(A, B, focused.i, focused.j);

  const setACell = (i: number, j: number, v: number) => {
    setA((prev) => {
      const next = cloneGrid(prev);
      next[i]![j] = v;
      return next;
    });
  };

  const setBCell = (i: number, j: number, v: number) => {
    setB((prev) => {
      const next = cloneGrid(prev);
      next[i]![j] = v;
      return next;
    });
  };

  const reset = () => {
    setA(cloneGrid(DEFAULT_A));
    setB(cloneGrid(DEFAULT_B));
    setFocus(null);
  };

  return (
    <SimFrame title="A · B = AB · hover AB to see the dot product" onReset={reset}>
      <div className="grid grid-cols-[auto_auto_auto_auto_auto] items-start justify-center gap-x-4 gap-y-2 mb-5 font-mono text-[13px]">
        <GridLabel label="A" sub="2×3" />
        <span aria-hidden="true" />
        <GridLabel label="B" sub="3×2" />
        <span aria-hidden="true" />
        <GridLabel label="AB" sub="2×2" highlight />

        <EditableMatrix
          rows={M}
          cols={K}
          values={A}
          onCellChange={setACell}
          rowHighlight={focused.i}
          highlightWhen="row"
          ariaPrefix="A"
        />
        <Operator>·</Operator>
        <EditableMatrix
          rows={K}
          cols={N}
          values={B}
          onCellChange={setBCell}
          colHighlight={focused.j}
          highlightWhen="col"
          ariaPrefix="B"
        />
        <Operator>=</Operator>
        <ReadonlyMatrix
          rows={M}
          cols={N}
          values={C}
          focus={focus}
          onFocus={(i, j) => setFocus({ i, j })}
          onBlur={() => {
            /* keep last focus so the expansion line stays */
          }}
        />
      </div>

      {/* Expansion line */}
      <div className="rounded-md border border-border bg-bg/40 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1.5">
          c
          <sub>{focused.i + 1},{focused.j + 1}</sub>{' '}
          = row {focused.i + 1} of A · col {focused.j + 1} of B
        </div>
        <div className="font-mono text-[14px] text-ink tabular-nums leading-relaxed flex flex-wrap items-baseline gap-x-1 gap-y-1">
          {focusedTerms.map((t, idx) => (
            <span key={idx} className="contents">
              {idx > 0 && <span className="text-fg-muted">+</span>}
              <span>{t}</span>
            </span>
          ))}
          <span className="text-fg-muted">=</span>
          <span className="text-accent">{fmt(focusedValue)}</span>
        </div>
      </div>
    </SimFrame>
  );
}

function GridLabel({
  label,
  sub,
  highlight = false,
}: {
  label: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={clsx(
          'text-[13px] font-semibold tracking-[-0.005em]',
          highlight ? 'text-accent' : 'text-ink',
        )}
      >
        {label}
      </div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
        {sub}
      </div>
    </div>
  );
}

function Operator({ children }: { children: React.ReactNode }) {
  return (
    <span className="self-center px-1 text-[18px] font-mono text-fg-muted">
      {children}
    </span>
  );
}

interface EditableMatrixProps {
  rows: number;
  cols: number;
  values: Grid;
  onCellChange: (i: number, j: number, v: number) => void;
  rowHighlight?: number;
  colHighlight?: number;
  highlightWhen: 'row' | 'col';
  ariaPrefix: string;
}

function EditableMatrix({
  rows,
  cols,
  values,
  onCellChange,
  rowHighlight,
  colHighlight,
  highlightWhen,
  ariaPrefix,
}: EditableMatrixProps) {
  return (
    <div
      className="inline-grid gap-1 p-2 rounded-md border border-border bg-bg/30"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 56px))`,
      }}
    >
      {Array.from({ length: rows }).flatMap((_, i) =>
        Array.from({ length: cols }).map((_, j) => {
          const isHighlighted =
            (highlightWhen === 'row' && rowHighlight === i) ||
            (highlightWhen === 'col' && colHighlight === j);
          return (
            <input
              key={`${i}-${j}`}
              type="number"
              step={0.1}
              value={values[i]![j]!}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) onCellChange(i, j, v);
              }}
              aria-label={`${ariaPrefix} row ${i + 1} column ${j + 1}`}
              className={clsx(
                'focus-ring h-9 w-full rounded text-center font-mono text-[13px] tabular-nums bg-bg-elevated border transition-colors',
                isHighlighted
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-ink hover:border-border-strong',
              )}
            />
          );
        }),
      )}
    </div>
  );
}

interface ReadonlyMatrixProps {
  rows: number;
  cols: number;
  values: readonly (readonly number[])[];
  focus: { i: number; j: number } | null;
  onFocus: (i: number, j: number) => void;
  onBlur: () => void;
}

function ReadonlyMatrix({
  rows,
  cols,
  values,
  focus,
  onFocus,
  onBlur,
}: ReadonlyMatrixProps) {
  return (
    <div
      className="inline-grid gap-1 p-2 rounded-md border border-accent/40 bg-accent-faint"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 56px))`,
      }}
    >
      {Array.from({ length: rows }).flatMap((_, i) =>
        Array.from({ length: cols }).map((_, j) => {
          const isFocused = focus?.i === i && focus?.j === j;
          return (
            <button
              type="button"
              key={`${i}-${j}`}
              onMouseEnter={() => onFocus(i, j)}
              onFocus={() => onFocus(i, j)}
              onBlur={onBlur}
              aria-label={`AB row ${i + 1} column ${j + 1}, value ${fmt(
                values[i]![j]!,
              )}`}
              className={clsx(
                'focus-ring h-9 w-full rounded text-center font-mono text-[13px] tabular-nums transition-colors',
                isFocused
                  ? 'bg-accent text-accent-fg'
                  : 'bg-bg-elevated text-ink hover:bg-accent-soft hover:text-accent',
              )}
            >
              {fmt(values[i]![j]!)}
            </button>
          );
        }),
      )}
    </div>
  );
}
