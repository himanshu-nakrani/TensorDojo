

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { quantize, representableLevels } from '@/lib/math/quantization';

/**
 * Secondary sim for the quantization lesson. Shows the
 * 2^bits representable levels as tick marks on a number line.
 * Toggle between symmetric (centered around zero) and affine
 * (spans the data range, includes a zero-point offset).
 *
 * Drag the input slider to pick a value; the highlighted tick is
 * the level that value would round to. This makes "rounding to
 * the nearest level" literal — the abstract quantization op
 * becomes a snap-to-tick interaction.
 */

const BIT_OPTIONS = [2, 4, 8] as const;
type Bits = (typeof BIT_OPTIONS)[number];

// Sample distributions to switch between. Affine quantization
// benefits visibly on the skewed one.
const DISTRIBUTIONS = {
  symmetric: {
    label: 'centered (typical for weights)',
    values: [-1.1, -0.7, -0.4, -0.2, 0.0, 0.1, 0.3, 0.5, 0.9, 1.2],
  },
  skewed: {
    label: 'skewed (typical for activations)',
    values: [0.05, 0.1, 0.2, 0.35, 0.45, 0.6, 0.9, 1.2, 1.8, 2.4],
  },
} as const;
type DistName = keyof typeof DISTRIBUTIONS;

export function QuantizationLevels() {
  const [bits, setBits] = useState<Bits>(4);
  const [mode, setMode] = useState<'symmetric' | 'affine'>('symmetric');
  const [distName, setDistName] = useState<DistName>('symmetric');
  const [input, setInput] = useState(0.35);

  const values = DISTRIBUTIONS[distName].values;
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const absMax = Math.max(Math.abs(dataMin), Math.abs(dataMax));

  // X-axis range: symmetric distributions use [-r, r]; skewed
  // affine uses [dataMin, dataMax] tightly so the asymmetry is
  // visible.
  const xMin = mode === 'symmetric' ? -Math.max(absMax, 1) * 1.05 : dataMin - 0.1;
  const xMax = mode === 'symmetric' ? Math.max(absMax, 1) * 1.05 : dataMax + 0.1;

  const { levels, snappedValue } = useMemo(() => {
    const q = quantize(values, bits, mode);
    const lvls = representableLevels(q);
    // Snap the slider input: find the closest level.
    const closest = lvls.reduce((best, l) =>
      Math.abs(l - input) < Math.abs(best - input) ? l : best,
    );
    return { levels: lvls, snappedValue: closest };
  }, [values, bits, mode, input]);

  const reset = () => {
    setBits(4);
    setMode('symmetric');
    setDistName('symmetric');
    setInput(0.35);
  };

  return (
    <SimFrame
      title="Quantization levels on a number line"
      onReset={reset}
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {BIT_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBits(b)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  bits === b
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {b}-bit
              </button>
            ))}
          </div>
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {(['symmetric', 'affine'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={clsx(
                  'px-2 py-0.5 transition-colors focus-ring',
                  mode === m
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {m}
              </button>
            ))}
          </div>
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
      {/* Distribution chooser */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
          Source distribution
        </div>
        <div className="flex gap-2 font-mono text-[11px]">
          {(Object.keys(DISTRIBUTIONS) as DistName[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDistName(d)}
              className={clsx(
                'px-2 py-1 rounded border transition-colors focus-ring',
                distName === d
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-border text-muted hover:text-ink',
              )}
            >
              {DISTRIBUTIONS[d].label}
            </button>
          ))}
        </div>
      </div>

      <NumberLine
        xMin={xMin}
        xMax={xMax}
        levels={levels}
        values={values}
        input={input}
        snappedValue={snappedValue}
      />

      <label className="block mt-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Pick an input value
          </span>
          <span className="text-[11px] font-mono tabular-nums">
            <span className="text-ink">{input.toFixed(3)}</span>
            <span className="text-dim"> rounds to </span>
            <span className="text-accent">{snappedValue.toFixed(3)}</span>
          </span>
        </div>
        <input
          type="range"
          min={xMin}
          max={xMax}
          step={(xMax - xMin) / 200}
          value={input}
          onChange={(e) => setInput(Number(e.target.value))}
          className="w-full focus-ring"
          aria-label="Input value"
        />
      </label>

      <p className="mt-5 pt-4 border-t border-border text-[11px] text-dim font-mono leading-relaxed">
        Symmetric quantization places its <span className="text-ink">{1 << bits}</span> levels
        evenly around zero — clean and cheap, but wastes range on a skewed
        distribution (try the skewed one in symmetric mode). Affine fits the
        levels to the actual data range using a zero-point offset, getting
        more useful precision out of the same bit budget. In production:
        symmetric for weights (centered around zero by construction), affine
        for activations (ReLU outputs are non-negative; symmetric would
        waste half the codes).
      </p>
    </SimFrame>
  );
}

function NumberLine({
  xMin,
  xMax,
  levels,
  values,
  input,
  snappedValue,
}: {
  xMin: number;
  xMax: number;
  levels: readonly number[];
  values: readonly number[];
  input: number;
  snappedValue: number;
}) {
  const W = 600;
  const H = 120;
  const PAD = 14;
  const x = (v: number) => PAD + ((v - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const axisY = H - 38;

  return (
    <div className="border border-border rounded bg-surface">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Data dots */}
        {values.map((v, i) => (
          <circle
            key={i}
            cx={x(v)}
            cy={28}
            r={2}
            fill="rgb(var(--fg) / 0.6)"
          />
        ))}
        <text
          x={PAD}
          y={14}
          fontSize={9}
          className="fill-dim font-mono uppercase tracking-[0.12em]"
        >
          data
        </text>

        {/* Axis line */}
        <line
          x1={PAD}
          y1={axisY}
          x2={W - PAD}
          y2={axisY}
          stroke="rgb(var(--border-strong))"
          strokeWidth={0.8}
        />

        {/* Quantization levels: ticks below axis */}
        {levels.map((l, i) => {
          const cx = x(l);
          const isSnapped = Math.abs(l - snappedValue) < 1e-9;
          return (
            <g key={i}>
              <line
                x1={cx}
                y1={axisY}
                x2={cx}
                y2={axisY + (isSnapped ? 18 : 10)}
                stroke={isSnapped ? 'rgb(var(--accent))' : 'rgb(var(--accent) / 0.5)'}
                strokeWidth={isSnapped ? 1.6 : 0.9}
              />
            </g>
          );
        })}
        <text
          x={PAD}
          y={axisY + 30}
          fontSize={9}
          className="fill-accent font-mono uppercase tracking-[0.12em]"
        >
          levels ({levels.length})
        </text>

        {/* Input cursor: a small triangle above the axis */}
        <polygon
          points={`${x(input)},${axisY - 2} ${x(input) - 4},${axisY - 9} ${x(input) + 4},${axisY - 9}`}
          fill="rgb(var(--accent))"
        />
        <line
          x1={x(input)}
          y1={axisY - 2}
          x2={x(snappedValue)}
          y2={axisY + 2}
          stroke="rgb(var(--accent))"
          strokeWidth={0.6}
          strokeDasharray="2 2"
        />
      </svg>
    </div>
  );
}
