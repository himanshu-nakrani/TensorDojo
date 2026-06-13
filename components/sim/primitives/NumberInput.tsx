'use client';

import { ChangeEvent, KeyboardEvent, forwardRef } from 'react';
import clsx from 'clsx';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  step?: number;
  ariaLabel?: string;
  className?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    { value, onChange, onKeyDown, step = 0.1, ariaLabel, className },
    ref,
  ) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || raw === '-') return; // let the user keep typing
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed)) onChange(parsed);
    };

    return (
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={value}
        step={step}
        aria-label={ariaLabel}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className={clsx('number-input font-mono', className)}
      />
    );
  },
);
