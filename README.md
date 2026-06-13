# AI Learning Lab

> **Learn AI by manipulating it.** Every concept is something you can
> move, change, and watch respond. Drag a slider, edit a number, read a
> result.

This is MVP-1: five articles with embedded interactive figures that
make the math feel obvious. No backend, no auth, no quizzes, no
notebooks — those come in later phases. The rest of the README and the
linked `design-spec.md` / `technical-spec.md` describe the *destination*,
not the work order.

## What's in MVP-1

Five lessons, in reading order:

| # | Lesson | What you manipulate |
|---|--------|---------------------|
| 1 | Dot product as alignment | Two 2D vectors; signed bar |
| 2 | Vector projection and cosine similarity | Two 2D vectors; projection + residual drawn live; one candidate with a length slider |
| 3 | Softmax: turning scores into a distribution | Five scores + a temperature slider; one score editor with arrow-key nudging |
| 4 | Attention scores: who attends to whom | 8 draggable Q/K vectors; 4×4 score and weight matrices |
| 5 | Why we scale attention by √d_k | d_k dimension picker (1 → 128); histogram of Q · K; scale-by-1/√d_k toggle |

A `/map` page renders the concept graph (prerequisite DAG over the
underlying math, with clickable lesson nodes).

The accent color is reserved for things you can manipulate — sliders,
knobs, dominant bars, the focused interactive in the workbench. Static
content never uses it.

## Stack

- Next.js 15, App Router, TypeScript strict, pnpm
- Tailwind CSS (no `shadcn/ui` — primitives are hand-rolled when needed)
- MDX via `@next/mdx`; math via `remark-math` + `rehype-katex`
- React + SVG (no D3, no Canvas, no charting library)
- No state library — `useState` / `useReducer` is enough at this scale
- One external dep for graph layout: `dagre`

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

Tests and content lint:

```bash
pnpm test                    # vitest, math + reducer suites
pnpm lint:content            # zod-validated cross-reference check
```

Requires Node 18+ and pnpm 9+.

## How to add the next lesson

This is the actual pattern used for all five live lessons — no
speculation.

1. **Create the folder** `content/lessons/<slug>/` with four files:
   - `meta.ts` — exports a const object with `slug`, `title`, `summary`,
     `minutes`, `order`. The `order` field controls the lesson's
     position on the landing page and in the concept graph.
   - `interactives.tsx` — exports a `readonly InteractiveEntry[]`. Each
     entry has `id`, `title`, `description`, and `Component`. The
     components are the React components that render the figures
     (under `components/sim/`).
   - `lesson.mdx` — the content. Import components at the top from
     `@/components/lesson/*` and `@/components/sim/*`, then write
     Markdown with KaTeX (`$$…$$` display, `$…$` inline) and JSX for
     interactives. Use `<Callout targetInteractive="…">` to make prose
     instructions focus the matching figure in the workbench.

2. **Register the lesson** in two places:
   - `lib/lesson-manifest.ts` — add an import of the meta and the
     interactives, and an entry in the `manifest` array.
   - `lib/lessons.ts` — add an import of the compiled `.mdx` module
     and an entry in the `components` map.

3. **If the lesson needs a new interactive primitive** (e.g. a
   histogram, a 2D vector canvas, a heatmap), add it under
   `components/sim/primitives/` and a composing component under
   `components/sim/`. Each primitive is a self-contained client
   component that accepts a `preset` prop and exposes a `<callout>`
   hook for the prose to focus/pulse it.

4. **If the lesson needs new math** (projection, random sampling,
   scaled dot product, etc.), put it in `lib/math/<name>.ts` with
   `lib/math/<name>.test.ts` next to it. Cover the boundary cases
   (zero vectors, length mismatches, non-positive dimension) — these
   tests are the lesson's defense against silent numerical breakage.

5. **If the lesson adds a new concept node** to the prerequisite
   graph, add it to `content/concepts/graph.yaml` and wire the edges
   to its prerequisites. `pnpm lint:content` will reject cycles and
   dangling edges.

## Project structure

```
TensorDojo/
├── app/
│   ├── layout.tsx                 # dark-mode root, Inter + JetBrains Mono
│   ├── page.tsx                   # landing: 5 lesson cards + footer
│   ├── globals.css                # design tokens, KaTeX, slider/number-input
│   ├── lessons/[slug]/page.tsx    # dynamic SSG route
│   └── map/page.tsx               # concept graph
├── components/
│   ├── lesson/                    # LessonShell, Workbench, WorkbenchItem,
│   │                              # Callout, MathCode
│   ├── sim/                       # Interactive figures (one per lesson)
│   │   └── primitives/            # VectorCanvas, Heatmap, BarChart,
│   │                              # Slider, NumberInput
│   ├── concept-graph/             # ConceptGraphView (SVG via dagre)
│   └── home/                      # LessonCardList for the landing
├── content/
│   ├── lessons/<slug>/
│   │   ├── meta.ts
│   │   ├── interactives.tsx
│   │   └── lesson.mdx
│   └── concepts/graph.yaml
├── lib/
│   ├── math/                      # softmax, linalg, random
│   ├── content/                   # YAML loaders + zod schemas
│   ├── lessons.ts                 # server-side registry
│   └── lesson-manifest.ts         # client-safe manifest
├── scripts/
│   └── lint-content.ts            # zod-validated cross-reference check
├── docs/screenshots/              # per-route captures at three viewports
└── package.json
```

## Design system notes

- **Background** `#0B0D10`, **ink** `#E4E4E7`, **muted** `#A1A1AA`, **dim**
  `#71717A`, **border** `#1F242A`, **border-strong** `#2A323B`, **accent**
  `#2DD4BF`.
- **Typography**: Inter (UI) + JetBrains Mono (numbers, labels, code)
  via `next/font`.
- **One accent, one rule**: the teal is reserved for the things the
  reader can move. Static chrome (headings, body text, borders, code
  fences) never uses it.
- **Math**: KaTeX via `remark-math` + `rehype-katex`. Display mode for
  the headline equation of a section, inline for everything else.
- **Numbers**: tabular-nums everywhere a value is read; min-width on
  the slider's value column so the row doesn't reflow as digits
  change.

The full product vision — notebooks, sync engine, AI tutor, accounts,
labs — is in `design-spec.md` and `technical-spec.md`. They are
*where this is going*, not *what this build is*.
