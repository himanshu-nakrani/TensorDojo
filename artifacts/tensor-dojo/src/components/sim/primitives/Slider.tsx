

import { useId } from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  ariaLabel: string;
  /**
   * Min-width for the value column. Defaults to 6ch which fits
   * any value up to ~6 characters in tabular-nums (e.g. "5.00e-3").
   * Pass a longer `valueMinWidth` for sliders whose format is
   * known to be wider (e.g. percentage or exponential with
   * 7+ characters).
   */
  valueMinWidth?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 0.1,
  onChange,
  formatValue,
  ariaLabel,
  valueMinWidth = '6ch',
}: SliderProps) {
  const id = useId();
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const display = formatValue ? formatValue(value) : value.toFixed(1);

  return (
    <div className="flex items-center gap-4 w-full">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => {
          const next = parseFloat(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="slider flex-1 min-w-0"
        style={{ ['--fill' as string]: `${fill}%` }}
      />
      <span
        className="font-mono text-sm text-ink text-right tabular-nums"
        style={{ minWidth: valueMinWidth }}
      >
        {display}
      </span>
    </div>
  );
}
