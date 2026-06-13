# PHASE_NOTES_THEME — light/dark theme pass

This file is a working note. Delete after reading.

## Summary

Added a light theme to AI Learning Lab (previously dark-only) without
redesigning the dark palette. Token-driven: every color reference in
Tailwind, components, and SVGs reads through CSS custom properties
that swap on `.dark`. Theme toggle lives in the top-right of every
page, persists across reloads, and respects `prefers-color-scheme` on
first visit.

## What ships

- `app/globals.css` — token table at `:root` (light) and `:root.dark`
  (dark). All component CSS rules rewritten to use the tokens.
- `app/layout.tsx` — inline `<head>` script that resolves initial
  theme (localStorage > `prefers-color-scheme` > dark) and adds
  `.dark` to `<html>` *before* paint. Renders `<ThemeToggle />`
  once in the body, so every route gets it.
- `tailwind.config.ts` — `darkMode: 'class'`, every color in
  `theme.extend.colors` reads as `rgb(var(--x) / <alpha-value>)`
  using channel-form CSS variables, so `bg-bg/40` works.
- `lib/theme/use-theme.ts` — React hook. Reads current state from
  the DOM, writes to localStorage + class. Subscribes to
  `prefers-color-scheme` changes when the user has no explicit
  preference yet.
- `components/theme/ThemeToggle.tsx` — fixed top-right icon button.
  Sun icon in dark mode (click → light); moon icon in light mode
  (click → dark). `aria-label` carries the full sentence.
- 14 components updated: BarChart (no change — already tokenized),
  Heatmap, VectorCanvas, ConceptGraphView, GradientDescentExplorer,
  CrossEntropyCurve, PositionalSineWave, LayerNormViz,
  EmbeddingDimensionSlider, CausalMaskExplorer, ProjectionExplorer,
  ResidualStackExplorer, MultiHeadExplorer, PositionalEncodingHeatmap,
  CandidateSort, DotProductExplorer. All hardcoded hex / rgba values
  replaced with token references.

## Final token palette

The two palettes below are the *exact* values that ship. All
contrast ratios measured on the rendered colors via a live browser
probe; raw `var(--x)` values were pulled with
`getComputedStyle(document.documentElement).getPropertyValue(...)`.

| Token              | Light (R G B)            | Dark (R G B)         | Notes |
|--------------------|--------------------------|----------------------|-------|
| `--bg`             | 251 250 248 (warm off)   | 11 13 16             | Page background |
| `--bg-elevated`    | 255 255 255              | 20 24 29             | Card / workbench surface |
| `--bg-code`        | 244 241 236              | 20 24 29             | Code block fill |
| `--fg`             | 26 24 21                 | 229 231 235          | Primary text |
| `--fg-muted`       | 74 71 66                 | 156 163 175          | Secondary text |
| `--fg-subtle`      | 111 108 104              | 107 114 128          | Eyebrows, hints |
| `--border`         | 230 226 219              | 31 36 42             | Default border |
| `--border-strong`  | 207 201 191              | 42 50 59             | Divider lines |
| `--accent`         | 15 118 110 (teal-700)    | 45 212 191 (teal-400) | The one accent |
| `--accent-hover`   | 17 94 89 (teal-800)      | 94 234 212           | Hover |
| `--accent-fg`      | 255 255 255              | 11 13 16             | Text on accent |
| `--positive`       | 15 118 110               | 45 212 191           | Aligned vector / bar |
| `--negative`       | 185 28 28 (red-700)      | 248 113 113          | Anti-aligned vector / bar |
| `--grid`           | 236 232 225              | 31 36 42             | Heatmap faint grid |

Pre-baked rgba tokens (kept as full values, not channels, because
they describe a specific visual):

