# TensorDojo — UI/UX Audit

A senior UI/UX engineering pass over the shipped `artifacts/tensor-dojo`
app: the shell (nav, search, lesson layout), the home surfaces, the
concept map, and the ~90 interactive sims. Scope was the code users
actually run — dead scaffolding (`src/pages/not-found.tsx`, the unused
`src/components/ui/*` shadcn kit) was identified and excluded from fixes.

**Overall:** the codebase is unusually well-built. It has a disciplined
token-based theming system, a skip link, a focus-trapped mobile drawer,
`prefers-reduced-motion` handling throughout, 44px touch targets on the
primary nav, and fully keyboard-operable draggable vectors
(`VectorCanvas`). The real defects were concentrated, not pervasive — and
the highest-count issue was a *content* one that a surface-level pass
would miss.

## Top priorities

1. **A design-system color drift left instructional copy lying to
   learners.** The accent consolidated from green to blue at some point;
   sim code updated, prose did not. Eight lesson captions, three sim body
   texts, and three `aria-label`s told readers to find a "green" curve/bar
   that actually renders **blue**. Fixed all 14, including the
   screen-reader labels.
2. **One genuine theming bug + one broken modal.** `InContextLearningExplorer`
   hardcoded RGB literals with no dark variant (bars kept light-mode
   colors in dark mode); the ⌘K search palette showed an "esc" hint but
   never handled Escape. Both fixed.
3. **Two sims were mouse-only** for their core interaction. Added
   keyboard-operable slider equivalents.

## Issue count (verified findings)

| Severity | Found | Fixed | Deferred |
|----------|:-----:|:-----:|:--------:|
| 🔴 Critical | 3 | 3 | 0 |
| 🟠 Major | 6 | 6 | 0 |
| 🟡 Minor | 7 | 5 | 2 |
| 🟢 Suggestion | 8 | 2 | 6 |

Deferred items are lower-impact polish or larger refactors that warrant
their own change; they are listed at the end.

---

## Focus Area 1 — Visual Hierarchy & Layout

The hand-built layouts are strong (clear type hierarchy, consistent
`SimFrame` card, sticky workbench). Issues were about figures that break
their container rather than hierarchy.

| Severity | Issue | Fix | Status |
|----------|-------|-----|:------:|
| 🟠 Major | `FlashAttentionTiling` renders a fixed 288px SVG in a non-wrapping flex row — overflows the card and crushes the text column on phones. | Row → `flex-col sm:flex-row`; SVG → `h-auto max-w-full` so it scales down. | ✅ Fixed |
| 🟡 Minor | `RMSNormCompare` uses `grid-cols-8` of numeric cells; at 360px each cell clips. | `grid-cols-4 sm:grid-cols-8`. | ✅ Fixed |
| 🟢 Suggestion | `SimFrame` header only wraps when `headerWrap` is passed; wide action groups can squeeze the title. | Default the header row to wrap. | ⏳ Deferred |

## Focus Area 2 — Accessibility

