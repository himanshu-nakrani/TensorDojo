

import { useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { AttentionMatrix } from '@/components/sim/AttentionMatrix';

export interface AttentionTemperaturePreset {
  temperature?: number;
  /** Inner AttentionMatrix vector defaults. */
  q?: readonly (readonly [number, number])[];
  k?: readonly (readonly [number, number])[];
}

const TEMP_MIN = 0.1;
const TEMP_MAX = 3.0;
const TEMP_STEP = 0.1;

/**
 * Secondary attention interactive. The same Q/K vectors and the same
 * matrices as AttentionMatrix, with a temperature slider on top of the
 * softmax. Reuses lib/math/softmax — no forked math.
 */
export function AttentionTemperature({ preset }: { preset?: AttentionTemperaturePreset }) {
  const [temperature, setTemperature] = useState<number>(
    preset?.temperature ?? 1.0,
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          Same matrices · drag T to soften the weights
        </h3>
        <button
          type="button"
          onClick={() => setTemperature(1.0)}
          className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          Temperature
        </div>
        <div className="text-[11px] text-dim font-mono tabular-nums">
          T = {temperature.toFixed(2)}
        </div>
      </div>
      <Slider
        value={temperature}
        min={TEMP_MIN}
        max={TEMP_MAX}
        step={TEMP_STEP}
        onChange={setTemperature}
        formatValue={(v) => v.toFixed(2)}
        ariaLabel="Temperature"
      />
      <div className="flex justify-between mt-2 text-[11px] text-dim font-mono tabular-nums">
        <span>{TEMP_MIN.toFixed(1)} sharp</span>
        <span>{TEMP_MAX.toFixed(1)} flat</span>
      </div>

      <div className="mt-6">
        <AttentionMatrix preset={{ temperature, q: preset?.q, k: preset?.k }} />
      </div>
    </div>
  );
}
