'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { SimFrame } from '@/components/sim/primitives/SimFrame';
import {
  D,
  H1,
  H2,
  O,
  defaultParams,
  forwardAndBackward,
  numericalGradientScalar,
  type MlpParams,
  type ParamPath,
} from '@/lib/math/backprop';

/**
 * Centerpiece for the backpropagation lesson. A 3-layer MLP
 * (2 → 4 → 2 → 1) on a single training example. The reader
 * drags any weight slider; we re-run the forward + backward
 * pass and show:
 *
 *   - the activation at every node
 *   - the local ∂L/∂(every weight) next to the slider
 *   - the loss at the bottom (or a "Diverged" indicator if
 *     a hand-rolled "show backward pass" toggle is on and the
 *     reader has perturbed weights into a broken region)
 *
 * The "show backward pass" toggle highlights, for the
 * currently-selected weight, the path the gradient flowed
 * through on the way back from the loss.
 *
 * Build-time sanity: the per-weight gradient shown next to
 * each slider is verified against numerical differentiation
 * in `lib/math/backprop.test.ts`. The lesson's prose says
 * "you can trust the numbers" — that promise is enforced by
 * the test.
 */

const W1_SIZE = H1 * D;
const W2_SIZE = H2 * H1;
const W3_SIZE = O * H2;

interface SliderEntry {
  /** Flat index into the parameter set (just for ordering). */
  k: number;
  path: ParamPath;
  /** Human-readable label, e.g. "W1[0][1]". */
  label: string;
  /** Layer the weight belongs to (for grouping in the UI). */
  layer: 'W1' | 'b1' | 'W2' | 'b2' | 'W3' | 'b3';
}

function buildSliderList(): SliderEntry[] {
  const out: SliderEntry[] = [];
  for (let i = 0; i < H1; i += 1) {
    for (let j = 0; j < D; j += 1) {
      out.push({ k: out.length, path: { kind: 'W1', i, j }, label: `W1[${i}][${j}]`, layer: 'W1' });
    }
  }
  for (let i = 0; i < H1; i += 1) {
    out.push({ k: out.length, path: { kind: 'b1', i }, label: `b1[${i}]`, layer: 'b1' });
  }
  for (let i = 0; i < H2; i += 1) {
    for (let j = 0; j < H1; j += 1) {
      out.push({ k: out.length, path: { kind: 'W2', i, j }, label: `W2[${i}][${j}]`, layer: 'W2' });
    }
  }
  for (let i = 0; i < H2; i += 1) {
    out.push({ k: out.length, path: { kind: 'b2', i }, label: `b2[${i}]`, layer: 'b2' });
  }
  for (let j = 0; j < H2; j += 1) {
    out.push({ k: out.length, path: { kind: 'W3', i: 0, j }, label: `W3[0][${j}]`, layer: 'W3' });
  }
  out.push({ k: out.length, path: { kind: 'b3', i: 0 }, label: `b3[0]`, layer: 'b3' });
  return out;
}

const SLIDERS = buildSliderList();
const N_SLIDERS = SLIDERS.length; // = NUM_PARAMS

function getParam(params: MlpParams, path: ParamPath): number {
  switch (path.kind) {
    case 'W1': return params.W1[path.i]![path.j]!;
    case 'b1': return params.b1[path.i]!;
    case 'W2': return params.W2[path.i]![path.j]!;
    case 'b2': return params.b2[path.i]!;
    case 'W3': return params.W3[path.i]![path.j]!;
    case 'b3': return params.b3[path.i]!;
  }
}

function setParam(params: MlpParams, path: ParamPath, v: number): MlpParams {
  switch (path.kind) {
    case 'W1': {
      const W1 = params.W1.map((row) => row.slice());
      W1[path.i]![path.j] = v;
      return { ...params, W1 };
    }
    case 'b1': {
      const b1 = params.b1.slice();
      b1[path.i] = v;
      return { ...params, b1 };
    }
    case 'W2': {
      const W2 = params.W2.map((row) => row.slice());
      W2[path.i]![path.j] = v;
      return { ...params, W2 };
    }
    case 'b2': {
      const b2 = params.b2.slice();
      b2[path.i] = v;
      return { ...params, b2 };
    }
    case 'W3': {
      const W3 = params.W3.map((row) => row.slice());
      W3[path.i]![path.j] = v;
      return { ...params, W3 };
    }
    case 'b3': {
      const b3 = params.b3.slice();
      b3[path.i] = v;
      return { ...params, b3 };
    }
  }
}

