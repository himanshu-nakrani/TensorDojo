

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
  ariaLabel: string;
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

    // Error state: the buffer parses to a finite number that's outside
    // [min, max]. Triggered mid-edit so the user sees the red border
    // before blur clamps the value. A non-finite buffer (mid-type "-"
    // or ".") is NOT an error — it's a normal typing waypoint.
    const inError = (() => {
      if (buffer === null) return false;
      const parsed = parseFloat(buffer);
      if (!Number.isFinite(parsed)) return false;
      if (typeof min === 'number' && parsed < min) return true;
      if (typeof max === 'number' && parsed > max) return true;
      return false;
    })();

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
        // Only commit in-range values mid-edit so downstream derived
        // state (slider fills, plots) doesn't briefly snap to a value
        // the user is going to back out of. The blur path clamps and
        // commits whatever they end at.
        const outOfRange =
          (typeof min === 'number' && parsed < min) ||
          (typeof max === 'number' && parsed > max);
        if (!outOfRange) onChange(parsed);
      } else {
        setBuffer(raw);
      }
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      commit(e.target.value);
    };

    const nudge = (dir: 1 | -1) => {
      let next = value + dir * step;
      if (typeof min === 'number') next = Math.max(min, next);
      if (typeof max === 'number') next = Math.min(max, next);
      next = Math.round(next * 1e6) / 1e6;
      setBuffer(null);
      if (next !== value) onChange(next);
    };

    return (
      // className sizes the WHOLE control (callers pass w-28 / w-full);
      // the input flexes to whatever remains after the stepper. Fixed
      // widths must budget ~20px for the stepper: w-28 leaves ~90px of
      // field, enough for -10.5 at the mobile 16px font.
      <span className={clsx('inline-flex items-stretch', className)}>
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
          aria-invalid={inError || undefined}
          className={clsx(
            'number-input font-mono flex-1 min-w-0 !rounded-r-none',
            inError && 'number-input--error',
          )}
        />
        <span className="inline-flex flex-col border border-l-0 border-border rounded-r-[3px] bg-bg-code overflow-hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => nudge(1)}
            className="flex-1 px-1.5 text-[8px] leading-none text-fg-muted transition-colors hover:text-accent hover:bg-bg-elevated-hover border-b border-border"
          >
            ▲
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => nudge(-1)}
            className="flex-1 px-1.5 text-[8px] leading-none text-fg-muted transition-colors hover:text-accent hover:bg-bg-elevated-hover"
          >
            ▼
          </button>
        </span>
      </span>
    );
  },
);
