# AI Learning Lab
# AI Learning Lab

> **Learn AI by manipulating it.** Every concept is something you can
> move, change, and watch respond. Drag a slider, edit a number, read a
result.

Forty-one articles with embedded interactive figures, organized as eight
tracks that build up from the dot product to backpropagation to a
trained, regularized, fine-tuned model — and on through inference
efficiency, scaling laws, and evaluation. No videos, no quizzes (yet), no
backend. The companion `design-spec.md` and `technical-spec.md`
describe the longer arc — notebooks, the sync engine, the AI tutor —
that this build is the foundation for.
## What's live

Forty-one lessons across eight tracks, in reading order:

**Foundations of similarity**
1. Dot product as alignment
2. Vector projection and cosine similarity

**How models pick what matters**
3. Softmax: turning scores into a distribution
4. Attention scores: who attends to whom
5. Attention output: the weighted sum of values
6. Why we scale attention by √d_k
7. Causal masking: don't peek at the future

**How tokens become inputs**
8. Tokenization: from strings to ids
9. Token embeddings: from ids to vectors
10. Positional encoding: giving order to a bag
11. RoPE: rotation, not addition

**Building the transformer block**
12. Multi-head attention: parallel views
13. Grouped-query attention: shrinking the cache
14. Flash attention: same math, different memory pattern
15. Residual connections + layer normalization
16. Feed-forward network: per-token rewriting
17. Mixture of experts: more parameters at the same compute
18. The transformer block: putting it all together

**What the model says, and how it learns**
19. Sampling and decoding: from logits to a token
20. KV cache: making inference fast
21. Speculative decoding: a small model drafts, the big one verifies
22. Cross-entropy: how the model knows it was wrong
23. Gradient descent: walking the loss downhill

**How models learn**
24. Backpropagation: chain rule for the whole network
25. Stochastic gradient descent: training with batches
26. Optimizers: SGD, momentum, Adam
27. Learning-rate schedules: how aggressively to step, over time
28. Training a tiny model, end to end
29. Scaling laws: how big should the model be?

**How models don't memorize**
30. Overfitting: when the model memorizes the data
31. L2 weight decay: penalizing big weights
32. Dropout: training an ensemble for free
33. Batch normalization: stabilizing activations during training
34. Early stopping + data augmentation: cheap regularization that just works

**Adapting models to new tasks**
35. Pretraining vs fine-tuning
36. Freezing vs full fine-tuning
37. Catastrophic forgetting
38. Quantization: storing 4 bits per weight
39. LoRA: low-rank adaptation
40. Evaluation: how the field measures models
41. Instruction tuning & RLHF intuition

A `/map` page renders the eight tracks as columns on a single canvas.
Lessons within a track are linked by short vertical arrows;
cross-track prerequisites are drawn as dashed accent arcs. The lesson
you most recently visited is highlighted as the resume point — visit
tracking is `localStorage`-only, no backend.

Light and dark themes, with a toggle in the top-right of every page
(persisted to `localStorage`, no flash on initial paint). The accent
color is reserved for things you can manipulate — sliders, dominant
bars, the resume lesson on the map. Static content never uses it.

## Stack

- Next.js 15, App Router, TypeScript strict, pnpm
- Tailwind CSS, themed via CSS custom properties (channel pattern:
  tokens are bare R G B triplets consumed via `rgb(var(--x) /
  <alpha-value>)`, so the same Tailwind classes work in both themes)
- MDX via `@next/mdx`; math via `remark-math` + `rehype-katex`
- React + SVG (no D3, no Canvas, no charting library)
- `useState` / `useReducer` only — no state library
- `zod` validates lesson metadata at build time

