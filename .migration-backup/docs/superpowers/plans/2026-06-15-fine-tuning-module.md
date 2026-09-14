# Fine-tuning & Transfer module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 new lessons (track 8 — Adapting models to new tasks) that teach modern fine-tuning end-to-end: pretraining benefit, freezing, catastrophic forgetting, LoRA, and DPO-style preference learning.

**Architecture:** Each lesson follows the established pattern — `meta.ts`, `interactives.tsx` (lazy-loads sims via `next/dynamic`), and `lesson.mdx`. New math primitives live in `lib/math/`. Each new sim composes the existing `lib/math/training.ts` MLP rather than re-implementing it. Three registrations per lesson: `lib/lessons-meta.ts`, `lib/lesson-manifest.ts`, `lib/lessons.ts`.

**Spec drift from §Shared primitive:** The spec proposed extracting a `useToyMLPTraining` hook. On survey, the existing sims already delegate to `lib/math/training.ts.train()` — there is no React-side training loop to extract. The hook is dropped. New lessons reuse `train()` with thin per-lesson extensions (`trainWithFreezeMask`, `trainSequential`).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, MDX (`@next/mdx`), KaTeX (`remark-math` + `rehype-katex`), Tailwind themed via channel-pattern tokens, Vitest, pnpm. No state library; `useState`/`useReducer` only.

---

## Phase 0 — Scaffolding (one task)

### Task 1: Add track 8 placeholder to `lessons-meta.ts` so subsequent imports compile

**Files:**
- Modify: `lib/lessons-meta.ts` (TRACKS array; add track 8 entry with empty slugs)

This lets each lesson's registration commits build incrementally. The track 8 row stays empty until lesson 27 lands; `lint:content` ignores empty tracks.

- [ ] **Step 1: Edit `lib/lessons-meta.ts`, append to the `TRACKS` array (after the `regularization` entry):**

```ts
  {
    id: 'fine-tuning',
    label: 'Adapting models to new tasks',
    slugs: [],
  },
```

- [ ] **Step 2: Run gates to confirm no break:**

```bash
pnpm tsc --noEmit
pnpm test
pnpm lint:content
```

Expected: all pass; lesson count unchanged at 26.

- [ ] **Step 3: Commit:**

```bash
git add lib/lessons-meta.ts
git commit -m "Track 8 placeholder: Adapting models to new tasks"
```

---

## Phase 1 — Lesson 27: Pretraining vs fine-tuning

### Task 2: `lib/math/pretrain-init.ts` — baked pretrained weights + tests

**Files:**
- Create: `lib/math/pretrain-init.ts`
- Create: `lib/math/pretrain-init.test.ts`

**Design:**
- Exports `PRETRAINED_PARAMS: readonly number[]` — a `Params` vector (length `N_PARAMS` from `lib/math/training.ts`) generated *at build time* by training on a *related but different* toy task, then frozen as a static literal.
- Exports `generatePretrainedParams(seed): Params` — used once (in a script run during development) to regenerate the static array if the model topology changes. Not called at runtime.
- The related task is a 3-class classification problem with the same input shape (2D points) but a different decision boundary (e.g., three concentric arcs instead of three lobes of a swirl). The shared low-level features (point coordinates → first-layer activations) transfer; the late layers don't, so fine-tuning still adapts them.

- [ ] **Step 1: Write `pretrain-init.test.ts` (failing test first):**

```ts
import { describe, it, expect } from 'vitest';
import { PRETRAINED_PARAMS, generatePretrainedParams } from './pretrain-init';
import { N_PARAMS } from './training';

describe('PRETRAINED_PARAMS', () => {
  it('has length N_PARAMS', () => {
    expect(PRETRAINED_PARAMS.length).toBe(N_PARAMS);
  });

  it('is non-trivial (not all zero, not all the same)', () => {
    const set = new Set(PRETRAINED_PARAMS.map((v) => v.toFixed(6)));
    expect(set.size).toBeGreaterThan(20);
    const anyNonZero = PRETRAINED_PARAMS.some((v) => Math.abs(v) > 1e-3);
    expect(anyNonZero).toBe(true);
  });

  it('values are finite', () => {
    for (const v of PRETRAINED_PARAMS) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('generatePretrainedParams', () => {
  it('is deterministic for a fixed seed', () => {
    const a = generatePretrainedParams(42);
    const b = generatePretrainedParams(42);
    expect(a).toEqual(b);
  });

  it('different seeds produce different params', () => {
    const a = generatePretrainedParams(42);
    const b = generatePretrainedParams(99);
    expect(a).not.toEqual(b);
  });
});
```

- [ ] **Step 2: Run test, verify failure:**

```bash
pnpm test pretrain-init -- --run
```

Expected: FAIL — `pretrain-init.ts` not found.

- [ ] **Step 3: Implement `lib/math/pretrain-init.ts`:**

```ts
/**
 * "Pretrained" weight vector for the lesson-27 PretrainVsScratch sim.
 *
 * Baked as a static literal: training a tiny MLP on the *concentric
 * arcs* task (a 3-class problem with the same 2D input shape as
 * lessons 21+ but a different decision boundary) gives a parameter
 * vector that, when used to *initialize* fine-tuning on the standard
 * swirl task, converges faster and to lower loss than a fresh
 * random init.
 *
 * The values below were produced by running
 * `generatePretrainedParams(42)` once at authoring time. The
 * generator is deterministic so the array can be regenerated if the
 * model topology in `training.ts` ever changes.
 */
import { N_PARAMS, train } from './training';

/**
 * Generates a pretrained `Params` vector by training on the
 * concentric-arcs task. Deterministic given the seed.
 *
 * Not called at runtime — the baked `PRETRAINED_PARAMS` constant
 * below is used. This function exists so the constant can be
 * regenerated from a script if `N_PARAMS` changes.
 */
export function generatePretrainedParams(seed: number): number[] {
  // 200 samples of concentric-arcs data, seeded deterministically.
  const data = makeConcentricArcs(seed, 200);
  const result = train({
    seed,
    data,
    optimizer: 'adam',
    batchSize: 16,
    peakLr: 0.005,
    schedule: 'warmup-cosine',
    steps: 800,
  });
  return result.params;
}

function makeConcentricArcs(seed: number, n: number): readonly { x: readonly [number, number]; y: number }[] {
  // Three concentric arc segments (r=0.4, r=0.8, r=1.2),
  // each with n/3 noisy samples. PRNG is mulberry32(seed).
  let s = seed >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: { x: readonly [number, number]; y: number }[] = [];
  const radii = [0.4, 0.8, 1.2];
  for (let k = 0; k < n; k += 1) {
    const cls = k % 3;
    const r = radii[cls]! + (rand() - 0.5) * 0.08;
    const theta = rand() * Math.PI * 2;
    out.push({
      x: [r * Math.cos(theta), r * Math.sin(theta)] as const,
      y: cls,
    });
  }
  return out;
}

/**
 * The frozen pretrained weights for the lesson-27 sim. Generated
 * by `generatePretrainedParams(42)` at authoring time.
 */
export const PRETRAINED_PARAMS: readonly number[] = [
  /* TASK: regenerate by running generatePretrainedParams(42) once during implementation and pasting the array here. The test verifies length and non-triviality. */
];
```

- [ ] **Step 4: Generate the actual array.** Run a one-off script (e.g., `pnpm tsx scripts/regen-pretrained.ts` where the script imports `generatePretrainedParams(42)` and `console.log(JSON.stringify(...))`). Paste the resulting array into `PRETRAINED_PARAMS`. The array will be length `N_PARAMS` (~107 numbers).

- [ ] **Step 5: Run tests, verify pass:**

