import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { Slider } from '@/components/sim/primitives/Slider';

type View = 'draft' | 'revised';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Principle-strength critique/revision. The draft barely moves with
 * the slider (the principle is unused). The revised answer lets
 * violation fall with strength; helpfulness dips at mid-strength
 * when the critique is blunt, then recovers as the revision is
 * more targeted.
 */
export function ConstitutionalCritiqueLab() {
  const [strength, setStrength] = useState(0.35);
  const [view, setView] = useState<View>('revised');

  const scores = useMemo(() => {
    const draftViolation = clamp01(0.82 - 0.04 * strength);
    const draftHelp = clamp01(0.74 + 0.03 * strength);
    const revisedViolation = clamp01(0.86 * (1 - strength) ** 1.25);
    const dip = 4 * strength * (1 - strength);
    const revisedHelp = clamp01(0.76 - 0.32 * dip + 0.14 * strength);
    return { draftViolation, draftHelp, revisedViolation, revisedHelp };
  }, [strength]);

  const reset = () => {
    setStrength(0.35);
    setView('revised');
  };

  const violation = view === 'draft' ? scores.draftViolation : scores.revisedViolation;
  const help = view === 'draft' ? scores.draftHelp : scores.revisedHelp;

  return (
    <SimFrame
      title="Principle-strength critique and revision"
      onReset={reset}
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {(['draft', 'revised'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={clsx(
                  'px-3 py-1 capitalize transition-colors focus-ring',
                  view === v
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {v}
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
      headerWrap
    >
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Principle strength
          </span>
          <span className="text-ink font-mono tabular-nums text-[12px]">
            {strength.toFixed(2)}
          </span>
        </div>
        <Slider
          value={strength}
          min={0}
          max={1}
          step={0.01}
          onChange={setStrength}
          formatValue={(v) => v.toFixed(2)}
          ariaLabel="Principle strength"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <ScoreColumn
          label="Draft (unrevised)"
          active={view === 'draft'}
          violation={scores.draftViolation}
          helpfulness={scores.draftHelp}
        />
        <ScoreColumn
          label="Revised against the principle"
          active={view === 'revised'}
          violation={scores.revisedViolation}
          helpfulness={scores.revisedHelp}
        />
      </div>

      <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-border font-mono text-[12px]">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            {view} · principle violation
          </dt>
          <dd className="text-ink tabular-nums">{(violation * 100).toFixed(0)}%</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            {view} · helpfulness
          </dt>
          <dd className="text-accent tabular-nums">{(help * 100).toFixed(0)}%</dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Critique without revision barely moves the draft. On the revised
        path, violation falls as principle strength rises; helpfulness
        dips around mid-strength (the critique is blunt) and recovers
        when the revision is more targeted.
      </p>
    </SimFrame>
  );
}

function ScoreColumn({
  label,
  active,
  violation,
  helpfulness,
}: {
  label: string;
  active: boolean;
  violation: number;
  helpfulness: number;
}) {
  return (
    <div
      className={clsx(
        'rounded p-3 border',
        active ? 'border-accent/40 bg-accent-soft/40' : 'border-border bg-surface',
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.12em] font-mono text-dim mb-3">
        {label}
      </div>
      <BarRow label="Principle violation" value={violation} tone="muted" />
      <BarRow label="Helpfulness" value={helpfulness} tone="accent" />
    </div>
  );
}

function BarRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'muted' | 'accent';
}) {
  return (
    <div className="mb-2">
      <div className="flex items-baseline justify-between text-[11px] font-mono mb-0.5">
        <span className={tone === 'accent' ? 'text-accent' : 'text-dim'}>{label}</span>
        <span className="text-ink tabular-nums">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-3 rounded border border-border bg-bg-elevated overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all duration-200',
            tone === 'accent' ? 'bg-accent-soft border-r border-accent/40' : 'bg-[rgb(var(--fg)/0.18)]',
          )}
          style={{ width: `${Math.max(1.5, value * 100)}%` }}
        />
      </div>
    </div>
  );
}