| Severity | Issue | Fix | Status |
|----------|-------|-----|:------:|
| 🔴 Critical | `DpoLossExplorer` — the draggable loss-surface point is set only via pointer events; no keyboard path, and the SVG is unnamed. | Added `r_w`/`r_l` sliders driving the same state + an `aria-label`. | ✅ Fixed |
| 🔴 Critical | `LossLandscape` (sim) — SGD start point is drop-on-click only; `role="img"` on an interactive layer. | Added keyboard `start x`/`start y` sliders + updated the label. | ✅ Fixed |
| 🟠 Major | Search palette is a modal (`aria-modal`) advertising "esc", but Escape did nothing (cmdk's bare `<Command>` doesn't own open state); no focus trap or focus restoration. | Added Escape→close, a Tab focus-trap, and focus restore to the opener; gave `Command.Input` a `focus-visible` ring. | ✅ Fixed |
| 🟠 Major | Three lesson `aria-label`s announced a "green" curve/circles/line that render blue — SR users got wrong color info. | Corrected to "blue" (see Focus Area 4). | ✅ Fixed |
| 🟡 Minor | Lesson-list cards suppressed the focus outline and replaced it with only a 1px border-color change — weaker & inconsistent with the rest of the app. | Match the sibling ResumeCard: `ring-2 ring-accent` on focus-visible. | ✅ Fixed |
| 🟡 Minor | Segmented toggle groups signaled the active option by color only (no `aria-pressed`) in several sims. | Added `aria-pressed` to `KVCacheBuilder`, `SpeculativeSpeedup`, `MoECostBars`. | ✅ Fixed (3 of ~6) |
| 🟢 Suggestion | Concept-map prereq popover used `role="dialog"` with no focus management. | Changed to `role="group"` (it's informational, not a dialog). | ✅ Fixed |
| 🟢 Suggestion | `Heatmap` cell-highlight fires on `mouseenter` only — no keyboard/touch equivalent (e.g. `AttentionMatrix`). | Add focus/tap cross-highlight. | ⏳ Deferred |

## Focus Area 3 — Mobile Responsiveness

| Severity | Issue | Fix | Status |
|----------|-------|-----|:------:|
| 🟠 Major | `.number-input` is `0.875rem` (14px) — under 16px, so **every** numeric field in every sim triggers iOS Safari focus auto-zoom. | 16px on mobile, `0.875rem` from `sm:` up (one CSS rule, app-wide). | ✅ Fixed |
| 🟠 Major | Viewport meta set `maximum-scale=1`, disabling pinch-zoom (WCAG 1.4.4). | Removed `maximum-scale=1`. | ✅ Fixed |
| 🟢 Suggestion | Hover-only arrow affordances / `title` tooltips never appear on touch. | Reveal under `@media (hover:none)` or move to visible text. | ⏳ Deferred |

## Focus Area 4 — Color, Typography & Spacing

The token system is excellent — every SVG fill/stroke goes through
`rgb(var(--token))`. Two real breaks and one systemic drift:

| Severity | Issue | Fix | Status |
|----------|-------|-----|:------:|
| 🔴 Critical | `InContextLearningExplorer` hardcodes bar/text RGB literals with no `dark:` variant → light-mode colors persist in dark mode. | Route `red`/`blue`/`green` through `--negative`/`--accent`/`--positive` (the dark literals were already exactly those tokens). | ✅ Fixed |
| 🟠 Major | **Systemic "green" drift.** 8 lesson captions + 3 sim body texts + 3 aria-labels describe `--accent` (blue) elements as "green" (and one "cyan"). The palette consolidated to a single blue accent; the prose was never updated. | Corrected every instance to "blue". | ✅ Fixed (14 spots, 13 files) |
| 🟠 Major | `--negative` (the semantic "error" red) is reused for a neutral second series (test points, residual vector, test-loss line). | Consider `--series-2/4`; reserve red for genuinely negative values. | ⏳ Deferred (design call; current blue/red is CVD-safe) |
| 🟡 Minor | Type scale is defined but unused — components use arbitrary `text-[NNpx]`/`text-[N.NNrem]` one-offs, with near-duplicate sizes (1.05/1.1/1.125/1.15rem). | Extract `body`/`h1..h3`/`label` fontSize tokens and replace bracket values. | ⏳ Deferred (refactor) |
| 🟢 Suggestion | Two-series charts distinguish by hue only; `InContextLearning` (◆/●/▲) is the model to follow. | Add a shape or direct label per series. | ⏳ Deferred (legends already carry the mapping) |

## Focus Area 5 — User Flow & Navigation

✅ No blocking issues found. Primary CTAs are prominent, labels are
action-oriented ("Start with vectors", "Browse all lessons"), empty
states are handled (`ResumeStrip` renders nothing for first-time
visitors; the map has a mobile list fallback), and `PrevNext` gives
keyboard lesson navigation. The one nav-surface defect — the search
palette's broken Escape — is covered under Accessibility.

---

## Deferred / recommended follow-ups

- **Dead code:** `src/pages/not-found.tsx` is an unused duplicate of the
  live `NotFoundPage.tsx` with broken theming (`bg-gray-50`, `text-red-500`);
  the `src/components/ui/*` shadcn kit is unimported and references
  undefined tokens (`bg-background`, `bg-primary`) plus `bg-black/80`
  scrims. Recommend deleting both (or remapping the kit to app tokens) to
  prevent a future dev wiring up the wrong 404 or an un-themed dialog.
- **`aria-pressed` on the remaining toggle groups** (e.g. `RoPERelativity`,
  `QuantizationDistribution`) — same one-line pattern as the three fixed here.
- **Type-scale extraction** — fold the arbitrary `text-[…]` sizes into
  named Tailwind `fontSize` tokens.
- **Chart series redundant encoding** — add shape/label so hue isn't the
  sole signal.
- **Stale code comments** describing the blue `--accent` as "teal"/"green"
  (non-user-facing).

## Verification

All changes pass `tsc --noEmit` (exit 0) and a full `vite build` (exit 0,
58 lessons + all sims compiled). Changes are token-preserving and additive
where possible; no interaction logic was removed (mouse drag still works
everywhere a keyboard equivalent was added).