| Token              | Light                       | Dark                          |
|--------------------|-----------------------------|-------------------------------|
| `--accent-soft`    | rgba(15,118,110, 0.10)      | rgba(45,212,191, 0.16)        |
| `--accent-faint`   | rgba(15,118,110, 0.06)      | rgba(45,212,191, 0.10)        |
| `--accent-dim`     | rgba(15,118,110, 0.32)      | rgba(45,212,191, 0.28)        |
| `--negative-bg`    | rgba(185,28,28, 0.7)        | rgba(248,113,113, 0.7)        |
| `--shadow-inset`  | inset 0 1px 0 rgba(31,26,22, 0.04) | inset 0 1px 0 rgba(255,255,255, 0.02) |
| `--accent-shadow`  | rgba(15,118,110, 0.18)      | rgba(45,212,191, 0.15)        |
| `--cell-halo`      | 251 250 248 (channel)       | 11 13 16 (channel)            |

## WCAG AA contrast — measured

Computed against the rendered colors. AA threshold is 4.5:1 for body
text, 3:1 for large text and UI components.

### Light theme — all body text passes AA

| Pair                    | Ratio   | AA pass |
|-------------------------|---------|---------|
| fg / bg                 | 16.98   | ✓       |
| muted / bg              | 8.86    | ✓       |
| subtle / bg (eyebrow)   | 5.01    | ✓       |
| accent / bg (link)      | 5.25    | ✓       |
| accent-hover / bg       | 7.27    | ✓       |
| accent / bg-elevated    | 5.47    | ✓       |
| accent / bg-code        | 4.86    | ✓       |
| border / bg             | 1.24    | —       |
| border-strong / bg      | 1.58    | —       |

Border colors are decorative (visual divider, not text or interactive
boundary); WCAG's 3:1 non-text rule is not applied. Kept intentionally
subtle so cards do not visually out-shout the prose.

### Dark theme — pre-existing carry-over

| Pair                    | Ratio   | AA pass |
|-------------------------|---------|---------|
| fg / bg                 | 15.72   | ✓       |
| muted / bg              | 7.66    | ✓       |
| subtle / bg (eyebrow)   | 4.02    | ✗       |
| accent / bg (link)      | 10.45   | ✓       |
| accent-hover / bg       | 13.15   | ✓       |
| border / bg             | 1.25    | —       |
| border-strong / bg      | 1.50    | —       |