```bash
pnpm test pretrain-init -- --run
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit:**

```bash
git add lib/math/pretrain-init.ts lib/math/pretrain-init.test.ts
git commit -m "math: pretrain-init — baked weights for lesson 27"
```

### Task 3: `components/sim/PretrainVsScratch.tsx` — centerpiece

**Files:**
- Create: `components/sim/PretrainVsScratch.tsx`

**Design:**
- Two side-by-side loss curves: random init (gray) vs pretrained init (accent). Both train on the same swirl data via `train()` from `lib/math/training.ts`, differing only in their starting `Params`.
- The pretrained path uses `PRETRAINED_PARAMS` as the initial parameter vector; the random path uses the default initialization.
- Reader controls: "Train" button (kicks off both runs), "Reset" button. Step pacing via `requestAnimationFrame` — call `train()` once with `steps: <budget>` and animate the resulting loss-curve arrays at ~60fps.
- Final accuracy bars below each curve.

- [ ] **Step 1: Add a `train()` overload that accepts an `initParams` override.** Check `lib/math/training.ts:train()` signature; if it doesn't accept `initParams`, add an optional field and thread it through. Add a test in `lib/math/training.test.ts` that asserts: training with `initParams = PRETRAINED_PARAMS` returns a result whose `losses[0]` is *lower* than training with random init.

- [ ] **Step 2: Create the component:**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { PRETRAINED_PARAMS } from '@/lib/math/pretrain-init';
import { N_PARAMS } from '@/lib/math/training';

interface RunResult {
  losses: number[];
  finalAccuracy: number;
}

const STEPS = 400;

export function PretrainVsScratch() {
  const [trainFn, setTrainFn] = useState<typeof import('@/lib/math/training').train | null>(null);
  const [scratchRun, setScratchRun] = useState<RunResult | null>(null);
  const [pretrainedRun, setPretrainedRun] = useState<RunResult | null>(null);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/math/training').then((m) => {
      if (!cancelled) setTrainFn(() => m.train);
    });
    return () => { cancelled = true; };
  }, []);

  function handleTrain() {
    if (!trainFn) return;
    // Train both runs eagerly, animate the reveal via `step`.
    const baseConfig = {
      seed: 0,
      // Use a smaller-than-default swirl dataset to magnify the
      // pretraining advantage at scarce-data scale.
      data: makeSwirlData(0, 64),
      optimizer: 'adam' as const,
      batchSize: 16,
      peakLr: 0.005,
      schedule: 'warmup-cosine' as const,
      steps: STEPS,
    };
    const scratch = trainFn(baseConfig);
    const pretrained = trainFn({ ...baseConfig, initParams: [...PRETRAINED_PARAMS] });
    setScratchRun({ losses: scratch.losses, finalAccuracy: scratch.testAcc.at(-1) ?? 0 });
    setPretrainedRun({ losses: pretrained.losses, finalAccuracy: pretrained.testAcc.at(-1) ?? 0 });
    setStep(0);
    setRunning(true);
  }

  // Animate `step` from 0 to STEPS over ~2 seconds.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let start = 0;
    const DURATION_MS = 2000;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / DURATION_MS);
      setStep(Math.floor(p * STEPS));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setRunning(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleTrain}
          disabled={!trainFn || running}
          className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-sm hover:border-border-strong disabled:opacity-50"
        >
          Train
        </button>
        <button
          type="button"
          onClick={() => { setScratchRun(null); setPretrainedRun(null); setStep(0); }}
          className="rounded border border-border bg-bg-elevated px-3 py-1.5 font-mono text-sm hover:border-border-strong"
        >
          Reset
        </button>
      </div>
      <LossCurves
        scratch={scratchRun}
        pretrained={pretrainedRun}
        step={step}
        totalSteps={STEPS}
      />
      <FinalAccuracyBars scratch={scratchRun} pretrained={pretrainedRun} visible={!running && !!scratchRun} />
    </div>
  );
}

// LossCurves: two SVG polylines plotted in the same axes. Scratch
// in `rgb(var(--dim))`, pretrained in `rgb(var(--accent))`. Y-axis
// = loss (0..max(losses)), X-axis = step (0..totalSteps). Reveal
// up to `step`, so the curves "draw in" as the animation runs.
function LossCurves(props: { scratch: RunResult | null; pretrained: RunResult | null; step: number; totalSteps: number }) {
  /* SVG polyline rendering — see ScheduleExplorer or OptimizerRace
     for the existing pattern. ~40 lines. */
  return <div />;
}

function FinalAccuracyBars(props: { scratch: RunResult | null; pretrained: RunResult | null; visible: boolean }) {
  /* Two horizontal bars labeled "from scratch" and "pretrained",
     widths proportional to final accuracy. Hidden until run
     completes. ~30 lines. */
  return <div />;
}

function makeSwirlData(seed: number, n: number) {
  /* The standard swirl dataset already used in TrainingEndToEnd's
     data generator. Likely already exported from lib/math/training
     or lib/math/training-data — check first, reuse. If not, port
     the swirl generator (see TrainingEndToEnd lines ~90 for the
     existing pattern). */
  return [];
}
```

- [ ] **Step 3: Wire `LossCurves` and `FinalAccuracyBars` using the existing pattern from `components/sim/OptimizerRace.tsx` and `components/sim/TrainingPresetComparison.tsx`.** These already render multiple parallel runs; do not invent a new visualization. Read those files and adapt.

- [ ] **Step 4: Run tsc:**

```bash
pnpm tsc --noEmit
```

Expected: clean. If `train()` doesn't accept `initParams`, the addition from Step 1 was missed — go back.

- [ ] **Step 5: Commit:**

```bash
git add components/sim/PretrainVsScratch.tsx lib/math/training.ts lib/math/training.test.ts
git commit -m "sim: PretrainVsScratch centerpiece + train(initParams) support"
```

### Task 4: `components/sim/DataSizeSlider.tsx` — secondary widget

**Files:**
- Create: `components/sim/DataSizeSlider.tsx`

**Design:**
- A `Slider` (from `components/sim/primitives/Slider`) for fine-tuning dataset size: 8 → 256 samples in log-spaced steps.
- For each slider value, train both scratch and pretrained runs (same as centerpiece). Plot final loss (or final accuracy) as two points on a tiny line chart that builds up as the slider is moved.
- Caches results by N so dragging the slider doesn't retrain on every change.

- [ ] **Step 1: Create the component, following the same `'use client'` + `useEffect` + dynamic `train` import pattern from PretrainVsScratch:**

```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { Slider } from '@/components/sim/primitives/Slider';
import { PRETRAINED_PARAMS } from '@/lib/math/pretrain-init';

const N_VALUES = [8, 16, 32, 64, 128, 256] as const;

export function DataSizeSlider() {
  const [trainFn, setTrainFn] = useState<typeof import('@/lib/math/training').train | null>(null);
  const [nIdx, setNIdx] = useState(2); // default = 32 samples
  const [cache, setCache] = useState<Record<number, { scratchLoss: number; pretrainedLoss: number }>>({});

  useEffect(() => {
    let cancelled = false;
    import('@/lib/math/training').then((m) => {
      if (!cancelled) setTrainFn(() => m.train);
    });
    return () => { cancelled = true; };
  }, []);

  const n = N_VALUES[nIdx]!;

  useEffect(() => {
    if (!trainFn || cache[n]) return;
    const baseConfig = { seed: 0, optimizer: 'adam' as const, batchSize: Math.min(16, n), peakLr: 0.005, schedule: 'warmup-cosine' as const, steps: 200 };
    const data = makeSwirlData(0, n);
    const scratch = trainFn({ ...baseConfig, data });
    const pretrained = trainFn({ ...baseConfig, data, initParams: [...PRETRAINED_PARAMS] });
    setCache((c) => ({
      ...c,
      [n]: {
        scratchLoss: scratch.losses.at(-1) ?? 0,
        pretrainedLoss: pretrained.losses.at(-1) ?? 0,
      },
    }));
  }, [trainFn, n, cache]);

  const chartPoints = useMemo(() => {
    return N_VALUES.filter((nv) => cache[nv]).map((nv) => ({
      n: nv,
      scratch: cache[nv]!.scratchLoss,
      pretrained: cache[nv]!.pretrainedLoss,
    }));
  }, [cache]);

  return (
    <div className="space-y-4">
      <Slider
        label="Fine-tuning dataset size"
        value={nIdx}
        min={0}
        max={N_VALUES.length - 1}
        step={1}
        formatValue={(v) => `${N_VALUES[v]} samples`}
        onChange={setNIdx}
      />
      <GapChart points={chartPoints} />
    </div>
  );
}

function GapChart(props: { points: { n: number; scratch: number; pretrained: number }[] }) {
  /* SVG: log-x for n, linear-y for loss. Two polylines (scratch +
     pretrained). Final-loss gap is wide at n=8 and narrow at n=256.
     ~50 lines; mirror BarChart's axis-rendering helpers. */
  return <div />;
}

function makeSwirlData(seed: number, n: number) {
  /* Shared with PretrainVsScratch — extract to a tiny helper at
     lib/math/training.ts if not already exported. */
  return [];
}
```

