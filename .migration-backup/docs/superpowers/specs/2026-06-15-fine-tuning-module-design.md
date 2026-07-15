# Fine-tuning & Transfer module — design

**Date:** 2026-06-15
**Module:** Track 8 — Adapting models to new tasks
**Lessons added:** 5 (numbers 27–31, bringing the lab to 31 lessons across 8 tracks)

## Goal

Add a 5-lesson module that teaches modern fine-tuning end-to-end: why pretraining
helps, what to update vs. freeze, when fine-tuning erases prior competence, how
LoRA recovers most of a full fine-tune at a fraction of the parameters, and how
preference-based fine-tuning (DPO-style) works. The module composes the trained
tiny model from lesson 21 with the existing softmax / cross-entropy / gradient
descent primitives — no new infrastructure beyond what's listed below.

## Track placement

**Track 8 — Adapting models to new tasks.** Sits to the right of track 7
(Regularization) on the `/map` canvas. Reads as a parallel concern to track 7,
not a follow-on: regularization is about generalizing *during* training;
fine-tuning is about adapting an already-trained model.

Prereq edges flow from:
- Track 6 (How models learn) — gradient descent, backprop, optimizers
- Lesson 21 (Training a tiny model, end to end)
- Lesson 3 (Softmax) and lesson 15 (Cross-entropy) into the capstone

Lesson 26 (Early stopping + augmentation) is *not* a prereq.

## Lesson chain

Linear within the track. Each lesson's in-track prereq is its predecessor; the
diagram below shows the new edges only (the 17→21 backprop edge already exists).

```
21 (training end-to-end) ──→ 27 ──→ 28 ──→ 29 ──→ 30 ──→ 31
19 (optimizers) ─────────────────────────→ 29
15 (cross-entropy) ───────────────────────────────────→ 31
 3 (softmax) ─────────────────────────────────────────→ 31
```

Lesson 29 (catastrophic forgetting) flows into LoRA: full fine-tuning erases
more than parameter-efficient fine-tuning does, motivating low-rank updates.

| # | Slug | Title | Phenomenon |
|---|---|---|---|
| 27 | `pretraining-vs-finetuning` | Pretraining vs fine-tuning | A model starting from a related checkpoint reaches lower loss with less data |
| 28 | `freezing-vs-full-finetuning` | Freezing vs full fine-tuning | Updating only the last layer can adapt; early layers carry transferable features |
| 29 | `catastrophic-forgetting` | Catastrophic forgetting | Fine-tuning on task B erases competence on task A under high LR + sequential exposure |
| 30 | `lora` | LoRA: low-rank adaptation | A rank-`r` update recovers most of a full fine-tune at a fraction of the parameters |
| 31 | `instruction-tuning-rlhf` | Instruction tuning & RLHF intuition | When the signal is preference, gradient descent still works — on a preference loss |

Lesson 31 is the capstone: composes softmax (lesson 3), cross-entropy
(lesson 15), and gradient descent (lesson 16) into a working preference-trained
tiny policy. The 4-response softmax is small enough that LoRA isn't applied
inside the sim itself; lesson 30 is a reading-order predecessor, not a
compositional dependency.

## Per-lesson interactive design

Every interactive is lazy-loaded via `next/dynamic` (the pattern established in
PHASE_NOTES_BUNDLE.md and now uniform across all 26 existing lessons).

### Lesson 27 — Pretraining vs fine-tuning
- **Centerpiece** `PretrainVsScratch` — two tiny MLPs train side-by-side on the
  same small classification task. One starts from random init; the other starts
  from a "pretrained" checkpoint baked as a static weight array. Live loss
  curves + accuracy bars. Pretrained converges faster and ends lower.
- **Secondary** `DataSizeSlider` — slider for fine-tuning dataset size
  (8 → 256 samples). Gap widens at small N, shrinks at large N — encodes the
  "pretraining matters most when data is scarce" intuition.
- **Reader manipulates:** dataset size, reset/re-run.