function getGrad(grads: ReturnType<typeof forwardAndBackward>['grads'], path: ParamPath): number {
  switch (path.kind) {
    case 'W1': return grads.W1[path.i]![path.j]!;
    case 'b1': return grads.b1[path.i]!;
    case 'W2': return grads.W2[path.i]![path.j]!;
    case 'b2': return grads.b2[path.i]!;
    case 'W3': return grads.W3[path.i]![path.j]!;
    case 'b3': return grads.b3[path.i]!;
  }
}

/** The set of ParamPaths that lie on the backward pass from the loss
 * to the selected weight. The chain rule says the gradient of L
 * w.r.t. the selected weight is the product of the local Jacobians
 * along the path; we highlight the path itself, not the magnitude. */
function backwardPath(path: ParamPath): string[] {
  // The path is: y → (W3 row) → h2 → (W2 row) → h1 → (W1 row) → x
  // We highlight every weight/bias that's *upstream* of the
  // selected weight, i.e. that the chain rule multiplies through.
  switch (path.kind) {
    case 'b3':
      return ['b3'];
    case 'W3':
      return ['W3[0][0]', 'W3[0][1]', 'b3[0]'];
    case 'b2':
      // Layer 2 bias — gradient flows through z3 only.
      return ['W3[0][0]', 'W3[0][1]', 'b3[0]', `b2[${path.i}]`];
    case 'W2':
      // Layer 2 weight — flow through z3, then through every W3[j][i]
      // where the path enters h2[j] and exits to z3.
      return ['W3[0][0]', 'W3[0][1]', 'b3[0]', `W2[${path.i}][0]`, `W2[${path.i}][1]`, `W2[${path.i}][2]`, `W2[${path.i}][3]`];
    case 'b1':
      return [
        'W3[0][0]',
        'W3[0][1]',
        'b3[0]',
        `W2[0][0]`, `W2[0][1]`, `W2[0][2]`, `W2[0][3]`,
        `W2[1][0]`, `W2[1][1]`, `W2[1][2]`, `W2[1][3]`,
        'b2[0]', 'b2[1]',
        `b1[${path.i}]`,
      ];
    case 'W1':
      return [
        'W3[0][0]', 'W3[0][1]', 'b3[0]',
        `W2[0][0]`, `W2[0][1]`, `W2[0][2]`, `W2[0][3]`,
        `W2[1][0]`, `W2[1][1]`, `W2[1][2]`, `W2[1][3]`,
        'b2[0]', 'b2[1]',
        `W1[${path.i}][0]`, `W1[${path.i}][1]`,
      ];
  }
}