- [ ] **Step 2: Run tsc + tests:**

```bash
pnpm tsc --noEmit
pnpm test
```

- [ ] **Step 3: Commit:**

```bash
git add components/sim/DataSizeSlider.tsx
git commit -m "sim: DataSizeSlider — secondary for lesson 27"
```

### Task 5: Lesson 27 content files

**Files:**
- Create: `content/lessons/pretraining-vs-finetuning/meta.ts`
- Create: `content/lessons/pretraining-vs-finetuning/interactives.tsx`
- Create: `content/lessons/pretraining-vs-finetuning/lesson.mdx`

- [ ] **Step 1: `meta.ts`:**

```ts
export const meta = {
  slug: 'pretraining-vs-finetuning',
  title: 'Pretraining vs fine-tuning',
  summary:
    'Starting from a related checkpoint reaches lower loss with less data. Pretraining bakes general features into the early layers; fine-tuning adapts the late layers to the target task. The gap is widest when target data is scarce.',
  minutes: 7,
  order: 27,
} as const;

export type LessonMeta = typeof meta;
```

- [ ] **Step 2: `interactives.tsx` — copy the weight-decay pattern with the new components:**

```tsx
'use client';
import dynamic from 'next/dynamic';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import type { InteractiveEntry } from '@/components/lesson/Workbench';

const PretrainVsScratch = dynamic(
  () => import('@/components/sim/PretrainVsScratch').then((m) => m.PretrainVsScratch),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

const DataSizeSlider = dynamic(
  () => import('@/components/sim/DataSizeSlider').then((m) => m.DataSizeSlider),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'pretrain-vs-scratch',
    title: 'Pretrained vs from-scratch training',
    description:
      'Two tiny MLPs train side-by-side on the same swirl dataset. One starts from random init; the other starts from a checkpoint pretrained on a *related* task (concentric arcs). Click Train to watch both loss curves descend in parallel.',
    caption:
      'The pretrained run starts at a lower loss (its early layers already know how to extract useful features from 2D points) and converges faster. Final accuracy bars below the curves show the gap at convergence — typically 10-20 percentage points on this small-N task.',
    Component: PretrainVsScratch,
  },
  {
    id: 'data-size-slider',
    title: 'Where the gap lives: dataset size',
    description:
      'For each dataset size N, both runs are trained to convergence and their final losses plotted. Drag the slider to fill in more points.',
    caption:
      'At small N the pretrained line sits well below the scratch line — pretraining is most valuable when target data is scarce. At large N the two converge: with enough data, the model can re-learn the features from scratch.',
    Component: DataSizeSlider,
  },
];
```

- [ ] **Step 3: `lesson.mdx`. Structure:**

```mdx
import { MathCode } from '@/components/lesson/MathCode';
import { Callout } from '@/components/lesson/Callout';

## What if the model already knew something useful?

[~150-200 words. Hook: the capstone in lesson 21 trains from random init.
Most real models don't. They start from a *checkpoint* that already learned
*something* on a much bigger, related dataset. Why does that help?]

## What pretraining gives you

[~200 words. Two layers of MLP can be split into "feature extractor" (the
early layers — what the model sees) vs "head" (the late layers — how it
decides). Pretraining teaches the feature extractor on a related task; that
knowledge transfers. Fine-tuning re-uses those features and only has to
learn the head + minor adjustments.]

<MathCode
  math="\theta_{\text{init}} \leftarrow \theta_{\text{pretrained}}\;,\quad \text{then}\;\;\theta \leftarrow \theta - \eta \nabla L_{\text{target}}(\theta)"
  code={`# Same gradient-descent loop as before — only the starting point changes.
model.weights = load_pretrained_checkpoint()
for step in range(num_steps):
    g = loss_grad(model, target_data[step % len(target_data)])
    model.weights -= lr * g`}
  caption="The mechanics of fine-tuning are identical to training from scratch — same gradient, same optimizer. The only difference is the initial weights."
/>

## Try it

<Callout targetInteractive="pretrain-vs-scratch">
  Click Train. Two MLPs descend the loss curve side-by-side on the same
  swirl data. The pretrained one starts lower (its feature extractor is
  already useful) and reaches a lower minimum.
</Callout>

<Callout targetInteractive="data-size-slider">
  Now ask: where does the gap live? Drag the dataset-size slider from 8 up
  to 256. At small N the gap is huge — pretrained reaches near-zero loss
  while scratch barely moves. At large N the two converge: enough data,
  and the scratch model can learn the features itself.
</Callout>

## Why the gap is small at large N

[~150 words. The information argument: a model trained on 256 samples has
enough signal to discover the feature representation on its own. A model
trained on 8 samples does not — it falls back on whatever its initial
weights already encode. Pretraining is most valuable when target data is
the bottleneck.]

## Recap

Three takeaways. **Pretraining bakes general features into the early
layers of a network**, and those features transfer to related target
tasks. **Fine-tuning is the same gradient-descent loop** — only the
initial weights change. **The benefit is biggest when target data is
scarce** — at large target-N, scratch catches up. The next lesson: when
you do fine-tune, do you have to update *all* the weights, or can you
freeze the early layers and only update the late ones?
```

- [ ] **Step 4: Commit:**

```bash
git add content/lessons/pretraining-vs-finetuning
git commit -m "Lesson 27 content: Pretraining vs fine-tuning"
```

### Task 6: Lesson 27 registration

**Files:**
- Modify: `lib/lessons-meta.ts` (3 edits — import, manifest entry, TRACKS update)
- Modify: `lib/lesson-manifest.ts` (3 edits — meta import, metaBySlug, interactivesLoaders)
- Modify: `lib/lessons.ts` (1 edit — mdxLessonLoaders)
- Modify: `content/concepts/graph.yaml` (3 edits — concept node, lesson-concept node, edges)

- [ ] **Step 1: `lib/lessons-meta.ts`.**

Add the import (after the regularization imports, ~line 39):
```ts
import { meta as pretrainingVsFinetuningMeta } from '@/content/lessons/pretraining-vs-finetuning/meta';
```

Add to `manifest` array (after `earlyStoppingAugmentationMeta`):
```ts
  { meta: pretrainingVsFinetuningMeta },
```

Update the fine-tuning track entry (added in Task 1) to:
```ts
  {
    id: 'fine-tuning',
    label: 'Adapting models to new tasks',
    slugs: ['pretraining-vs-finetuning'],
  },
```

- [ ] **Step 2: `lib/lesson-manifest.ts`.**

Add the meta import (after `earlyStoppingAugmentationMeta`):
```ts
import { meta as pretrainingVsFinetuningMeta } from '@/content/lessons/pretraining-vs-finetuning/meta';
```

Add to `metaBySlug` map:
```ts
  'pretraining-vs-finetuning': pretrainingVsFinetuningMeta,
```

Add to `interactivesLoaders` map:
```ts
  'pretraining-vs-finetuning': () =>
    import('@/content/lessons/pretraining-vs-finetuning/interactives').then((m) => ({
      interactives: m.interactives,
    })),
```

- [ ] **Step 3: `lib/lessons.ts`.**

Add to `mdxLessonLoaders` (after the `earlyStoppingAugmentationMeta` entry):
```ts
  'pretraining-vs-finetuning': () =>
    import('@/content/lessons/pretraining-vs-finetuning/lesson.mdx'),
```

- [ ] **Step 4: `content/concepts/graph.yaml`.**

Add concept node (in the "Fine-tuning module" group — create the group comment if not already there):
```yaml
  # Fine-tuning module
  - id: pretraining
    title: Pretraining
  - id: fine-tuning
    title: Fine-tuning
```

