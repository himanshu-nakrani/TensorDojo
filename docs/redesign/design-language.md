# TensorDojo Design Language — "Instrument Panel"

Direction chosen Aug 2026 from three moodboards (`docs/redesign/explore/`):
**B — Instrument Panel**, pure. The site is a precision instrument you
operate to learn how LLMs work: a deep instrument canvas, hairline
bezel panels, dense mono readouts, and a single signal color reserved
for anything live or manipulable.

Dark is the **primary** theme; light is the "lab bench" variant. The
site already defaults to dark when the OS has no preference.

---

## Surfaces

| Token | Dark (primary) | Light (lab bench) | Role |
|---|---|---|---|
| `--bg` | `#0B0E13` | `#EEF1F5` | canvas |
| `--bg-elevated` | `#12161D` | `#FFFFFF` | panel — cards, nav, popovers |
| `--bg-elevated-hover` | `#1A2029` | `#E4E9EF` | panel hover |
| `--bg-code` | `#171C25` | `#F6F8FA` | panel-2 — code blocks, control wells |

Depth is communicated with 1px hairlines (`--border` `#232A35` /
`--border-strong` `#39434F` dark; `#D5DBE3` / `#B9C2CD` light), not
shadows. Recessed areas (control wells) are **darker** than their panel
in dark mode; in light mode wells are the bench grey.

The body carries a fixed **graticule** grid (minor 32px / major 160px,
`--paper-minor/major`) — blue-tinted in dark, blue-grey in light.

## Type

- **Space Grotesk** (`--font-sans`) — display headings and prose.
- **JetBrains Mono** (`--font-mono`) — every number, label, readout,
  axis, code. If it's data, it's mono.

The mono label recipe: `10–12px · 600 · uppercase · letter-spacing
0.14–0.16em · text-dim`. Headings: Space Grotesk 600–700, tracking
`-0.01` to `-0.02em`. Numbers always `tabular-nums`.

## The signal

One accent, `#3DD68C` dark / `#0E9C6D` light. It marks exactly three
things:

1. **Live** indicators (LED dots, LIVE badges, pulsing rings)
2. **Manipulable** controls (slider fills, toggle switches in on-state,
   drag handles)
3. **Navigable** affordances (links, primary buttons, focus rings)

Everything else is neutral. Amber (`--warning` `#FFB224` / `#B45309`)
is the caution readout; red (`--negative`) is wrong-answer/failure.

## Devices

- **LED dot** — small pulsing dot marking anything live (guarded by
  `prefers-reduced-motion`).
- **Spec plate** — a bordered ident block for page headers: unit id
  (`T04·07`), title, and a row of stat cells separated by hairlines.
- **Readout bank** — 3–4 stat cells under/inside a figure: tiny mono
  label above, large mono tabular value below.
- **Control rail** — a sidebar column of controls: label + output
  chip, slider with square-ish thumb, toggle switches (not pills).
- **Ruler ticks** — repeating tick marks along figure-stage edges.
- **Status bar footer** — thin bordered strip, mono, letter-spaced.

## Shape & motion

Radius: panels `4–6px`, controls `3px`, dots/LEDs round. Sharp-ish —
this is machined, not bubbly.

Motion: `120–200ms ease-out` for color/fill transitions; entrance
stays on the existing `fade-up`. Every animation gets a
`prefers-reduced-motion` off-switch. No physics springs.

## Non-negotiables (inherited, keep)

- One signal color; neutral everything else.
- All colors via CSS-variable tokens in `app/globals.css` — never
  hardcode hex/rgb in components (OG raster images excepted).
- Dark/light parity from the same token names.
- AA contrast for text (`--fg-subtle` is tuned to pass on canvas and
  panels in both themes).
- A11y contracts of the sim primitives (labels, focus rings, keyboard).
- Theme swap without transition tween (`.theme-switching`).

## Rollout notes

- Phase 4 applies the devices (spec plates, readout banks, control
  rails, status footer) page by page; tokens and fonts landed in
  Phase 1 (this change).
- OG images (`app/opengraph-image.tsx`,
  `app/lessons/[slug]/opengraph-image.tsx`) still carry the old
  warm-palette hexes — restyle when touching Phase 4 surfaces.
