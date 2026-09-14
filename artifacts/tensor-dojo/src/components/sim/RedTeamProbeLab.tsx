import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { Slider } from '@/components/sim/primitives/Slider';

const ATTACKS = [
  { id: 'jailbreak', label: 'Jailbreak', base: 0.88 },
  { id: 'encoding', label: 'Encoding', base: 0.64 },
  { id: 'roleplay', label: 'Roleplay', base: 0.51 },
] as const;

type AttackId = (typeof ATTACKS)[number]['id'];

const LAYER_FACTOR = 0.55;

/**
 * Named probe vs defense-layer count. Jailbreak starts with the
 * highest attack success rate; each extra layer multiplies ASR by
 * 0.55 for every attack. The point is to measure a specific probe
 * against a known number of layers, not a single “safe” score.
 */
export function RedTeamProbeLab() {
  const [attackId, setAttackId] = useState<AttackId>('jailbreak');
  const [layers, setLayers] = useState(0);

  const attack = ATTACKS.find((a) => a.id === attackId)!;
  const asr = useMemo(
    () => attack.base * LAYER_FACTOR ** layers,
    [attack.base, layers],
  );

  const reset = () => {
    setAttackId('jailbreak');
    setLayers(0);
  };

  return (
    <SimFrame
      title="Attack type and defense layers"
      onReset={reset}
      headerAction={
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex border border-border rounded overflow-hidden font-mono text-[11px]">
            {ATTACKS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAttackId(a.id)}
                aria-pressed={attackId === a.id}
                className={clsx(
                  'px-3 py-1 transition-colors focus-ring',
                  attackId === a.id
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {a.label}
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
      <svg
        viewBox="0 0 420 88"
        className="w-full h-auto mb-5 bg-bg/40 rounded"
        role="img"
        aria-label={`${attack.label} attack success rate ${(asr * 100).toFixed(0)} percent with ${layers} defense layers`}
      >
        {ATTACKS.map((a, i) => {
          const y = 16 + i * 22;
          const rate = a.base * LAYER_FACTOR ** layers;
          return (
            <g key={a.id}>
              <text
                x={8}
                y={y + 10}
                fill="rgb(var(--dim))"
                fontSize={9}
                fontFamily="monospace"
              >
                {a.label}
              </text>
              <rect
                x={84}
                y={y}
                width={320}
                height={14}
                rx={2}
                fill="none"
                stroke="rgb(var(--border))"
                strokeWidth={1}
              />
              <rect
                x={84}
                y={y}
                width={Math.max(2, rate * 320)}
                height={14}
                rx={2}
                fill={a.id === attackId ? 'rgb(var(--accent))' : 'rgb(var(--fg) / 0.22)'}
                opacity={a.id === attackId ? 0.7 : 0.4}
              />
            </g>
          );
        })}
      </svg>

      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Defense layers
          </span>
          <span className="text-ink font-mono tabular-nums text-[12px]">{layers}</span>
        </div>
        <Slider
          value={layers}
          min={0}
          max={3}
          step={1}
          onChange={(v) => setLayers(Math.round(v))}
          formatValue={(v) => String(Math.round(v))}
          ariaLabel="Defense layers"
        />
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border font-mono text-[12px]">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Attack
          </dt>
          <dd className="text-ink">{attack.label}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Baseline ASR (0 layers)
          </dt>
          <dd className="text-ink tabular-nums">{(attack.base * 100).toFixed(0)}%</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.12em] text-dim mb-1">
            Attack success rate
          </dt>
          <dd className="text-accent tabular-nums">{(asr * 100).toFixed(0)}%</dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] text-dim font-mono leading-relaxed">
        Jailbreak starts highest. Each added defense layer multiplies
        ASR by 0.55 for every probe. A useful finding is a named attack
        plus a layer count, not a single average “safe” score.
      </p>
    </SimFrame>
  );
}
