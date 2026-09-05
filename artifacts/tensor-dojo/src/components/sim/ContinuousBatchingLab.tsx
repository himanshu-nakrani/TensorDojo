import { useMemo, useState } from 'react';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { Slider } from '@/components/sim/primitives/Slider';

const SLOT_COUNT = 8;
const DEFAULT_OCCUPANCY = 4;
const DEFAULT_MEAN_TOKENS = 128;
const DEFAULT_ARRIVAL = 0.8;

/**
 * Closed-form serving model for continuous batching. Occupancy is
 * the number of active decode slots; arrival rate saturates at 1
 * (the batch cannot run more than fully occupied). Throughput is
 * occupied-slot token rate; p50/p99 are latency in remaining-token
 * units, stretched by utilization and by contention at high occupancy.
 */
export function ContinuousBatchingLab() {
  const [occupancy, setOccupancy] = useState(DEFAULT_OCCUPANCY);
  const [meanTokens, setMeanTokens] = useState(DEFAULT_MEAN_TOKENS);
  const [arrivalRate, setArrivalRate] = useState(DEFAULT_ARRIVAL);

  const { util, throughput, p50, p99 } = useMemo(() => {
    const util = Math.min(1, arrivalRate);
    const throughput = occupancy * (1 / meanTokens) * util * meanTokens;
    const p50 = (meanTokens / occupancy) * (1 + util);
    const p99 = p50 * (1 + (3 * occupancy) / SLOT_COUNT);
    return { util, throughput, p50, p99 };
  }, [occupancy, meanTokens, arrivalRate]);

  const reset = () => {
    setOccupancy(DEFAULT_OCCUPANCY);
    setMeanTokens(DEFAULT_MEAN_TOKENS);
    setArrivalRate(DEFAULT_ARRIVAL);
  };

  const fillH = 8 + ((meanTokens - 32) / (512 - 32)) * 28;

  return (
    <SimFrame
      title="Occupancy, remaining tokens, and arrival rate"
      onReset={reset}
    >
      <svg
        viewBox="0 0 420 78"
        className="w-full h-auto mb-5 bg-bg/40 rounded"
        role="img"
        aria-label={`${occupancy} of ${SLOT_COUNT} decode slots occupied`}
      >
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const active = i < occupancy;
          const x = 18 + i * 50;
          return (
            <g key={i}>
              <rect
                x={x}
                y={14}
                width={40}
                height={44}
                rx={3}
                fill="none"
                stroke="rgb(var(--border))"
                strokeWidth={1}
              />
              {active && (
                <rect
                  x={x + 4}
                  y={14 + 44 - fillH - 4}
                  width={32}
                  height={fillH}
                  rx={2}
                  fill="rgb(var(--accent))"
                  opacity={0.35 + 0.5 * util}
                />
              )}
              <text
                x={x + 20}
                y={70}
                textAnchor="middle"
                fill="rgb(var(--dim))"
                fontSize={8}
                fontFamily="monospace"
              >
                {active ? 'busy' : 'idle'}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="space-y-4 font-mono text-[12px] mb-5">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] uppercase tracking-[0.12em] text-dim">
              Occupancy (active slots)
            </span>
            <span className="text-ink tabular-nums">{occupancy}</span>
          </div>
          <Slider
            value={occupancy}
            min={1}
            max={SLOT_COUNT}
            step={1}
            onChange={(v) => setOccupancy(Math.round(v))}
            formatValue={(v) => String(Math.round(v))}
            ariaLabel="Occupancy"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] uppercase tracking-[0.12em] text-dim">
              Mean remaining tokens
            </span>
            <span className="text-ink tabular-nums">{meanTokens}</span>
          </div>
          <Slider
            value={meanTokens}
            min={32}
            max={512}
            step={8}
            onChange={(v) => setMeanTokens(Math.round(v))}
            formatValue={(v) => String(Math.round(v))}
            ariaLabel="Mean remaining tokens"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] uppercase tracking-[0.12em] text-dim">
              Arrival rate (req / slot-time)
            </span>
            <span className="text-ink tabular-nums">{arrivalRate.toFixed(1)}</span>
          </div>
          <Slider
            value={arrivalRate}
            min={0.2}
            max={2.0}
            step={0.1}
            onChange={setArrivalRate}
            formatValue={(v) => v.toFixed(1)}
            ariaLabel="Arrival rate"
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border font-mono text-[12px]">
        <Readout label="Utilization" value={util.toFixed(2)} accent={util >= 1} />
        <Readout label="Throughput" value={throughput.toFixed(2)} hint="tok / unit" />
        <Readout label="p50 latency" value={p50.toFixed(1)} hint="tok-units" />
        <Readout label="p99 latency" value={p99.toFixed(1)} hint="tok-units" />
      </dl>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Utilization caps at 1 once arrival rate exceeds one request per
        slot-time. Throughput is occupancy × utilization. p50 is mean
        remaining tokens / occupancy × (1 + utilization); p99 stretches
        that by occupancy / 8.
      </p>
    </SimFrame>
  );
}

function Readout({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
        {label}
      </dt>
      <dd className={accent ? 'text-accent tabular-nums' : 'text-ink tabular-nums'}>
        {value}
        {hint ? <span className="text-dim"> {hint}</span> : null}
      </dd>
    </div>
  );
}
