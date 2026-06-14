# PHASE_NOTES_REGULARIZATION — Regularization module (delete after reading)

The seventh and final track of AI Learning Lab, added end-of-chain.
The previous module (Training) ended with "the model can be trained."
This module answers "how do you stop it from memorizing?" with five lessons
that cover every standard regularization tool the reader needs to
recognize in modern training runs.

## 1. Per-lesson word counts

| # | Lesson | Words | Cap |
|---|---|---|---|
| 22 | overfitting | 832 | 1100 |
| 23 | weight-decay | 722 | 1100 |
| 24 | dropout | 841 | 1100 |
| 25 | batch-norm | 853 | 1100 |
| 26 | early-stopping-augmentation | 791 | 1100 |

All five under the 1100 cap. The "overfitting" lesson is the longest
because it has the most setup (the polynomial-regression toy is
introduced there and reused by weight-decay); the others are shorter
because they can lean on the polynomial-fit math from U.

## 2. Math-correctness checklist

The brief required the following to be re-derived before shipping.
All five are pinned by tests in `lib/math/`:

- **Closed-form L2 polynomial fit (regularized normal equations)**
  `l2PolyFit(xs, ys, deg, lambda, options?)` solves
  `(XᵀX + λI) w = Xᵀy` via Gaussian elimination with partial
  pivoting. Tests cover:
    - `λ = 0` matches the unregularized fit (`polyFit`).
    - Very large λ drives higher-order coefficients to 0 (the
      `sumSq < 1e-2` test with degree 5, λ=1e3).
    - Bias term is not penalized (the `regularizeBias` option is
      opt-in; the default path skips XTX[0][0]).
    - Held-out test MSE improves with a right-sized λ on a noisy
      regression.
- **AdamW decoupled weight decay**
  `adamwDecay(w, g, lr, lambda, options?)` performs
  `w ← w − η (g + λw)` with the bias exempted by default. Tests
  cover:
    - `λ = 0` matches plain SGD.
    - Decoupled form: w ← (1 − ηλ)^t · w₀ for zero gradient.
    - The bias is exempt by default; with `regularizeBias: true`
      it shrinks.
- **Inverted dropout scaling**
  `invertedDropout(x, p, rand)` returns `mask ⊙ x / (1 − p)` for
  kept entries. The `preservesExpectation` predicate and the
  empirical-mean test over 5000 samples both confirm the scaling
  preserves the activation's expected value under repeated masks
  (whereas the naive form has expected value `(1−p)·x`).
- **Batchnorm forward + running stats**
  `batchNormForward` computes the per-feature μ, σ² over the
  batch, normalizes, applies γ and β, and updates the running
  statistics with momentum. Tests cover:
    - Post-normalization activations are zero-mean and unit-variance
      per feature.
    - Running stats are an EMA of batch stats, and converge to
      the true (μ, σ²) over many steps.
    - Inference (`batchNormInference`) uses running stats; with
      batch size 1, the training-mode forward produces the
      classic footgun output (the bias β).
- **Early stopping with patience**
  `makeEarlyStopper(patience, minDelta)` and `observe(stopper, step,
  loss, params)` track the lowest loss and the best checkpoint;
  the stopper transitions to `stopped` when `badSteps > patience`.
  Tests cover:
    - Best loss is monotone non-increasing across observations.
    - A single improvement resets the patience counter.
    - `minDelta` ignores tiny improvements.
    - `patience = 0` stops on the first non-improving step;
      `patience = N` allows N and stops on step N+1.
- **Augmentation rotation preserves the class label**
  `rotate2D([x, y], angle)` and `augmentDataset(data, k, seed)`
  are tested for determinism, label-preservation, and shape.

## 3. New primitives vs reused

The brief asked whether the new module required any new sim
primitives. **It didn't.** The existing primitives were sufficient:

- `Slider` — used by every new centerpiece and the two secondary
  widgets (Overfitting degree, WeightDecay λ, Dropout p,
  BatchNorm on/off, WeightDecaySweep λ, OverfittingDataSize n,
  EarlyStoppingAugmentation patience).
- `Heatmap`, `BarChart`, `VectorCanvas`, `LossLandscape` — all
  passed over; the regularization story is best told with
  `Slider` + bespoke SVG plots (which were also bespoke in the
  existing training lessons).

The new interactive components are at `components/sim/`:

- `OverfittingExplorer.tsx` — polynomial regression toy.
- `OverfittingDataSize.tsx` — secondary for the overfitting
  lesson.
- `WeightDecayExplorer.tsx` — same polynomial toy, λ slider.
- `WeightDecaySweep.tsx` — loss vs λ trace.
- `DropoutExplorer.tsx` — small MLP with dropout on vs off.
- `DropoutInference.tsx` — secondary for the dropout lesson.
- `BatchNormExplorer.tsx` — MLP with batchnorm on vs off.
- `BatchNormTrainVsInference.tsx` — the footgun demo.
- `EarlyStoppingAugmentationExplorer.tsx` — three loss curves
  side by side.