Add lesson-concept node:
```yaml
  - id: pretraining-vs-finetuning-concept
    title: "Pretraining vs fine-tuning"
    lesson: pretraining-vs-finetuning
```

Add edges (in the `edges:` section):
```yaml
  - from: gradient-descent
    to: pretraining
  - from: pretraining
    to: fine-tuning
  - from: training-loop
    to: fine-tuning
  - from: pretraining-vs-finetuning-concept
    to: pretraining
  - from: pretraining-vs-finetuning-concept
    to: fine-tuning
```

- [ ] **Step 5: Run all gates:**

```bash
pnpm lint:content
pnpm test
pnpm tsc --noEmit
pnpm build
```

Expected: lint:content reports 27 lessons; all tests pass; build succeeds.

- [ ] **Step 6: Visual smoke test:**

```bash
pnpm dev
```

Visit `http://localhost:3000/lessons/pretraining-vs-finetuning`. Verify:
- Prose renders, KaTeX math displays.
- Both sims load (skeleton → content).
- "Train" button starts the animation; loss curves visible.
- Slider moves; chart fills in.
- Prev link → `early-stopping-augmentation`; next is undefined (last lesson).

- [ ] **Step 7: Commit:**

```bash
git add lib/lessons-meta.ts lib/lesson-manifest.ts lib/lessons.ts content/concepts/graph.yaml
git commit -m "Lesson 27 registration + concept graph edges"
```

---

## Phase 2 — Lesson 28: Freezing vs full fine-tuning

### Task 7: `lib/math/freeze-mask.ts` — per-layer freeze + tests

**Files:**
- Create: `lib/math/freeze-mask.ts`
- Create: `lib/math/freeze-mask.test.ts`

