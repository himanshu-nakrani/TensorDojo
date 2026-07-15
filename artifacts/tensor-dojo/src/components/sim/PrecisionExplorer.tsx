

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  castTo,
  formatLimits,
  relativeError,
  statusOf,
  ulp,
  type Format,
  type Status,
} from '@/lib/math/mixed-precision';

const FORMATS: { id: Format; label: string; sub: string }[] = [
  { id: 'fp32', label: 'fp32', sub: '1+8+23 bits' },
  { id: 'bf16', label: 'bf16', sub: '1+8+7 bits' },
  { id: 'fp16', label: 'fp16', sub: '1+5+10 bits' },
];

// Slider runs in log10 space; -38 to 38 covers the full fp32 range
// while letting the user push fp16 over both edges easily.
const LOG_MIN = -10;
const LOG_MAX = 10;

const STATUS_LABEL: Record<Status, string> = {
  ok: 'exact',
  rounded: 'rounded',
  underflow: 'underflow → 0',
  overflow: 'overflow → ∞',
};

const STATUS_COLOR: Record<Status, string> = {
  ok: 'text-accent',
  rounded: 'text-amber-500 dark:text-amber-400',
  underflow: 'text-[rgb(var(--negative))]',
  overflow: 'text-[rgb(var(--negative))]',
};

export function PrecisionExplorer() {
  const [logV, setLogV] = useState(0); // value = 10^logV; default 1
  const [showUlp, setShowUlp] = useState(false);

  const value = Math.pow(10, logV);

  const rows = useMemo(
    () =>
      FORMATS.map((f) => {
        const cast = castTo(value, f.id);
        const st = statusOf(value, f.id);
        const u = ulp(value, f.id);
        const err = relativeError(value, f.id);
        return { ...f, cast, status: st, ulp: u, err };
      }),
    [value],
  );

  return (
    <SimFrame
      title="One value, three formats"
      headerWrap
      headerAction={
        <button
          type="button"
          onClick={() => setShowUlp((u) => !u)}
          aria-pressed={showUlp}
          className={clsx(
            'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors',
            showUlp
              ? 'border-accent text-accent bg-accent-soft'
              : 'border-border text-muted hover:text-ink hover:border-border-strong',
          )}
        >
          show ULP
        </button>
      }
    >
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <label
            htmlFor="precision-value"
            className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono"
          >
            input value (log10)
          </label>
          <span className="font-mono text-[14px] text-accent tabular-nums">
            {formatScientific(value)}
          </span>
        </div>
        <input
          id="precision-value"
          type="range"
          min={LOG_MIN}
          max={LOG_MAX}
          step={0.1}
          value={logV}
          onChange={(e) => setLogV(parseFloat(e.target.value))}
          className="w-full accent-[rgb(var(--accent))]"
        />
        <div className="flex justify-between mt-1 text-[10px] font-mono text-fg-subtle">
          <span>1e{LOG_MIN}</span>
          <span>1</span>
          <span>1e+{LOG_MAX}</span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <Row key={row.id} {...row} showUlp={showUlp} />
        ))}
      </div>

      <RangeBar value={value} />

      <p className="mt-3 text-[11px] text-dim font-mono leading-relaxed">
        fp16's narrow exponent (5 bits) is what underflows / overflows. bf16 keeps fp32's exponent (8 bits) but truncates the mantissa to 7 bits — fewer digits, same range.
      </p>
    </SimFrame>
  );
}

function Row({
  id,
  label,
  sub,
  cast,
  status,
  ulp,
  err,
  showUlp,
}: {
  id: Format;
  label: string;
  sub: string;
  cast: number;
  status: Status;
  ulp: number;
  err: number;
  showUlp: boolean;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3 rounded-md border border-border bg-bg/40 px-3 py-2">
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="text-[10px] font-mono text-fg-muted">{sub}</span>
      </div>
      <div className="flex flex-col text-[12px] font-mono tabular-nums">
        <span className={STATUS_COLOR[status]}>
          {!isFinite(cast)
            ? '∞'
            : cast === 0
              ? '0'
              : formatScientific(cast)}
        </span>
        {showUlp && (
          <span className="text-[10px] text-fg-muted">
            ULP ≈ {isFinite(ulp) ? formatScientific(ulp) : '—'}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end">
        <span className={clsx('text-[11px] font-mono', STATUS_COLOR[status])}>
          {STATUS_LABEL[status]}
        </span>
        {status === 'rounded' && (
          <span className="text-[10px] text-fg-muted font-mono">
            rel err {(err * 100).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

function RangeBar({ value }: { value: number }) {
  const W = 480;
  const H = 60;
  const PAD = 28;

  const toX = (logv: number) =>
    PAD + ((logv - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (W - PAD * 2);

  const rangeFor = (f: Format) => {
    const lim = formatLimits(f);
    const lo = Math.log10(lim.minNormal);
    const hi = Math.log10(lim.maxFinite);
    return {
      lo: Math.max(LOG_MIN, lo),
      hi: Math.min(LOG_MAX, hi),
    };
  };

  const ranges: Record<Format, { lo: number; hi: number }> = {
    fp32: rangeFor('fp32'),
    bf16: rangeFor('bf16'),
    fp16: rangeFor('fp16'),
  };

  const labels: { id: Format; y: number; color: string }[] = [
    { id: 'fp32', y: 14, color: 'rgb(21,128,61)' },
    { id: 'bf16', y: 28, color: 'rgb(67,56,202)' },
    { id: 'fp16', y: 42, color: 'rgb(180,83,9)' },
  ];

  const valX = toX(Math.log10(Math.max(value, Math.pow(10, LOG_MIN))));

  return (
    <div className="mt-5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
        representable ranges (normal numbers)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto">
        {labels.map((l) => {
          const r = ranges[l.id];
          return (
            <g key={l.id}>
              <line
                x1={toX(r.lo)}
                x2={toX(r.hi)}
                y1={l.y}
                y2={l.y}
                stroke={l.color}
                strokeWidth={3}
                opacity={0.7}
              />
              <text
                x={PAD - 4}
                y={l.y + 3}
                textAnchor="end"
                fontSize={10}
                fontFamily="monospace"
                className="fill-fg-muted"
              >
                {l.id}
              </text>
            </g>
          );
        })}
        <line
          x1={valX}
          x2={valX}
          y1={4}
          y2={H - 4}
          className="stroke-accent"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
        <circle cx={valX} cy={H / 2} r={3} className="fill-accent" />
      </svg>
    </div>
  );
}

function formatScientific(x: number): string {
  if (!isFinite(x)) return x > 0 ? '∞' : '-∞';
  if (x === 0) return '0';
  const ax = Math.abs(x);
  if (ax >= 0.01 && ax < 1000) return x.toFixed(3);
  return x.toExponential(2);
}