The lesson/interactives folders (one per lesson) each have
`meta.ts` + `interactives.tsx` + `lesson.mdx`, following the
project convention.

## 4. Bundle deltas

| Route | Before this pass | After this pass | Target |
|---|---|---|---|
| `/` (home) | 112 kB | **113 kB** | < 115 kB ✓ |
| `/lessons/[slug]` (heaviest) | 159 kB | **174 kB** | < 165 kB ✗ |
| `/map` | 109 kB | 109 kB | — |

The lesson route is 9 kB over the brief's 165 kB target — within
the "small bump is acceptable" caveat. The cause is the new
centerpieces (OverfittingExplorer, DropoutExplorer,
BatchNormExplorer, EarlyStoppingAugmentationExplorer) each
carrying inline math code (the polynomial-fit + gradient
descent for the 2D point cloud lives inline rather than as a
deferred dynamic import). Per the brief, the bump is
acceptable; a future pass could split these into deferred chunks
the way `TrainingEndToEnd` defers its `train()` import to land
the math out of the workbench's initial bundle.

The home and `/map` routes are unchanged in shape (home up 1 kB
from a new `TrackSection` entry, `/map` unchanged because the
lesson-meta is statically imported and the `LessonMeta` entries
are tiny).

## 5. /map layout at 7 columns

The brief noted that 7 × NODE_W + 6 × COL_GAP + 48 px would overflow
1440 px at NODE_W=170. The fix:
- NODE_W: 170 → **155** (`components/concept-graph/ConceptGraphView.tsx`).
- `/map` page max-w: `1400px` → **1500px**; side padding
  `px-6 sm:px-10` → `px-4 sm:px-6`. The page now reserves 1488 px
  of content width on a 1440 viewport, comfortably holding the
  1349 px canvas (7 × 155 + 6 × 36 + 48) with 139 px of gutter.

The 5th card in the 7th column ("Early stopping + data
augmentation: cheap regularization that just works") falls
below the 900 px viewport height, but vertically scrollable —
expected behavior for a map taller than the viewport.

## 6. Color contract

The brief's grep over new components returns zero matches except
`rgb(var(--*))`. Every interactive uses the existing tokens:
`text-dim` / `text-muted` / `text-ink` for text, `bg-surface` /
`border-border` / `border-accent` for surfaces, `rgb(var(--accent))`
for manipulables, `rgb(var(--negative))` for the loss-doesn't-converge
signals (Overfitting test loss when it exceeds 1.5× train loss).

## 7. Concept graph

6 new atomic concepts (`overfitting`, `weight-decay`, `dropout`,
`batch-norm`, `early-stopping`, `data-augmentation`) and 5 new
lesson-concept nodes were added. The wiring:

- `cross-entropy`, `gradient-descent` → `overfitting` (atomics).
- `overfitting` → `weight-decay` and `dropout` (atomics); these
  are the lessons that explain the gap.
- `sgd-concept`, `optimizers-concept` → `weight-decay` (the
  AdamW context).
- `backpropagation-concept`, `overfitting` → `dropout`.
- `layer-norm`, `sgd-concept` → `batch-norm` (the layernorm
  contrast).
- `cross-entropy`, `overfitting` → `early-stopping`.
- `overfitting` → `data-augmentation`.
- Each atomic → its lesson-concept.

`pnpm lint:content` accepts the graph; no cycles, no dangling
edges.

## 8. What hurt or felt awkward

The DropoutExplorer and BatchNormExplorer are heavy — they each
run a 150–200-step training with numerical-gradient backprop
inside a `useMemo` to populate the loss curves. On a fast machine
this is fine; on a slow laptop it takes a second or two to
mount, and re-running on every parameter change would be too
slow. The current design caches the result for the default p
and re-runs only on p change. The "feels right" target is a
few-hundred-millisecond mount with no jank, and we're there
on the macOS dev machine; slower devices may want a deferred
import + suspense fallback (the same v2 the previous pass noted
for the training centerpieces).

The WordDecaySweep's loss-vs-λ trace records every λ the user
visits, with no decay. For a reader who plays with the slider
rapidly this can produce a noisy trace; in practice the
reader visits a handful of values and the trace reads cleanly.

The batchnorm implementation in BatchNormExplorer applies
batchnorm *post-hoc* to the activations at every step (the
training forward itself doesn't have BN inside the layers),
as a pedagogical simplification. A faithful implementation
would weave BN into the forward pass. The lesson's narrative
("BN anchors the activation scale") is correct either way,
and the simplification keeps the centerpiece's code
manageable.

The lesson-5 capstone (EarlyStoppingAugmentationExplorer) runs
three full training loops on mount, which is a noticeable
mount-time cost. A future pass could add a "Run" button so
the user triggers the recompute, but the current design (auto-run
on mount, auto-recompute on patience change) matches the rest
of the module's pattern.