**Design:**
- Exports `applyFreezeMask(grad: Params, mask: { layer1: boolean; layer2: boolean; layer3: boolean }): Params`. Returns a new gradient vector where layers marked `true` (frozen) have all gradient entries zeroed.
- Slicing matches `sliceParams()` from `lib/math/training.ts`: layer 1 = W1+b1 (N_HID×N_IN + N_HID slots), layer 2 = W2+b2, layer 3 = W3+b3.
- Also exports `freezeParamCount(mask)` returning the number of params *updated* under the mask (used by `LayerFreezeExplorer`'s "params updated" counter).

- [ ] **Step 1: Write test (failing first):**

```ts
import { describe, it, expect } from 'vitest';
import { applyFreezeMask, freezeParamCount } from './freeze-mask';
import { N_PARAMS, N_HID, N_IN, N_OUT } from './training';

const L1 = N_HID * N_IN + N_HID;
const L2 = N_HID * N_HID + N_HID;
const L3 = N_OUT * N_HID + N_OUT;

describe('applyFreezeMask', () => {
  const allOnes: number[] = Array(N_PARAMS).fill(1);

  it('mask with no freeze returns the input unchanged', () => {
    const out = applyFreezeMask(allOnes, { layer1: false, layer2: false, layer3: false });
    expect(out).toEqual(allOnes);
  });

  it('freezing layer 1 zeros only the first L1 entries', () => {
    const out = applyFreezeMask(allOnes, { layer1: true, layer2: false, layer3: false });
    for (let i = 0; i < L1; i += 1) expect(out[i]).toBe(0);
    for (let i = L1; i < N_PARAMS; i += 1) expect(out[i]).toBe(1);
  });

  it('freezing layer 2 zeros only the middle L2 entries', () => {
    const out = applyFreezeMask(allOnes, { layer1: false, layer2: true, layer3: false });
    for (let i = 0; i < L1; i += 1) expect(out[i]).toBe(1);
    for (let i = L1; i < L1 + L2; i += 1) expect(out[i]).toBe(0);
    for (let i = L1 + L2; i < N_PARAMS; i += 1) expect(out[i]).toBe(1);
  });

  it('freezing layer 3 zeros only the last L3 entries', () => {
    const out = applyFreezeMask(allOnes, { layer1: false, layer2: false, layer3: true });
    for (let i = 0; i < L1 + L2; i += 1) expect(out[i]).toBe(1);
    for (let i = L1 + L2; i < N_PARAMS; i += 1) expect(out[i]).toBe(0);
  });

  it('freezing all three zeros the whole gradient', () => {
    const out = applyFreezeMask(allOnes, { layer1: true, layer2: true, layer3: true });
    for (const v of out) expect(v).toBe(0);
  });
});

describe('freezeParamCount', () => {
  it('counts the right number of trainable params per config', () => {
    expect(freezeParamCount({ layer1: false, layer2: false, layer3: false })).toBe(N_PARAMS);
    expect(freezeParamCount({ layer1: true, layer2: true, layer3: true })).toBe(0);
    expect(freezeParamCount({ layer1: true, layer2: false, layer3: false })).toBe(L2 + L3);
    expect(freezeParamCount({ layer1: true, layer2: true, layer3: false })).toBe(L3);
  });
});
```

- [ ] **Step 2: Run, verify fail.** Run: `pnpm test freeze-mask -- --run`. Expected: `freeze-mask.ts` not found.

- [ ] **Step 3: Implement `lib/math/freeze-mask.ts`:**

```ts
/**
 * Per-layer freeze mask for the lesson-28 LayerFreezeExplorer sim.
 *
 * Multiplies the gradient slice for each layer by 0 (frozen) or 1
 * (trainable). Returns a new vector — does not mutate.
 */
import { N_HID, N_IN, N_OUT, N_PARAMS } from './training';

export interface FreezeMask {
  layer1: boolean;
  layer2: boolean;
  layer3: boolean;
}

const L1_LEN = N_HID * N_IN + N_HID;
const L2_LEN = N_HID * N_HID + N_HID;
const L3_LEN = N_OUT * N_HID + N_OUT;

export function applyFreezeMask(grad: readonly number[], mask: FreezeMask): number[] {
  if (grad.length !== N_PARAMS) {
    throw new Error(`applyFreezeMask: grad must have length ${N_PARAMS} (got ${grad.length})`);
  }
  const out = grad.slice();
  if (mask.layer1) for (let i = 0; i < L1_LEN; i += 1) out[i] = 0;
  if (mask.layer2) for (let i = L1_LEN; i < L1_LEN + L2_LEN; i += 1) out[i] = 0;
  if (mask.layer3) for (let i = L1_LEN + L2_LEN; i < N_PARAMS; i += 1) out[i] = 0;
  return out;
}

export function freezeParamCount(mask: FreezeMask): number {
  return (
    (mask.layer1 ? 0 : L1_LEN) +
    (mask.layer2 ? 0 : L2_LEN) +
    (mask.layer3 ? 0 : L3_LEN)
  );
}
```

- [ ] **Step 4: Add a `trainWithFreezeMask()` to `lib/math/training.ts`:**

A thin wrapper that takes the same config as `train()` plus a `freezeMask: FreezeMask`, and applies the mask to each step's gradient before the optimizer step. Add a test that asserts: freezing all layers produces zero loss change between step 0 and step `n`.

- [ ] **Step 5: Run tests, verify pass.** Run: `pnpm test freeze-mask -- --run`.

- [ ] **Step 6: Commit:**

```bash
git add lib/math/freeze-mask.ts lib/math/freeze-mask.test.ts lib/math/training.ts lib/math/training.test.ts
git commit -m "math: freeze-mask + trainWithFreezeMask for lesson 28"
```

### Task 8: `components/sim/LayerFreezeExplorer.tsx` + `components/sim/ParamsVsAccuracyTable.tsx`

**Files:**
- Create: `components/sim/LayerFreezeExplorer.tsx`
- Create: `components/sim/ParamsVsAccuracyTable.tsx`

**Design — LayerFreezeExplorer:**
- Three checkboxes (one per layer). Reader toggles, hits "Train," sees:
  - The training-loss curve (single line).
  - A bar chart of per-layer gradient norms (frozen layers show empty bars).
  - Final accuracy.

**Design — ParamsVsAccuracyTable:**
- Pre-trains all 8 freeze configurations (8 runs cached on first mount). Renders a horizontal bar chart: x = params updated, y = freeze config (labeled e.g. "freeze L1+L2"), bar length = final accuracy.

- [ ] **Step 1: Create `LayerFreezeExplorer.tsx` following the dynamic-import + train pattern. Three `useState<boolean>` for the layers; `trainWithFreezeMask` from training; gradient-norm bars rendered via SVG (or reuse `BarChart` primitive if it accepts arbitrary data).**

- [ ] **Step 2: Create `ParamsVsAccuracyTable.tsx`. Precompute the 8 configs in a `useEffect` once `trainFn` is loaded. Cache in component state.**

- [ ] **Step 3: tsc + tests + commit:**

```bash
pnpm tsc --noEmit && pnpm test
git add components/sim/LayerFreezeExplorer.tsx components/sim/ParamsVsAccuracyTable.tsx
git commit -m "sim: LayerFreezeExplorer + ParamsVsAccuracyTable for lesson 28"
```

### Task 9: Lesson 28 content + registration

Follow the same structure as Task 5+6 for slug `freezing-vs-full-finetuning`:

**Files:**
- Create: `content/lessons/freezing-vs-full-finetuning/{meta.ts,interactives.tsx,lesson.mdx}`
- Modify: `lib/lessons-meta.ts`, `lib/lesson-manifest.ts`, `lib/lessons.ts`, `content/concepts/graph.yaml`

- [ ] **Step 1: `meta.ts`** — slug `freezing-vs-full-finetuning`, title `Freezing vs full fine-tuning`, summary covering "you can adapt by updating only the last layer; the early layers carry transferable features; freezing trades compute for a small accuracy hit," minutes 8, order 28.

- [ ] **Step 2: `interactives.tsx`** — same dynamic-import shape as Task 5 Step 2, importing `LayerFreezeExplorer` and `ParamsVsAccuracyTable`.

- [ ] **Step 3: `lesson.mdx`** — sections:
  - **Q heading**: "When you fine-tune, do you have to update *every* weight?"
  - **Formula block**: gradient with a per-layer mask `∇θ_ℓ L · m_ℓ`, where `m_ℓ ∈ {0,1}`.
  - **MathCode**: the masked gradient update; code shows a freeze loop.
  - **Centerpiece Callout** → `layer-freeze-explorer`: "Toggle layer 1's freeze. Train. The loss-curve still descends — most of the adaptation happens in the last layer. Now freeze the last layer too: the curve flattens. The feature extractor alone isn't enough."
  - **Secondary Callout** → `params-vs-accuracy-table`: "Look at all 8 configs at once. The elbow is at 'freeze L1' — saves ~60% of updates at the cost of <3% accuracy."
  - **Recap**: three takeaways (early layers carry general features; updating only the late layers is enough for related target tasks; this is the foundation of "head fine-tuning" and the bridge to LoRA, which we'll see in two lessons).

- [ ] **Step 4: Registration** — same 4 file edits as Task 6 with slug `freezing-vs-full-finetuning`. TRACKS slugs list becomes `['pretraining-vs-finetuning', 'freezing-vs-full-finetuning']`. Add graph nodes (`layer-freezing` concept), lesson-concept node, and prereq edge `pretraining-vs-finetuning-concept → freezing-vs-full-finetuning-concept` (in-track) + `chain-rule → layer-freezing` (cross-track from backprop).

- [ ] **Step 5: Gates + visual smoke + commit.**

```bash
pnpm lint:content && pnpm test && pnpm tsc --noEmit && pnpm build
git add content/lessons/freezing-vs-full-finetuning lib/lessons-meta.ts lib/lesson-manifest.ts lib/lessons.ts content/concepts/graph.yaml
git commit -m "Lesson 28: Freezing vs full fine-tuning"
```

---

## Phase 3 — Lesson 29: Catastrophic forgetting

### Task 10: `lib/math/forgetting.ts` — sequential trainer + dual-eval + tests

**Files:**
- Create: `lib/math/forgetting.ts`
- Create: `lib/math/forgetting.test.ts`

**Design:**
- Exports `trainSequential(opts: { taskA: Example[]; taskB: Example[]; stepsA: number; stepsB: number; lrA: number; lrB: number; interleave: boolean; seed: number })`. Returns `{ accAOverTime: number[]; accBOverTime: number[] }` — arrays of length `stepsA + stepsB`, where each entry is the accuracy on *both* tasks evaluated at that step.
- `interleave: true` shuffles A+B samples together; `false` runs A first then B.

- [ ] **Step 1: Write the test (failing first):**

```ts
import { describe, it, expect } from 'vitest';
import { trainSequential } from './forgetting';
import { makeSwirlData } from './training';

describe('trainSequential', () => {
  it('sequential + high LR collapses task-A accuracy', () => {
    const taskA = makeSwirlData(0, 100);
    const taskB = makeSwirlData(1, 100); // different seed → different swirl
    const result = trainSequential({
      taskA, taskB, stepsA: 200, stepsB: 200,
      lrA: 0.005, lrB: 0.02, interleave: false, seed: 0,
    });
    const earlyA = result.accAOverTime[199]!; // end of phase A
    const lateA = result.accAOverTime[result.accAOverTime.length - 1]!;
    expect(earlyA).toBeGreaterThan(0.7); // phase A trained well
    expect(lateA).toBeLessThan(earlyA - 0.2); // dropped at least 20pp
  });

  it('interleaved + low LR keeps both tasks high', () => {
    const taskA = makeSwirlData(0, 100);
    const taskB = makeSwirlData(1, 100);
    const result = trainSequential({
      taskA, taskB, stepsA: 200, stepsB: 200,
      lrA: 0.005, lrB: 0.005, interleave: true, seed: 0,
    });
    const finalA = result.accAOverTime.at(-1)!;
    const finalB = result.accBOverTime.at(-1)!;
    expect(finalA).toBeGreaterThan(0.6);
    expect(finalB).toBeGreaterThan(0.6);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** — wraps `train()` with a two-phase loop. Phase A: train on `taskA` for `stepsA` steps. Phase B: continue training (params carry over) on `taskB` (or interleaved if `interleave`). At every step, evaluate on *both* held-out test slices of A and B. Use existing `evaluateAccuracy` if present, else write a small inline helper.

- [ ] **Step 4: tests pass, commit:**

```bash
pnpm test forgetting -- --run
git add lib/math/forgetting.ts lib/math/forgetting.test.ts
git commit -m "math: forgetting — sequential trainer + dual-eval"
```

### Task 11: `components/sim/SequentialTaskTrainer.tsx` + `components/sim/MitigationToggles.tsx`

**Files:**
- Create: `components/sim/SequentialTaskTrainer.tsx` (centerpiece)
- Create: `components/sim/MitigationToggles.tsx` (secondary)

**Design — SequentialTaskTrainer:**
- Two-line plot: accuracy on task A (gray line), accuracy on task B (accent line), x-axis = training step.
- A vertical marker at the phase A→B transition.
- "Train" button + "Reset" button.
- Default config: stepsA=200, stepsB=200, lrA=0.005, lrB=0.02 (the "forgetting" config — phase B uses 4× the LR to make the collapse visible within a watchable horizon).

**Design — MitigationToggles:**
- Two switches: "Lower LR during phase B" (changes lrB from 0.02 to 0.005), "Interleave A+B samples" (flips `interleave`).
- Re-runs `trainSequential()` whenever toggles change (with debounce + cache).
- Same two-line plot; shows the post-mitigation curves.

- [ ] **Step 1: Implement both sims, dynamic-importing `trainSequential` like prior sims do with `train`.**

- [ ] **Step 2: tsc + commit:**

```bash
pnpm tsc --noEmit && pnpm test
git add components/sim/SequentialTaskTrainer.tsx components/sim/MitigationToggles.tsx
git commit -m "sim: SequentialTaskTrainer + MitigationToggles for lesson 29"
```

### Task 12: Lesson 29 content + registration

**Files:**
- Create: `content/lessons/catastrophic-forgetting/{meta.ts,interactives.tsx,lesson.mdx}`
- Modify: `lib/lessons-meta.ts`, `lib/lesson-manifest.ts`, `lib/lessons.ts`, `content/concepts/graph.yaml`

- [ ] **Step 1: `meta.ts`** — slug `catastrophic-forgetting`, order 29.

- [ ] **Step 2: `interactives.tsx`** — wraps the two sims with dynamic imports.

- [ ] **Step 3: `lesson.mdx`** — sections:
  - **Q heading**: "If fine-tuning is just more training, what happens to what the model already knew?"
  - **Formula**: the standard SGD update — no new math. The phenomenon is empirical, not algebraic.
  - **Centerpiece Callout** → `sequential-task-trainer`: "Train on task A until it's at ~90% accuracy. Now switch to task B. Watch task A's accuracy collapse as B's rises. The crossover is the lesson."
  - **Why it happens** (~250 words): the gradient on task B doesn't know about task A. It points wherever B's loss decreases — including paths that destroy A's competence. With a high LR, single-step damage is large; with sequential exposure, A never gets a corrective signal.
  - **Mitigation Callout** → `mitigation-toggles`: "Lower the phase-B LR. The forgetting curve shallows. Interleave A+B samples. Both tasks stay high. The problem is sequential exposure at high LR, not fine-tuning itself."
  - **Recap**: three takeaways — fine-tuning can erase prior competence (the phenomenon); the conditions are sequential exposure + high LR (the mechanism); mitigation is interleaving or LR damping (the fix). Tease the next lesson: "One more mitigation is to *not* update every weight — that's LoRA, next."

- [ ] **Step 4: Registration** — slug `catastrophic-forgetting`. TRACKS slugs append. Graph: `catastrophic-forgetting` concept + lesson-concept; edges `freezing-vs-full-finetuning-concept → catastrophic-forgetting-concept` (in-track), `momentum/adam → catastrophic-forgetting-concept` (cross-track from optimizers).

- [ ] **Step 5: Gates + visual smoke + commit:**

```bash
pnpm lint:content && pnpm test && pnpm tsc --noEmit && pnpm build
git add content/lessons/catastrophic-forgetting lib/lessons-meta.ts lib/lesson-manifest.ts lib/lessons.ts content/concepts/graph.yaml
git commit -m "Lesson 29: Catastrophic forgetting"
```

---

## Phase 4 — Lesson 30: LoRA

### Task 13: `lib/math/lora.ts` — low-rank factorization + tests

**Files:**
- Create: `lib/math/lora.ts`
- Create: `lib/math/lora.test.ts`

**Design:**
- `compose(A: number[][], B: number[][]): number[][]` — matrix multiply A (m×r) · B (r×n) → m×n.
- `paramCount(m: number, n: number, r: number): number` → `(m + n) * r`.
- `svdLowRankApprox(W: number[][], r: number): { A: number[][]; B: number[][] }` — the best rank-r approximation of W via truncated SVD. For the small (8×8) matrices in the sim, a naive SVD via power iteration or the existing `lib/math/linalg.ts` is fine.
- `frobeniusError(W: number[][], W_hat: number[][]): number` — `√(Σ (W[i][j] - W_hat[i][j])²)`.
- `fitLowRank(target: number[][], r: number, steps: number, lr: number): { A: number[][]; B: number[][]; losses: number[] }` — gradient-descent fit, used by the secondary widget.

- [ ] **Step 1: Write tests (failing first):**

```ts
import { describe, it, expect } from 'vitest';
import { compose, paramCount, svdLowRankApprox, frobeniusError, fitLowRank } from './lora';

describe('compose', () => {
  it('produces an m×n matrix from m×r and r×n', () => {
    const A = [[1, 2], [3, 4], [5, 6]]; // 3×2
    const B = [[7, 8, 9], [10, 11, 12]]; // 2×3
    const C = compose(A, B);
    expect(C.length).toBe(3);
    expect(C[0]!.length).toBe(3);
    expect(C[0]![0]).toBe(1 * 7 + 2 * 10);
  });

  it('throws on shape mismatch', () => {
    expect(() => compose([[1, 2]], [[3], [4], [5]])).toThrow();
  });
});

describe('paramCount', () => {
  it('equals (m + n) · r', () => {
    expect(paramCount(8, 8, 1)).toBe(16);
    expect(paramCount(8, 8, 4)).toBe(64);
    expect(paramCount(8, 8, 8)).toBe(128); // > 64 = full
  });
});

describe('svdLowRankApprox', () => {
  it('rank-d gives exact reconstruction (d = min(m,n))', () => {
    const W = [[1, 2], [3, 4]];
    const { A, B } = svdLowRankApprox(W, 2);
    const W_hat = compose(A, B);
    expect(frobeniusError(W, W_hat)).toBeLessThan(1e-6);
  });

  it('rank-1 approximation matches numerical optimum on a rank-1 matrix', () => {
    // W = u v^T is rank 1; rank-1 approx should reconstruct it.
    const W = [[1, 2, 3], [2, 4, 6], [3, 6, 9]]; // = [1,2,3]^T · [1,2,3]
    const { A, B } = svdLowRankApprox(W, 1);
    expect(frobeniusError(W, compose(A, B))).toBeLessThan(1e-4);
  });
});

describe('fitLowRank', () => {
  it('losses are monotonically non-increasing', () => {
    const target = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const { losses } = fitLowRank(target, 2, 200, 0.05);
    for (let i = 1; i < losses.length; i += 1) {
      expect(losses[i]!).toBeLessThanOrEqual(losses[i - 1]! + 1e-6);
    }
  });

  it('rank ≥ target rank converges to ~zero loss', () => {
    const target = [[1, 2], [3, 4]];
    const { losses } = fitLowRank(target, 2, 1000, 0.05);
    expect(losses.at(-1)!).toBeLessThan(0.01);
  });
});
```

- [ ] **Step 2: Implement.** Power-iteration SVD (one singular vector at a time, deflate, repeat r times) is sufficient for 8×8. `fitLowRank` is plain gradient descent on the squared Frobenius loss with respect to flat A and B entries.

- [ ] **Step 3: tests pass, commit.**

```bash
pnpm test lora -- --run
git add lib/math/lora.ts lib/math/lora.test.ts
git commit -m "math: lora — low-rank factorization + SVD + fit"
```

### Task 14: `components/sim/LoRAReconstruction.tsx` + `components/sim/LoRAFinetuneLoss.tsx`

**Files:**
- Create: `components/sim/LoRAReconstruction.tsx` (centerpiece)
- Create: `components/sim/LoRAFinetuneLoss.tsx` (secondary)

**Design — LoRAReconstruction:**
- Reuses the existing `Heatmap` primitive twice — once for the target ΔW (left), once for the reconstruction ΔŴ = A·B (right). Optional small heatmaps below for A and B.
- Rank slider 1..8 calls `svdLowRankApprox(target, r)`.
- Counter: "params used = (m + n) · r = {value} / total = m·n = 64".
- The target ΔW is a small interesting matrix — e.g., a smooth low-rank "checkpoint update" (rank-3 by construction, so the reader can see exact reconstruction at r=3).

**Design — LoRAFinetuneLoss:**
- Same heatmaps but the right-hand reconstruction is built via `fitLowRank()`'s gradient descent (not SVD).
- Live MSE-vs-step curve below.
- Slider for rank.

- [ ] **Step 1: Implement both. Heatmap primitive is at `components/sim/primitives/Heatmap.tsx`. Read it first to find the props shape.**

- [ ] **Step 2: tsc + commit:**

```bash
pnpm tsc --noEmit && pnpm test
git add components/sim/LoRAReconstruction.tsx components/sim/LoRAFinetuneLoss.tsx
git commit -m "sim: LoRAReconstruction + LoRAFinetuneLoss for lesson 30"
```

### Task 15: Lesson 30 content + registration

**Files:**
- Create: `content/lessons/lora/{meta.ts,interactives.tsx,lesson.mdx}`
- Modify: `lib/lessons-meta.ts`, `lib/lesson-manifest.ts`, `lib/lessons.ts`, `content/concepts/graph.yaml`

- [ ] **Step 1: `meta.ts`** — slug `lora`, title `LoRA: low-rank adaptation`, order 30.

- [ ] **Step 2: `interactives.tsx`** — both sims dynamic-imported.

- [ ] **Step 3: `lesson.mdx`** sections:
  - **Q heading**: "What if fine-tuning's weight update is *low-rank*?"
  - **Setup**: the previous lesson showed sequential fine-tuning can be destructive. The freezing lesson showed you can adapt by updating just the last layer. LoRA is a different angle: keep all layers trainable in principle, but constrain the *update* itself to lie in a low-rank subspace.
  - **Formula** (display): `W ← W + ΔW = W + AB`, with `A ∈ ℝ^{m×r}, B ∈ ℝ^{r×n}, r ≪ min(m, n)`.
  - **MathCode**: shows the LoRA forward — `y = Wx + A(Bx)` — and notes that `A·B` only ever appears multiplied against `x`, never materialized; this is the source of LoRA's compute savings.
  - **Centerpiece Callout** → `lora-reconstruction`: "Drag the rank slider. At r=1, the reconstructed ΔŴ is a single rank-1 pattern — blocky. At r=3, it matches the target almost exactly (the target was rank-3 by construction). At r=8, it's a tautology — you're using more params than the matrix has entries."
  - **Param count** (~150 words): the LoRA budget is `(m + n) · r` parameters. For an 8×8 matrix, full = 64; r=1 = 16; r=4 = 64. The crossover happens at `r = m·n / (m+n)`. For 4096×4096 attention matrices in real transformers, r=8 is 0.4% of the parameters.
  - **Secondary Callout** → `lora-finetune-loss`: "Now the same fit via gradient descent (not SVD). Same rank slider; live MSE curve. The fit doesn't always reach the SVD oracle — gradient descent on rank-constrained factors has its own optimization landscape."
  - **Recap**: three takeaways — fine-tuning's update is often *intrinsically* low-rank (the empirical fact LoRA exploits); LoRA parametrizes the update as `AB` and only trains A, B (the trick); for r ≪ m,n this is a tiny fraction of the original parameters (the win). Tease lesson 31: "What if your fine-tuning signal isn't a label, but a preference?"

- [ ] **Step 4: Registration** — slug `lora`. TRACKS slugs append. Graph: `lora`, `low-rank-update` concepts; edges `catastrophic-forgetting-concept → lora-concept` (in-track).

- [ ] **Step 5: Gates + visual smoke + commit.**

```bash
pnpm lint:content && pnpm test && pnpm tsc --noEmit && pnpm build
git add content/lessons/lora lib/lessons-meta.ts lib/lesson-manifest.ts lib/lessons.ts content/concepts/graph.yaml
git commit -m "Lesson 30: LoRA — low-rank adaptation"
```

---

## Phase 5 — Lesson 31: Instruction tuning & RLHF intuition

### Task 16: `lib/math/rlhf.ts` — DPO loss + tests

**Files:**
- Create: `lib/math/rlhf.ts`
- Create: `lib/math/rlhf.test.ts`

**Design:**
The DPO loss for a single preference triple `(prompt, preferred, dispreferred)` with current policy logits `z = [z_1, …, z_K]` over K candidate responses, reference policy logits `z_ref`, and inverse temperature `β`:

$$L = -\log\sigma\Big(\beta\big(\log\pi(y^+|x) - \log\pi(y^-|x) - \log\pi_{ref}(y^+|x) + \log\pi_{ref}(y^-|x)\big)\Big)$$

For the lesson's tiny K=4 policy, the reference policy is held constant (the initial uniform-ish distribution).

- `dpoLoss(logits, logitsRef, preferredIdx, dispreferredIdx, beta): number`
- `dpoGradient(logits, logitsRef, preferredIdx, dispreferredIdx, beta): number[]` (length K)
- `policySoftmax(logits): number[]`

- [ ] **Step 1: Write tests:**

```ts
import { describe, it, expect } from 'vitest';
import { dpoLoss, dpoGradient, policySoftmax } from './rlhf';

describe('dpoLoss', () => {
  it('is lower when the policy already prefers the preferred response', () => {
    const logitsRef = [0, 0, 0, 0];
    const lossAlready = dpoLoss([2, 0, 0, 0], logitsRef, 0, 1, 1.0);
    const lossWrong = dpoLoss([0, 2, 0, 0], logitsRef, 0, 1, 1.0);
    expect(lossAlready).toBeLessThan(lossWrong);
  });

  it('is exactly log(2) when the policy matches the reference and they are uniform', () => {
    const logits = [0, 0, 0, 0];
    const ref = [0, 0, 0, 0];
    // log-ratio difference = 0, σ(0) = 0.5, -log(0.5) = log(2).
    expect(dpoLoss(logits, ref, 0, 1, 1.0)).toBeCloseTo(Math.log(2), 6);
  });
});

describe('dpoGradient', () => {
  it('moves the preferred index up and the dispreferred index down', () => {
    const logits = [0, 0, 0, 0];
    const ref = [0, 0, 0, 0];
    const g = dpoGradient(logits, ref, 0, 1, 1.0);
    // Updating logits in -grad direction:
    expect(g[0]).toBeLessThan(0); // -g[0] > 0 → preferred ↑
    expect(g[1]).toBeGreaterThan(0); // -g[1] < 0 → dispreferred ↓
  });

  it('matches numerical gradient', () => {
    const logits = [0.3, -0.1, 0.5, 0.0];
    const ref = [0.0, 0.0, 0.0, 0.0];
    const analytical = dpoGradient(logits, ref, 0, 2, 1.0);
    const eps = 1e-5;
    for (let i = 0; i < logits.length; i += 1) {
      const lo = [...logits]; lo[i] = lo[i]! - eps;
      const hi = [...logits]; hi[i] = hi[i]! + eps;
      const numerical = (dpoLoss(hi, ref, 0, 2, 1.0) - dpoLoss(lo, ref, 0, 2, 1.0)) / (2 * eps);
      expect(analytical[i]).toBeCloseTo(numerical, 4);
    }
  });
});

describe('policySoftmax', () => {
  it('sums to 1 and is positive', () => {
    const p = policySoftmax([1, 2, 3, 4]);
    const s = p.reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 6);
    for (const v of p) expect(v).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement.** DPO loss: compute `log π(y+|x) - log π(y-|x)` from current logits (just `z[preferredIdx] - logSumExp(z) - (z[dispreferredIdx] - logSumExp(z))` = `z[+] - z[-]`), same for the reference; the bracketed quantity is the difference; pass through `β` and `σ`. Gradient: use the analytical closed form (chain rule on `-log σ(·)`). Reuse `logSumExp` from `lib/math/softmax.ts` if it exists.

- [ ] **Step 4: tests pass, commit:**

```bash
pnpm test rlhf -- --run
git add lib/math/rlhf.ts lib/math/rlhf.test.ts
git commit -m "math: rlhf — DPO loss + gradient + tests"
```

### Task 17: `components/sim/PreferencePolicyTrainer.tsx` + `components/sim/RewardModelView.tsx`

**Files:**
- Create: `components/sim/PreferencePolicyTrainer.tsx`
- Create: `components/sim/RewardModelView.tsx`

**Design — PreferencePolicyTrainer:**
- Static prompt at the top: "How should I respond to a user asking for cooking advice?"
- 4 candidate responses (hand-written short strings).
- Bar chart of current policy probabilities (4 bars; preferred response highlighted in accent).
- A small visible preference dataset (6-8 triples, hand-tuned so the bar chart shifts visibly within ~20 steps):
  ```
  Triple 1: preferred = response 2, dispreferred = response 0
  Triple 2: preferred = response 1, dispreferred = response 3
  ...
  ```
- "Step" button: cycles through the dataset, applies one DPO gradient step per triple at LR=0.3.
- "Reset" button.

**Design — RewardModelView:**
- Same 4 responses. Two side-by-side bar charts:
  - Left: policy probabilities (from `PreferencePolicyTrainer`-equivalent training).
  - Right: reward-model scores (a separate softmax that learns to assign higher scores to preferred responses across all training pairs).
- Trained from the same preference data; updates as "Step" is pressed.
- The teaching point in the caption: the policy is shaped by the *reward model's outputs*, not directly by the preference data — DPO collapses these two into one loss, but the conceptual separation is what RLHF is.

- [ ] **Step 1: Implement `PreferencePolicyTrainer`.** State: `logits: number[]` (length 4), `stepIndex: number`. Hand-tune the preference dataset so that ~5 visible bar shifts emerge in ~20 steps. The shift should be obvious (preferred bar grows by ≥ 30 percentage points from start to step 20).

- [ ] **Step 2: Implement `RewardModelView`.** Two policies trained in parallel (policy + reward model). The reward model's loss is a Bradley-Terry pairwise loss: `-log σ(r[preferred] - r[dispreferred])`. Reuse `dpoLoss` math by passing `logitsRef = [0, 0, 0, 0]` (uniform reference).

- [ ] **Step 3: tsc + commit:**

```bash
pnpm tsc --noEmit && pnpm test
git add components/sim/PreferencePolicyTrainer.tsx components/sim/RewardModelView.tsx
git commit -m "sim: PreferencePolicyTrainer + RewardModelView for lesson 31"
```

### Task 18: Lesson 31 content + registration

**Files:**
- Create: `content/lessons/instruction-tuning-rlhf/{meta.ts,interactives.tsx,lesson.mdx}`
- Modify: `lib/lessons-meta.ts`, `lib/lesson-manifest.ts`, `lib/lessons.ts`, `content/concepts/graph.yaml`

- [ ] **Step 1: `meta.ts`** — slug `instruction-tuning-rlhf`, title `Instruction tuning & RLHF intuition`, order 31.

- [ ] **Step 2: `interactives.tsx`** — dynamic imports for both sims.

- [ ] **Step 3: `lesson.mdx`** sections:
  - **Q heading**: "What if the training signal isn't a label, but a *preference*?"
  - **Setup**: every lesson so far has had a clean label (the correct class, the right next token). But real LLMs are trained on something fuzzier — humans saying "I prefer this response to that one." How do you do gradient descent on a preference?
  - **Formula** (display, the DPO loss): `L = -log σ(β [log π(y⁺|x) - log π(y⁻|x) - log π_ref(y⁺|x) + log π_ref(y⁻|x)])`. Explain each term: the policy's log-ratio over the preference pair, vs. the reference's log-ratio. Pushing this loss down increases the policy's preference for `y⁺` over `y⁻`, *relative to where the reference policy started.*
  - **MathCode**: code form of the DPO loss + gradient step on the policy's logits.
  - **Centerpiece Callout** → `preference-policy-trainer`: "Press Step. The policy starts roughly uniform. The first preference triple is `response-2 over response-0`. Watch the bars: response-2 grows, response-0 shrinks. Keep stepping. After 20 steps, the policy has internalized all 6 preferences."
  - **Reward model view** (~200 words): in actual RLHF (PPO-style), a separate reward model is trained from the preference data first, then the policy is trained against the reward model. DPO mathematically collapses these two into one loss — but the conceptual separation is useful for intuition. Show the two-pane view as a check: the policy's preferences should track the reward model's scores.
  - **Secondary Callout** → `reward-model-view`: "Two panes. Left: the policy's response probabilities. Right: the reward model's scores. As you step, both shift in the same direction — the reward model identifies the preferred responses, and the policy follows."
  - **What's out of scope**: PPO's value function, KL-regularization to the reference, on-policy sample collection. These are the real-stack additions. DPO is the cleanest entry point.
  - **Recap**: three takeaways — preference data can be turned into a gradient via the DPO loss; the loss reduces to comparing log-ratios under the current vs reference policy; this is the foundation of modern instruction-tuned LLMs. **Capstone close**: "You started this lab at the dot product. You finish it with a policy trained on preferences. Every step in between — softmax, attention, gradient descent, fine-tuning — is in this last interactive."

- [ ] **Step 4: Registration** — slug `instruction-tuning-rlhf`. TRACKS final list: `['pretraining-vs-finetuning', 'freezing-vs-full-finetuning', 'catastrophic-forgetting', 'lora', 'instruction-tuning-rlhf']`. Graph: `dpo-loss`, `reward-model`, `preference-data` concepts; edges `lora-concept → instruction-tuning-rlhf-concept` (in-track), `softmax → dpo-loss`, `cross-entropy → dpo-loss`.

- [ ] **Step 5: Gates + visual smoke + commit.**

```bash
pnpm lint:content && pnpm test && pnpm tsc --noEmit && pnpm build
git add content/lessons/instruction-tuning-rlhf lib/lessons-meta.ts lib/lesson-manifest.ts lib/lessons.ts content/concepts/graph.yaml
git commit -m "Lesson 31: Instruction tuning & RLHF intuition (capstone)"
```

---

## Phase 6 — Finalize

### Task 19: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update "What's live"** — change the lesson count from 26 to 31, add the new track and 5 lessons:

```
**Adapting models to new tasks**
27. Pretraining vs fine-tuning
28. Freezing vs full fine-tuning
29. Catastrophic forgetting
30. LoRA: low-rank adaptation
31. Instruction tuning & RLHF intuition
```

- [ ] **Step 2: Update the second paragraph of "Stack"** — bundle numbers if they've moved. Re-quote whichever numbers `pnpm build` reports.

- [ ] **Step 3: Update the third paragraph (header description)** — "Thirty-one articles ... eight tracks ..." replacing "Twenty-six" and "seven."

- [ ] **Step 4: Commit.**

```bash
git add README.md
git commit -m "README: 31 lessons, 8 tracks (fine-tuning module added)"
```

### Task 20: Delete the obsolete phase note + final gates

**Files:**
- Delete: `PHASE_NOTES_BUNDLE.md` (its header says "delete after reading"; it's been read and its guidance is now baked into the per-lesson `interactives.tsx` pattern)

- [ ] **Step 1: Delete the phase note:**

```bash
git rm PHASE_NOTES_BUNDLE.md
```

- [ ] **Step 2: Run the full quality gate matrix:**

```bash
pnpm lint:content
pnpm test
pnpm tsc --noEmit
pnpm build
```

Expected:
- `lint:content`: 31 lessons, 0 dangling edges, 0 cycles.
- `pnpm test`: all green (~329 tests).
- `pnpm tsc --noEmit`: clean.
- `pnpm build`: succeeds; lesson route under 150 kB. If over 150 kB, see Risk #3 in the spec — shed the heaviest secondary widget.

- [ ] **Step 3: Visual end-to-end smoke:**

```bash
pnpm dev
```

Visit each lesson in `/` → click into each new lesson → use each interactive → use prev/next to navigate the new module. Verify `/map` renders track 8 as a new column with all five lessons connected.

- [ ] **Step 4: Final commit:**

```bash
git add -A
git commit -m "Drop PHASE_NOTES_BUNDLE: bundle pattern is now uniform across all lessons"
```

---

## Plan-Spec coverage map (self-review)

| Spec section | Plan coverage |
|---|---|
| Track placement (track 8) | Task 1 (placeholder), Tasks 6/9/12/15/18 (populate slugs) |
| Lesson chain prereq edges | Tasks 6/9/12/15/18 graph.yaml edits |
| Lesson 27 design (Pretrain vs fine-tune) | Tasks 2-6 |
| Lesson 28 design (Freezing) | Tasks 7-9 |
| Lesson 29 design (Catastrophic forgetting) | Tasks 10-12 |
| Lesson 30 design (LoRA) | Tasks 13-15 |
| Lesson 31 design (RLHF) | Tasks 16-18 |
| Math modules | Tasks 2, 7, 10, 13, 16 |
| Shared primitive (`useToyMLPTraining`) | **Dropped** — see plan preface; existing math layer already factors training cleanly |
| File plumbing (registrations) | Tasks 6, 9, 12, 15, 18 |
| Quality gates | Each registration task runs them; Task 20 final |
| Bundle budget | Task 20 verifies; Risk mitigation noted |
| README update | Task 19 |
| Risks: animation cadence | Lesson 29 sim implementation (Task 11) — note inline in component if cadence stutters |
| Risks: capstone tactility | Lesson 31 sim implementation (Task 17) — preference dataset hand-tuning is explicit |