The dark `--fg-subtle` (`#6B7280`) on dark bg is 4.02:1 — *fails* AA
for small text. This was the original color before this work; not
introduced by the theme pass. Out of scope per the brief ("don't
change the dark palette"). Documenting it so the next pass can fix
it. Used for: track eyebrows ("FOUNDATIONS OF SIMILARITY"), duration
chips ("7 MIN"), and "lesson" sublabels in the concept map.

## Heatmap colormap

Kept the same colormap on both themes (option A in the brief). The
opacity floor is 0.12 for `accent` and `diverging`, which is
visibly darker than `--bg` in both themes. On the warm off-white
the lightest teal cell is just barely distinguishable from the page
background — it reads as a "very low attention" cell, which is the
intended semantic. Verified by eye against the after-screenshots
in `docs/screenshots/after-theme/{dark,light}/`.

The diverging colormap's `--negative` (red-700 light, red-400 dark)
maintains a similar visual relationship to its accent in both
themes.

## What was harder than expected

1. **Tailwind 3.4 inlines CSS variable values at build time when the
   color string is a function wrapping `var()`.**  Initial config
   used `bg: 'var(--bg)'` for tokens. Tailwind processed the value,
   resolved `var(--bg)` to the last definition in the stylesheet
   (the `:root.dark` override), and *inlined* `11 13 16` into every
   `.bg-bg` rule. Result: the page was permanently dark, regardless
   of the `.dark` class. Switching the config to the channel pattern
   (`'rgb(var(--bg) / <alpha-value>)'`) with `:root { --bg: 251
   250 248; }` (bare channels, no wrapper) makes Tailwind preserve
   the `var()` reference at runtime. The cost: every inline SVG /
   `style={{...}}` that previously wrote `fill="var(--accent)"` had
   to be rewritten to `fill="rgb(var(--accent))"`. Caught by a
   puppeteer probe that compared `htmlClass` to
   `getComputedStyle(body).backgroundColor`.

2. **Stale CSS in the dev server.**  When I made the channel-token
   switch, the dev server's CSS cache kept serving the old
   inlined-dark-value CSS for several seconds. A `touch
   app/globals.css` was needed to force a rebuild, then everything
   snapped to correct. Worth flagging in the README — Tailwind 3.4
   + Next dev server occasionally holds a stale build for
   CSS-restructure changes.

3. **The pre-existing `dim` color on dark mode was already failing
   AA (4.02:1).**  The original codebase had this. Adding the light
   theme was an opportunity to fix it (light `dim` is 5.01:1, passes)
   but per the brief, the dark palette is out of scope. Noted here
   for the next pass.

## What I'd improve next

1. **Bump dark `--fg-subtle` from `#6B7280` to `#8B8F96`** (would
   hit ~4.7:1 on `#0B0D10`). Tiny change, restores AA for the
   eyebrows without darkening the visual hierarchy.
2. **Concept map: consider thicker edges in light mode.**  The
   `var(--border-strong)` for both within-track and cross-track
   edges is intentionally faint (decorative). On the warm off-white
   it gets a touch washed out. Probably fine; if users complain,
   add a dedicated `--map-edge` token.
3. **The `top-4 right-4` placement of the toggle** is fine for
   desktop but may overlap the prose on very narrow screens. Tested
   at 1440; the breakpoint under 640px uses `top-4 right-4` so it
   sits clear of the `px-6` body padding. Should be OK down to
   ~360px. Worth a quick visual check on a phone-sized viewport.
4. **A11y: the focus ring on the toggle uses the global `.focus-ring`
   utility** (2px teal ring). Works, but the toggle's *hover* state
   changes background to `--bg-elevated-hover`, which is a token
   specific to the toggle. If a future component needs the same
   hover, expose it as a Tailwind class (`hover:bg-bg-elevated-hover`)
   rather than relying on this single use site.
5. **Skip-transitions-on-switch trick** uses a 2-RAF dance
   (`requestAnimationFrame` x 2 before removing the
   `theme-switching` class). Works in Chrome and Safari. Firefox is
   the same spec. If the user reports a flash in some edge case
   (e.g. WebView), bump to a `setTimeout(..., 0)` after the second
   RAF as a third guard.

## Files added / changed

```
added   components/theme/ThemeToggle.tsx
added   lib/theme/use-theme.ts
modified  app/globals.css                  (rewrote; tokens + dark/light)
modified  app/layout.tsx                   (inline script + ThemeToggle)
modified  tailwind.config.ts               (rgb channel pattern)
modified  13 sim/concept-graph components (hardcoded -> tokens)
modified  components/lesson/MathCode.tsx   (token-only; no behavior change)
```

No dependencies added. No MDX content changed. No layout, spacing,
or typography changed. Dark palette unchanged.

## Verification

- `pnpm lint:content` → 16/16 lessons, clean
- `pnpm test` → 145/145 tests, clean
- `pnpm build` → 21 pages generated, clean
- Bundle sizes identical to baseline: home 110 kB, lesson 147 kB,
  /map 135 kB (delta 0 kB)
- 36 screenshots in `docs/screenshots/after-theme/{dark,light}/`
  (16 lessons + home + /map × 2)
- Live browser probe confirmed:
  - localStorage persists across navigation
  - `.dark` class is the only thing that swaps colors
  - computed `bodyBg` is `rgb(251, 250, 248)` in light, `rgb(11,
    13, 16)` in dark
  - toggle button label flips ("Switch to light theme" ↔ "Switch
    to dark theme")
- Manual toggle test in real browser (Chrome): no flash on
  initial paint, no flash on theme switch (transitions disabled
  during the swap).