### Lesson 28 — Freezing vs full fine-tuning
- **Centerpiece** `LayerFreezeExplorer` — 3-layer MLP with a freeze toggle per
  layer (six configurations). Training loss curve + per-layer gradient norm
  bars (frozen layers stay at 0). Final accuracy reported.
- **Secondary** `ParamsVsAccuracyTable` — bar chart of parameters-updated vs.
  final-accuracy for each freeze config. Shows the diminishing-returns elbow:
  freezing layer 1 barely costs accuracy and saves ~60% of updates.
- **Reader manipulates:** three freeze toggles.

### Lesson 29 — Catastrophic forgetting
- **Centerpiece** `SequentialTaskTrainer` — a tiny classifier trains on task A
  (toy classes 0–4) until converged, then switches to task B (classes 5–9). Two
  accuracy lines plot over training steps; A drops as B rises. The crossover
  is the lesson.
- **Secondary** `MitigationToggles` — two switches: lower LR during phase B,
  and interleave A+B samples instead of sequential. Shows the problem is
  sequential exposure at high LR, not fine-tuning itself.
- **Reader manipulates:** phase-B LR slider, interleave toggle.

### Lesson 30 — LoRA
- **Centerpiece** `LoRAReconstruction` — 8×8 target weight delta ΔW as a
  heatmap. Two low-rank factors A (8×r) and B (r×8) compose to ΔŴ = A·B, also
  as a heatmap. Rank slider r ∈ [1, 8]. ΔŴ approaches ΔW as r grows; live
  parameter count (2·8·r vs 64).
- **Secondary** `LoRAFinetuneLoss` — fits A, B to minimize ‖ΔŴ − ΔW‖² via
  gradient descent. Live MSE curve. Slider for rank; counter for
  "parameters used / total."
- **Reader manipulates:** rank slider.

### Lesson 31 — Instruction tuning & RLHF intuition
- **Centerpiece** `PreferencePolicyTrainer` — tiny policy = softmax over 4
  candidate responses for a single prompt. Preference dataset of 6–8 triples
  (prompt, preferred, dispreferred). Reader clicks "step"; policy updates via
  DPO-style log-ratio loss. Probability bars for the four responses shift live;
  preferred bar grows.
- **Secondary** `RewardModelView` — separate softmax learns to score responses
  given prompts, trained from the same preferences. Reward-model scores shown
  beside the policy's. Surfaces: "the policy is shaped by the reward model,
  not the preference data directly."
- **Reader manipulates:** step button, reset, optional LR slider.

**Why DPO over PPO.** DPO's loss is a single log-ratio over the
preferred/dispreferred pair — one `MathCode` block can hold the whole equation.
PPO needs a value function, advantage estimation, and a clipping step, none of
which the lab has taught. The MDX is explicit that this is the simplest
preference loss; real RLHF stacks are more elaborate.

## New math modules

All under `lib/math/`, each with a `.test.ts` next to it.

| Module | Purpose | Key tests |
|---|---|---|
| `pretrain-init.ts` | Deterministic "pretrained" weight vector baked as a static array (not computed at load) | Determinism; pretrained weights yield non-random outputs on the toy task |
| `freeze-mask.ts` | Per-layer boolean mask applied to gradient updates | Frozen layer's gradient → 0; non-frozen layer matches unmasked version |
| `forgetting.ts` | Sequential trainer + dual-task accuracy evaluator | Sequential + high LR collapses task-A accuracy; interleaved + low LR keeps both high |
| `lora.ts` | Low-rank factorization (A·B), param-count helper, SVD oracle for best rank-r approximation | Rank-d gives exact reconstruction; param count = (m+n)·r; oracle matches numerical optimum |
| `rlhf.ts` | DPO-style log-ratio preference loss + gradient w.r.t. policy logits | Gradient direction increases P(preferred); closed-form matches numerical for 2-option case |

Expected new tests: ~35 across the five modules. Project will go from 294 to
~329 passing tests.

## Shared primitive (opportunistic cleanup)

