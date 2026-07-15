

import { useMemo, useState } from 'react';
import {
  VectorCanvas,
  type VectorCanvasVector,
} from '@/components/sim/primitives/VectorCanvas';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import { softmax } from '@/lib/math/softmax';
import { scaledDot } from '@/lib/math/linalg';

const N_TOKENS = 4;
const TOKEN_LABELS: readonly string[] = ['cat', 'sat', 'down', 'on'];

const DEFAULT_Q: ReadonlyArray<readonly [number, number]> = [
  [1.4, 0.3],
  [0.3, 1.4],
  [-0.6, 1.1],
  [0.0, -1.4],
];

const DEFAULT_K: ReadonlyArray<readonly [number, number]> = [
  [1.0, 0.0],
  [0.0, 1.0],
  [1.0, 0.9],
  [-0.8, 0.4],
];

const DEFAULT_V: ReadonlyArray<readonly [number, number]> = [
  [1.5, 0.5],
  [0.5, 1.5],
  [-0.5, 1.0],
  [0.0, -1.5],
];

function computeWeights(
  q: ReadonlyArray<readonly [number, number]>,
  k: ReadonlyArray<readonly [number, number]>,
  temperature: number,
): number[][] {
  const n = q.length;
  return Array.from({ length: n }, (_, i) => {
    const row = Array.from({ length: n }, (_, j) => scaledDot(q[i]!, k[j]!, 2));
    return softmax(row.map((v) => v / temperature), 1);
  });
}

function fmt(x: number, digits = 2): string {
  if (Math.abs(x) < Math.pow(10, -digits)) return (0).toFixed(digits);
  return x.toFixed(digits);
}

type WMode = 'softmax' | 'one-hot' | 'uniform';

export function AttentionOutputExplorer() {
  const [v, setV] = useState<[number, number][]>(() =>
    DEFAULT_V.map((p) => [p[0], p[1]]),
  );
  const [temperature, setTemperature] = useState<number>(1.0);
  const [wMode, setWMode] = useState<WMode>('softmax');

  const W = useMemo(() => {
    if (wMode === 'softmax') {
      return computeWeights(DEFAULT_Q, DEFAULT_K, temperature);
    }
    if (wMode === 'uniform') {
      return Array.from({ length: N_TOKENS }, () =>
        new Array<number>(N_TOKENS).fill(1 / N_TOKENS),
      );
    }
    return Array.from({ length: N_TOKENS }, () => {
      const row = new Array<number>(N_TOKENS).fill(0);
      row[2] = 1;
      return row;
    });
  }, [wMode, temperature]);

  const output: [number, number][] = useMemo(() => {
    return W.map((row) => {
      let x = 0;
      let y = 0;
      for (let j = 0; j < N_TOKENS; j += 1) {
        x += (row[j] ?? 0) * (v[j]![0] ?? 0);
        y += (row[j] ?? 0) * (v[j]![1] ?? 0);
      }
      return [x, y];
    });
  }, [W, v]);

  const setVAt = (j: number, value: [number, number]) => {
    setV((prev) => {
      const next = prev.slice();
      next[j] = value;
      return next;
    });
  };

  const vectors: VectorCanvasVector[] = useMemo(() => {
    const out: VectorCanvasVector[] = [];
    v.forEach((p, j) => {
      out.push({ id: 'v' + j, label: 'V' + j, value: p });
    });
    output.forEach((p, i) => {
      out.push({ id: 'o' + i, label: 'out' + i, value: p });
    });
    return out;
  }, [v, output]);

  const onChange = (id: string, value: [number, number]) => {
    if (id.startsWith('v')) {
      const j = Number(id.slice(1));
      setVAt(j, value);
    }
  };

  const reset = () => {
    setV(DEFAULT_V.map((p) => [p[0], p[1]] as [number, number]));
    setTemperature(1.0);
    setWMode('softmax');
  };

  return (
    <SimFrame
      title="out[i] = Σⱼ W[i][j] · V[j] · drag V to see outputs shift"
      onReset={reset}
      headerWrap
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mr-1">
          W =
        </span>
        {([
          { id: 'softmax', label: 'softmax(QK^T/sqrt(d_k))' },
          { id: 'one-hot', label: 'one-hot at j=2' },
          { id: 'uniform', label: 'uniform' },
        ] as { id: WMode; label: string }[]).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setWMode(s.id)}
            className={
              'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
              (wMode === s.id
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink')
            }
            aria-pressed={wMode === s.id}
          >
            {s.label}
          </button>
        ))}
      </div>

      {wMode === 'softmax' && (
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
              Temperature
            </span>
            <span className="text-ink font-mono tabular-nums text-[12px]">
              T = {temperature.toFixed(2)}
            </span>
          </div>
          <Slider
            value={temperature}
            min={0.1}
            max={3.0}
            step={0.05}
            onChange={setTemperature}
            formatValue={(v) => v.toFixed(2)}
            ariaLabel="Temperature"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Vectors
          </div>
          <VectorCanvas
            vectors={vectors}
            onChange={onChange}
            height={320}
            range={{ x: [-2, 2], y: [-2, 2] }}
            ariaLabel="V vectors (draggable) and output vectors (read-only)."
          />
          <p className="mt-2 text-[11px] text-muted font-mono">
            <span className="text-accent">V0..V3</span> are draggable.
            <span className="ml-2 text-ink">out0..out3</span> are read-only.
          </p>
        </div>

        <div className="font-mono text-[12px]">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Weight matrix W
          </div>
          <table className="w-full text-center tabular-nums mb-4">
            <thead>
              <tr>
                <th className="text-dim text-[11px] font-normal"></th>
                {TOKEN_LABELS.map((t, j) => (
                  <th key={j} className="text-dim text-[11px] font-normal pb-1">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {W.map((row, i) => {
                const maxW = Math.max(...row);
                return (
                  <tr key={i}>
                    <td className="text-dim text-[11px] pr-2 text-right">
                      {TOKEN_LABELS[i]}
                    </td>
                    {row.map((w, j) => {
                      const isHi =
                        (wMode === 'softmax' && w === maxW) ||
                        (wMode === 'one-hot' && j === 2);
                      return (
                        <td
                          key={j}
                          className={isHi ? 'text-accent' : 'text-ink'}
                        >
                          {fmt(w, 2)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-2">
            Output vectors (one per query)
          </div>
          <table className="w-full text-center tabular-nums">
            <tbody>
              {output.map((p, i) => (
                <tr key={i}>
                  <td className="text-dim text-[11px] pr-2 text-right">
                    out{TOKEN_LABELS[i]}
                  </td>
                  <td className="text-ink">
                    ({fmt(p[0], 2)}, {fmt(p[1], 2)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SimFrame>
  );
}
