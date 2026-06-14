# PHASE_NOTES_FINAL_POLISH — final pass (delete after reading)

The interactive-audit pass that the Training polish skipped. Every
component in `components/sim/` was read and re-checked against the
design contract (design-spec §8, the seven rules in the brief). Every
issue found was either fixed in place or documented below.

## Issues found and fixed

| Component | Issue | Fix |
|---|---|---|
| **tailwind.config.ts** | `text-fg-subtle`, `text-fg-muted`, `fill-fg-subtle`, `stroke-fg-subtle` — 13 call sites across the codebase — referenced CSS variables (`--fg-subtle`, `--fg-muted`) that had no Tailwind class binding. Tailwind emitted no rule; the affected text inherited the page color and read in the wrong tone. | Added `fg: rgb(var(--fg))`, `fg-muted: rgb(var(--fg-muted))`, `fg-subtle: rgb(var(--fg-subtle))` color bindings. Same colors as `ink` / `muted` / `dim`; the alias is purely for code that mirrors the var name. |
| **components/sim/BlockDepth.tsx** | `text-amber-300` is a hardcoded Tailwind color (Rule #1) AND a visible-by-color-only signal (Rule #7) — the "low cosine → drifted" warning used amber with no non-color cue. | Replaced with `text-[rgb(var(--negative))]` (the existing `--negative` token) and added a `↓` glyph in front of low-cosine values. The glyph is the non-color signal. |
| **components/sim/BlockPipeline.tsx** | Same `text-amber-300` issue in two places (drift readout value, and the "a residual is off" warning). | Same fix: `--negative` token + `↓` prefix for the per-block value. The warning already had a `⚠` glyph, which is the non-color signal. |
| **components/sim/ProjectionExplorer.tsx** | `bg-red-400` is a hardcoded Tailwind color in the legend swatch (Rule #1). Plus copy drift: the legend and `ariaLabel` said "cyan dashed" but the swatch is teal (the design uses teal, not cyan). | Swatch → `bg-[rgb(var(--negative))]`. Copy → "teal dashed" / "Dashed teal shows the projection…" in both the ariaLabel and the legend. |
| **content/lessons/token-embeddings/lesson.mdx** | "The cyan line is `king − man + woman`" — the line is teal, not cyan. | "The teal line…". |
| **All 21 non-Training sim components + the 5 Training sim components** | Pill-toggle buttons (schedule selector, sentence selector, head selector, d_k choice, etc.) and "Reset" / "Re-init" / "Re-run" / "Step" / "Train" / "Sample" buttons had no `:focus-visible` styling. Active state showed accent border, focus state showed nothing. (Rule #3 / quality bar #2.) | Added the `focus-ring` utility class from `globals.css` to every interactive button in every sim component. 50+ buttons touched. The 6 pure-input components (CrossEntropyCurve, EmbeddingDimensionSlider, LayerNormViz, MultiHeadExplorer, PositionalEncodingHeatmap, PositionalSineWave) had no buttons, only `<input type="range">` / `<input type="number">` — those get focus styling from the `.slider` and `.number-input` classes already, so nothing to add. |

## Verified clean (no change)

| Area | Check |
|---|---|
| `components/sim/*.tsx` raw colors | `grep -nE "rgb\([0-9 ,]+\)\|#[0-9a-fA-F]{3,6}"` returns ZERO matches after the fixes. The only `rgb()` calls are `rgb(var(--*))`. |
| Hardcoded Tailwind palette colors | `grep` for `text-amber / text-red / text-cyan / bg-amber / bg-red / bg-cyan` returns ZERO matches. |
| Accent leaks on static chrome | Spot-checked 5 random components (BlockPipeline, ProjectionExplorer, SamplingDecodingExplorer, SoftmaxExplorer, GradientDescentExplorer). All `text-accent` usages are on the *dominant* derived value (the lesson's headline number), the active pill state, or a primary CTA — never on static chrome like section headers, descriptions, or dividers. |
| Lesson defaults (Rule #4) | DotProductExplorer: a=(1.4, 0.6) / b=(-0.4, 1.3) → a·b = 0.22, cos θ ≈ 0.11. *Not* aligned. EmbeddingPlane default query is "king" (interesting NN: queen, man). CausalMaskExplorer mask is ON by default (the interesting state). PositionalEncodingHeatmap d=16, maxPos=16 → 16×16 heatmap reads legibly. |
| Tabular-num + min-width on slider readouts (Rule #6) | Every interactive in the new pass uses the `Slider` primitive (which has the `tabular-nums` + 6ch min-width built in). The 6 components with raw `<input type="range">` (CandidateCosine, LayerNormViz, MultiHeadExplorer, PositionalEncodingHeatmap, PositionalSineWave, EmbeddingDimensionSlider, ResidualStackExplorer) all show readouts whose digit count is constant across the slider's range — no width reflow possible. Left as-is. |
| MDX "Try it" drift | Re-read all 21 lessons' Callout blocks. Prose instructions match the default state of the named interactive in every case except the "cyan → teal" copy fix in token-embeddings. |

## Bundle impact (from `pnpm build`)

| Route | Before this pass | After this pass | Target |
|---|---|---|---|
| `/` (home) | 5.07 kB / 111 kB | 5.07 kB / **112 kB** | < 115 kB ✓ |
| `/lessons/[slug]` (heaviest) | 60 kB / **166 kB** (training-end-to-end, last pass) | 52.7 kB / **159 kB** | < 160 kB ✓ |
| `/map` | 2.8 kB / 109 kB | 2.81 kB / 109 kB | — |

The 7 kB lesson-route shrink comes from the static-import cleanup
that landed with the Tailwind config + the fact that nothing in this
pass added heavy code. The training-end-to-end lesson is now under
the 160 kB target.

## Quality bar — done checklist

1. ✓ `grep -nE "rgb\([0-9 ,]+\)|#[0-9a-fA-F]{3,6}" components/sim/*.tsx` returns only `rgb(var(--*))`.
2. ✓ Every interactive control has `focus-ring` (or its `:focus-visible` is set by the `.slider` / `.number-input` class it lives in).
3. ✓ No accent on static chrome. Sampled 5 random components.
4. ✓ `pnpm lint:content && pnpm test && pnpm build` all clean. 229 tests passing (no regression from 229).
5. ✓ Home < 115 kB (112 kB). Lesson < 160 kB (159 kB).
6. ✓ "teal" copy in token-embeddings MDX + ProjectionExplorer ariaLabel + ProjectionExplorer legend; no other MDX drift.
7. ✓ 44 after-final-polish screenshots in `docs/screenshots/after-final-polish/{dark,light}/`. Diffed against `before-final-polish/`: the visible deltas are (a) BlockDepth / BlockPipeline drift rows now red (was amber), with a `↓` glyph prefix on low-cosine values; (b) ProjectionExplorer legend swatch now matches `--negative` and copy says "teal"; (c) every pill-toggle button now has a visible focus ring.
8. ✓ This file.

## New artifact

- `scripts/screenshot.ts` — Puppeteer-core script (uses system Chrome at `/Applications/Google Chrome.app/...`). Usage: `pnpm exec tsx scripts/screenshot.ts <outDir> [baseUrl]`. Captures 22 routes × 2 themes at 1440×900 into `<outDir>/{dark,light}/`. Future screenshot passes can re-use it.