export function BackpropExplorer() {
  const [params, setParams] = useState<MlpParams>(() => defaultParams(0));
  const [x, setX] = useState<[number, number]>([0.5, -0.3]);
  const [t, setT] = useState<number>(0.4);
  const [seed, setSeed] = useState<number>(0); // bumps on randomize
  const [showBackward, setShowBackward] = useState<boolean>(true);
  // The selected weight, by ParamPath. Defaults to the first
  // W1 weight; user can switch via the layer tabs.
  const [selectedPath, setSelectedPath] = useState<ParamPath>({
    kind: 'W1',
    i: 0,
    j: 0,
  });

  const { cache, grads } = useMemo(
    () => forwardAndBackward(params, x, t),
    [params, x, t],
  );

  const highlighted = useMemo(() => new Set(backwardPath(selectedPath)), [selectedPath]);

  const onSliderChange = (path: ParamPath, value: number) => {
    setParams((p) => setParam(p, path, value));
  };

  const onRandomize = () => {
    setSeed((s) => s + 1);
    setParams(defaultParams(seed + 1));
  };

  // Group sliders by layer for the UI.
  const byLayer: Record<string, SliderEntry[]> = {};
  for (const s of SLIDERS) {
    if (!byLayer[s.layer]) byLayer[s.layer] = [];
    byLayer[s.layer]!.push(s);
  }

  return (
    <SimFrame
      title="Backprop, by hand"
      headerAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBackward((b) => !b)}
            className={
              'text-[11px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded border focus-ring transition-colors ' +
              (showBackward
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:text-ink')
            }
            aria-pressed={showBackward}
          >
            Show backward
          </button>
          <button
            type="button"
            onClick={onRandomize}
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
          >
            Re-init
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
        {/* Activations + loss */}
        <div className="space-y-3 font-mono text-[12px]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Activations
            </div>
            <div className="space-y-1">
              <Row label="x" values={cache.x.map((v) => v.toFixed(3))} />
              <Row
                label="h1 = relu(z1)"
                values={cache.h1.map((v) => v.toFixed(3))}
                highlight={(i) => selectedPath.kind === 'W1' && i === selectedPath.i}
              />
              <Row
                label="h2 = relu(z2)"
                values={cache.h2.map((v) => v.toFixed(3))}
                highlight={(i) =>
                  (selectedPath.kind === 'W2' && i === selectedPath.i) ||
                  (selectedPath.kind === 'W1' && false) ||
                  (selectedPath.kind === 'b1' && false)
                }
              />
              <Row label="y" values={[cache.y.toFixed(3)]} />
              <Row label="target" values={[t.toFixed(3)]} />
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-dim">Loss = ½(y − t)²</span>
              <span
                className={
                  Number.isFinite(cache.loss)
                    ? 'text-accent tabular-nums'
                    : 'text-[rgb(var(--negative))] tabular-nums'
                }
              >
                {Number.isFinite(cache.loss) ? cache.loss.toFixed(4) : 'NaN'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
              Input
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-dim">x[0]</div>
                <Slider
                  value={x[0]}
                  min={-1}
                  max={1}
                  step={0.05}
                  onChange={(v) => setX([v, x[1]])}
                  formatValue={(v) => v.toFixed(2)}
                  ariaLabel="x[0]"
                />
              </div>
              <div>
                <div className="text-dim">x[1]</div>
                <Slider
                  value={x[1]}
                  min={-1}
                  max={1}
                  step={0.05}
                  onChange={(v) => setX([x[0], v])}
                  formatValue={(v) => v.toFixed(2)}
                  ariaLabel="x[1]"
                />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-dim">target t</div>
              <Slider
                value={t}
                min={-1}
                max={1}
                step={0.05}
                onChange={setT}
                formatValue={(v) => v.toFixed(2)}
                ariaLabel="target t"
              />
            </div>
          </div>
        </div>

        {/* Sliders — one per parameter */}
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {(['W1', 'b1', 'W2', 'b2', 'W3', 'b3'] as const).map((layer) => (
            <div key={layer}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-1">
                {layer}
              </div>
              <div className="space-y-1.5">
                {byLayer[layer]!.map((s) => {
                  const v = getParam(params, s.path);
                  const g = getGrad(grads, s.path);
                  const isSelected =
                    JSON.stringify(s.path) === JSON.stringify(selectedPath);
                  const highlightedHere =
                    showBackward && (isSelected || highlighted.has(s.label));
                  return (
                    <button
                      type="button"
                      key={s.label}
                      onClick={() => setSelectedPath(s.path)}
                      className={
                        'block w-full text-left rounded px-2 py-1 transition-colors ' +
                        (highlightedHere
                          ? 'bg-accent-soft'
                          : 'hover:bg-bg/40')
                      }
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={
                            isSelected
                              ? 'text-accent text-[11px]'
                              : 'text-ink text-[11px]'
                          }
                        >
                          {s.label}
                        </span>
                        <span className="text-[11px] text-fg-subtle tabular-nums">
                          ∂L/∂ = {g.toFixed(3)}
                        </span>
                      </div>
                      <Slider
                        value={v}
                        min={-2}
                        max={2}
                        step={0.01}
                        onChange={(nv) => onSliderChange(s.path, nv)}
                        formatValue={(nv) => nv.toFixed(2)}
                        ariaLabel={s.label}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SimFrame>
  );
}

function Row({
  label,
  values,
  highlight,
}: {
  label: string;
  values: readonly string[];
  highlight?: (i: number) => boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 text-[11px]">
      <span className="text-dim w-32 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-x-2">
        {values.map((v, i) => (
          <span
            key={i}
            className={
              highlight && highlight(i)
                ? 'px-1.5 py-0.5 rounded bg-accent-soft text-accent tabular-nums'
                : 'text-ink tabular-nums'
            }
          >
            [{i}] {v}
          </span>
        ))}
      </div>
    </div>
  );
}
