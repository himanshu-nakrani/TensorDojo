'use client';

import { useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { AttentionMatrix } from '@/components/sim/AttentionMatrix';
import { SimFrame } from '@/components/sim/primitives/SimFrame';

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
    <SimFrame
      title="Attention + Temperature"
      onReset={() => setTemperature(1.0)}
    >

      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono">
          Temperature
        </div>
        <div className="text-[10px] text-dim font-mono tabular-nums">
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
      <div className="flex justify-between mt-2 text-[10px] text-dim font-mono tabular-nums">
        <span>{TEMP_MIN.toFixed(1)} sharp</span>
        <span>{TEMP_MAX.toFixed(1)} flat</span>
      </div>

      <div className="mt-6">
        <AttentionMatrix preset={{ temperature, q: preset?.q, k: preset?.k }} />
      </div>
    </SimFrame>
  );
}
