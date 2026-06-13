'use client';

import {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  forwardRef,
  useState,
} from 'react';
import clsx from 'clsx';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  step?: number;
  min?: number;
  max?: number;
  ariaLabel?: string;
  className?: string;
}

/**
 * Number input that defers clamping to blur so the user can type
 * freely ("1." is allowed mid-type, "−" is allowed as a leading
 * character). On blur, the value is coerced to a finite number and
 * clamped to [min, max] if provided. A small local string buffer
 * makes the input feel responsive when the value is being typed
 * faster than React's commit cycle.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    { value, onChange, onKeyDown, step = 0.1, min, max, ariaLabel, className },
    ref,
  ) {
    const [buffer, setBuffer] = useState<string | null>(null);

    const display = buffer ?? String(value);

    const commit = (raw: string) => {
      const parsed = parseFloat(raw);
      if (!Number.isFinite(parsed)) {
        setBuffer(null);
        return;
      }
      let next = parsed;
      if (typeof min === 'number' && next < min) next = min;
      if (typeof max === 'number' && next > max) next = max;
      setBuffer(null);
      if (next !== value) onChange(next);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Defer while the user is mid-typing.
      if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
        setBuffer(raw);
        return;
      }
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed)) {
        setBuffer(raw);
        onChange(parsed);
      } else {
        setBuffer(raw);
      }
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      commit(e.target.value);
    };

    return (
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={display}
        step={step}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        className={clsx('number-input font-mono', className)}
      />
    );
  },
);
