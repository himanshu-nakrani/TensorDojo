import clsx from 'clsx';

interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Instrument-style segmented control: equal columns with a sliding
 * signal indicator behind the selected option. Replaces the ad-hoc
 * aria-pressed button rows across sims with one keyboard-operable,
 * motion-consistent control.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const n = options.length;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={clsx(
        'relative inline-grid auto-cols-fr grid-flow-col border border-border rounded-sm bg-bg-code p-[2px] font-mono text-[11px]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute top-[2px] bottom-[2px] left-[2px] rounded-[2px] bg-accent transition-transform duration-base ease-sweep motion-reduce:transition-none"
        style={{
          width: `calc((100% - 4px) / ${n})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={clsx(
              'focus-ring relative z-10 px-2.5 py-1 transition-colors whitespace-nowrap',
              selected ? 'text-accent-fg font-medium' : 'text-fg-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