`components/sim/primitives/useToyMLPTraining.ts` — hook extracted from
training-loop logic already duplicated across `TrainingEndToEnd`,
`TrainingPresetComparison`, and the overfit sims. Returns
`{ step, reset, loss, accuracy, weights, gradients }`. Used by lessons 27, 28,
29. Without this, the new lessons would add a fourth copy of the same loop.

Treating this as in-scope cleanup, not scope creep. Existing sims will be
migrated to the hook in the same PR.

## File plumbing

**New files (36 total):**
- Per lesson (5 × 5 = 25):
  - `content/lessons/<slug>/meta.ts`
  - `content/lessons/<slug>/interactives.tsx`
  - `content/lessons/<slug>/lesson.mdx`
  - `components/sim/<CenterpieceComponent>.tsx`
  - `components/sim/<SecondaryComponent>.tsx`
- Math modules (5 × 2 = 10): one `lib/math/<name>.ts` + `<name>.test.ts` per lesson, per the "New math modules" table above
- Shared primitive (1): `components/sim/primitives/useToyMLPTraining.ts`

**Modified:**
- `lib/lessons-meta.ts` — 5 meta imports, 5 manifest entries, new TRACKS entry for track 8
- `lib/lesson-manifest.ts` — 5 interactives imports + entries
- `lib/lessons.ts` — 5 dynamic MDX loaders (each lesson code-splits its own MDX)
- `content/concepts/graph.yaml` — 5 concept nodes, 5 lesson-concept nodes, prereq edges per §"Lesson chain"
- `README.md` — add the 5 lessons + track 8 to "What's live"
- Existing sims (`TrainingEndToEnd`, `TrainingPresetComparison`, overfit sims) — migrate to `useToyMLPTraining` hook

## Quality gates (same as every prior module)

- `pnpm lint:content` → 31 lessons; no dangling edges; no cycles
- `pnpm test` → all green (~329 tests after additions)
- `pnpm tsc --noEmit` → clean
- `pnpm build` → lesson route stays under 150 kB

## Bundle budget

Per `PHASE_NOTES_BUNDLE.md`, the lesson route currently sits at 126 kB with
~24 kB headroom under the 150 kB target. Each new sim is small (matrix ops +
softmax + 2-layer MLP loops; no `BlockPipeline`-class centerpieces):

| Lesson | Estimated sim cost |
|---|---|
| 27 | ~3 kB |
| 28 | ~3 kB |
| 29 | ~3–4 kB |
| 30 | ~3 kB |
| 31 | ~3 kB |
| **Total** | **~15–16 kB** |

Fits inside the headroom with margin. Since every sim is lazy-loaded, the route
chunk itself shouldn't grow — the costs land in per-lesson chunks.

## Risks

1. **Animation cadence (lesson 29).** Sequential training must feel live —
   A's accuracy visibly decaying. Mitigation: 2-layer × 8-unit MLP, SGD steps
   paced by `requestAnimationFrame`, batch steps per frame if it stutters on
   mid-range hardware.
2. **Capstone tactility (lesson 31).** Preference learning is hard to make
   tactile. Mitigation: hand-design the 6–8 preference triples so the policy's
   bar chart shifts visibly within ~20 steps. If it doesn't, the lesson
   reduces to "the loss curve goes down" — a weaker lesson. Hand-tuning the
   dataset is a non-negotiable part of authoring this lesson.
3. **Bundle overshoot.** If implementation pushes the route past 150 kB, shed
   the secondary widget on the largest lesson (likely 28 or 29) before
   touching the centerpiece.

## Out of scope

- PPO, full RLHF stack (value functions, advantage estimation, clipping)
- Adapter layers, prefix tuning, prompt tuning (these were the alternate
  "Chain B" — not chosen)
- Multi-task / continual learning beyond the catastrophic-forgetting
  demonstration in lesson 29
- Tokenizer-level changes for instruction fine-tuning (the policy in lesson 31
  is over 4 abstract responses, not tokens)