Forty-one lessons, 492 tests, ~118 kB first-load JS on the home page,
~141 kB on a lesson route (37 kB page + 104 kB shared; the heavy
centerpieces — BlockPipeline, TrainingEndToEnd, OptimizerRace,
OverfittingExplorer, BatchNormExplorer, EarlyStoppingAugmentationExplorer,
SequentialTaskTrainer —
are in lazy chunks, so the largest individual lesson chunk stays
under the brief's 25 kB target). No backend yet.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Production:

```bash
pnpm build
pnpm start
```

Tests, content lint, and the full quality gates:

```bash
pnpm test                    # vitest, math suites
pnpm lint:content            # zod-validated cross-reference check
pnpm build                   # strict TS, full static export
```

Requires Node 18+ and pnpm 9+.

## How to add the next lesson

This is the pattern used for all forty-one live lessons — no
speculation.

1. **Create the folder** `content/lessons/<slug>/` with three files:
   - `meta.ts` — exports a const with `slug`, `title`, `summary`,
     `minutes`, `order`. The `order` field is informational; the
     reading-order source of truth is the `TRACKS` array in
     `lib/lessons-meta.ts`.
   - `interactives.tsx` — exports `readonly InteractiveEntry[]`. Each
     entry has `id`, `title`, `description`, `Component`. The
     `Component` renders the figure (typically a wrapper around a
     primitive under `components/sim/primitives/`).
   - `lesson.mdx` — the article. Import `MathCode` and `Callout` from
     `@/components/lesson/*` at the top, then write the lesson:
     question heading → formula → centerpiece interactive → reading
     the result → secondary widget → recap. Use
     `<Callout targetInteractive="…">` to focus a figure from prose;
     use `<MathCode math="…" code={…} caption="…" />` for the
     side-by-side math+code block.

2. **Register the lesson** in three places:
   - `lib/lessons-meta.ts` — add an `import { meta as … } from
     '@/content/lessons/<slug>/meta'`, an entry in the `manifest`
     array, and slot the slug into the appropriate `TRACKS` track
     (which becomes its column on `/map` and its group on the home
     page).
   - `lib/lesson-manifest.ts` — add an import of the `interactives`
     and an entry in the manifest.
   - `lib/lessons.ts` — add a dynamic MDX loader for the slug so the
     lesson route can code-split it.

3. **If the lesson needs a new interactive primitive**
   (a custom slider, heatmap variant, etc.), add it under
   `components/sim/primitives/`. The existing primitives
   (`VectorCanvas`, `Heatmap`, `BarChart`, `Slider`, `NumberInput`)
   are themed via the same token system; any new primitive must use
   the tokens, not hardcoded colors. See the Design system section below for
   the rationale.

4. **If the lesson needs new math**, put it in
   `lib/math/<name>.ts` with `lib/math/<name>.test.ts` next to it.
   Cover the boundary cases (zero vectors, dimension mismatches, NaN
   propagation) — these tests are the lesson's defense against silent
   numerical breakage.

5. **Add the concept** to `content/concepts/graph.yaml`: a node, the
   incoming edges from its prerequisite concepts, and a
   `lesson-concept` node tagged with the lesson slug. The map
   inference walks these edges to figure out which lessons feed
   which.

6. **Run the gates**: `pnpm lint:content && pnpm test && pnpm build`.
   `lint:content` rejects cycles and dangling edges.

## Project structure

```
TensorDojo/
├── app/
│   ├── layout.tsx                 # root layout, inline no-flash theme script
│   ├── page.tsx                   # landing: 8 track groups
│   ├── globals.css                # design tokens (light default, .dark override)
│   ├── not-found.tsx              # 404
│   ├── lessons/[slug]/page.tsx    # dynamic SSG route, MDX code-split per slug
│   └── map/page.tsx               # concept map
├── components/
│   ├── lesson/                    # LessonShell, Workbench, WorkbenchItem,
│   │                              # Callout, MathCode, PrevNext, VisitTracker, InteractiveSkeleton
│   ├── sim/                       # Interactive figures (one per lesson)
│   │   ├── primitives/            # VectorCanvas, Heatmap, BarChart,
│   │   │                          # Slider, NumberInput, SimFrame, LossLandscape
│   │   └── …                      # 72 lesson-specific composers
│   ├── concept-graph/             # ConceptGraphView (SVG 2D map)
│   ├── home/                      # LessonCardList for the landing
│   └── theme/                     # ThemeToggle
├── content/
│   ├── lessons/<slug>/
│   │   ├── meta.ts
│   │   ├── interactives.tsx
│   │   └── lesson.mdx
│   └── concepts/graph.yaml
├── lib/
│   ├── math/                      # 40 modules: softmax, linalg, attention,
│   │                              # multihead, gqa, flashattn, layernorm, ffn,
│   │                              # gelu, mask, positional, rope, sampling,
│   │                              # cross-entropy, gradient-descent, kvcache,
│   │                              # specdecode, moe, scalinglaws, transformer-block
│   ├── content/                   # YAML loaders + zod schemas + map-data
│   ├── progress/                  # visits.ts (localStorage tracking)
│   ├── theme/                     # use-theme hook
│   ├── lessons-meta.ts            # client-safe manifest + TRACKS
│   ├── lessons.ts                 # server-side registry + MDX loaders
│   └── lesson-manifest.ts         # interactives manifest
├── scripts/
│   ├── lint-content.ts            # zod-validated cross-reference check
│   ├── _verify.mjs                # headless render-error sweep (puppeteer)
│   └── …                          # screenshot + baseline capture helpers
├── docs/screenshots/              # before/after captures, by phase
└── package.json
```

## Design system

Themed via CSS custom properties on `:root` (light, default) and
`:root.dark` (override). Tailwind reads them via the channel pattern:
each token is stored as a bare `R G B` triplet, then composed in the
config as `rgb(var(--token) / <alpha-value>)`. Existing classes
(`bg-bg`, `text-ink`, `border-border`, `bg-bg/40`) work in both
themes without per-component overrides.

**Tokens** (excerpt — full set defined in `app/globals.css`):

| Token | Role |
|-------|------|
| `--bg`, `--bg-elevated` | page + card surfaces |
| `--ink`, `--muted`, `--dim` | three levels of text |
| `--border`, `--border-strong` | dividers |
| `--accent`, `--accent-soft`, `--accent-fg` | the manipulable signal |

**One accent, one rule.** The accent is reserved for the things the
reader can move (sliders, knobs, dominant bars) and the things the
reader is navigating to (resume node on the map, hover/focus states).
Static chrome — headings, body text, borders, code fences — never
uses it.

**Typography**: Inter (UI prose) + JetBrains Mono (numbers, labels,
code) via `next/font`.

**Math**: KaTeX via `remark-math` + `rehype-katex`. Display mode for
the headline equation of a section, inline for everything else.

**Numbers**: `tabular-nums` everywhere a value is read; min-width on
slider value columns so digit changes don't reflow the row.

## Navigation model

- **Home** (`/`) — eight track groups, each lesson a card. Two
  forward links to `/map`.
- **Lesson** (`/lessons/<slug>`) — two-column layout: prose on the
  left, an interactive workbench on the right with the lesson's
  figures. Back-link to `/` at the top. Prev/next at the bottom,
  with the destination's track label called out when crossing into
  a new track. Keyboard ←/→ navigate prev/next when no input is
  focused. After 10 s on the page, the lesson is marked visited in
  `localStorage`.
- **Map** (`/map`) — eight tracks as columns of a single SVG canvas.
  In-track arrows are short verticals; cross-track prerequisites
  are dashed accent arcs. The most recently visited lesson is
  highlighted with an accent ring and a "Resume" pill.
- **404** — leads with `← Home`, lists the map as secondary.

The full vision — notebooks, the sync engine, the AI tutor, accounts,
quizzes with misconception diagnosis, hosted code execution — is in
`design-spec.md` and `technical-spec.md`. They are *where this is
going*, not *what this build is*.
