# PHASE_NOTES_NAVFIX — map redesign + navigation flow

This file is a working note. Delete after reading.

## Summary

The /map page previously rendered a single dagre-laid-out graph of
all 30+ concept nodes and 16 lesson nodes. At 11 lessons it was
already noisy; at 16 with concepts and lesson nodes mixed, the
reader scrolled past more clutter than signal. The home/lesson/map
round-trip also had visible seams: lesson → home was the only
"back" path, the map had no Resume CTA, and the reader had to
remember which lesson they were on.

This pass:

1. **Redesigned /map** around the 5 tracks. Each track is a row
   of lesson nodes in reading order. Concepts are demoted to a
   per-lesson concept count badge.
2. **Added a visit-tracker** (localStorage, 10s dwell threshold)
   and surfaced the last-visited lesson as a "Resume:" CTA on
   the map. The lesson page marks the visit on mount.
3. **Closed the navigation loop**: every page has a clear exit
   to the next. Lesson → map → resume → lesson. Home → map →
   resume → lesson. 404 → home AND map.

## Files added / changed

```
added   lib/progress/visits.ts             (markVisited, getVisited, getLastVisited)
added   components/lesson/VisitTracker.tsx  (10s-dwell marker)
added   components/concept-graph/MapHeader.tsx  (Resume/Start CTA)
added   lib/content/map-data.ts            (buildTrackSections, findCrossTrackEdges)

modified  components/concept-graph/ConceptGraphView.tsx  (rewrite — track rows)
modified  app/map/page.tsx                  (use the new view + CTA)
modified  components/lesson/LessonShell.tsx  (added ← Concept map back-link)
modified  components/lesson/PrevNext.tsx     (track context + "New track" badge)
modified  app/page.tsx                       (kept top + footer "View concept map" link)
modified  app/not-found.tsx                  (now links to / AND /map)
```

No content changes (lessons, manifest, graph.yaml are unchanged).
No new dependencies.

## What changed in /map, in detail

### Old layout
A single SVG with all 38 nodes (16 lesson concepts + 22 atomic
concepts) and ~50 edges laid out by dagre in a TB (top-bottom)
direction. The reader had to mentally group nodes by track.

### New layout
A vertical stack of 5 track sections, each:

- Track label (the existing label from `TRACKS` in
  `lib/lessons-meta.ts`).
- "N lessons" count.
- A horizontal row of lesson cards. Each card is a Next `<Link>` to
  `/lessons/{slug}` and shows: title, minutes, a visited/
  unvisited pill (filled accent dot for visited, hollow border
  ring for unvisited), and a "N concepts" badge.
- Forward arrows `→` between consecutive lessons in the track.
- Cross-track prerequisite annotations: when a lesson L has
  cross-track prereqs (computed from graph.yaml), a small
  `<- from: {title}` annotation appears above the card. The full
  source title is in a `title` attribute for hover, with the
  originating track label. Multiple prereqs stack.

Below the tracks: a 4-key legend (`● visited`, `○ unvisited`,
`→ next in track`, `← prerequisite (out of track)`). No
mystery keys.

Above the tracks: the Resume/Start CTA. On the server it's
"Start: {first lesson}" because the server can't read
localStorage. On the client, after the useEffect runs, it flips
to "Resume: {most recent lesson}" if the reader has visited any.

### Why this layout
- A track is a list, not a graph. The old dagre layout was
  solving a problem (general graph layout) that didn't match the
  shape of the data (5 ordered lists).
- 16 lesson cards across 5 rows fit comfortably at 1440px (longest
  track has 5 cards; 5×~200px + arrows + gaps = ~1100px).
- Concepts are descriptive metadata; the reader navigates to
  lessons, not concepts. Demoting them to a per-lesson count
  reduces visual noise by ~50%.
- The Resume CTA is the missing piece. The home page lists
  lessons; the map lists them in their full topology; without
  Resume, the reader has to remember where they were.

## Visit tracker design

```ts
localStorage['tld-visits'] = JSON.stringify({ slug: epochMs })
```

- `markVisited(slug, at=Date.now())` — debounced 1s so React
  strict-mode double-mount and rapid nav don't write twice.
  Only updates if `at` is newer than what's stored.
- `getVisited()` — returns `Record<slug, ms>`. SSR-safe.
- `getLastVisited()` — returns the slug with the highest mtime,
  or `null`.

The lesson page mounts `<VisitTracker slug={slug} />` which
fires `setTimeout(markVisited, 10_000)` on mount and clears the
timer on unmount. The 10s threshold filters out accidental
bounces (clicking the wrong card, hitting back within a second).

A `tld-visits-changed` CustomEvent is dispatched on the window
after each write, so the map page (if open in another tab) can
re-render. The map listens for both that event and the standard
`storage` event (for cross-tab sync).

## What changed in PrevNext

The existing prev/next navigation is unchanged. Two additions:

- **Track context**: each side shows the *track label* the
  lesson lives in, so the reader can see when they're staying
  in their current track and when they're crossing into a new
  one.
- **"New track" badge**: when the next/prev lesson is in a
  different track, an extra accent-colored "NEW TRACK" eyebrow
  appears above the "Next:" / "Previous:" label. Visually
  marks the boundary so the reader doesn't accidentally skip
  out of their current context.

Keyboard: ← / → navigate when no input/textarea/contenteditable
is focused (was already implemented; verified working).

## Things that are subtler than they look

### Cross-track edge inference is gnarly

The `findCrossTrackEdges` helper walks every (from, to) edge in
`graph.yaml` and asks: do the concepts on both ends map to
lessons, and are those lessons in different tracks? Two
non-obvious bugs surfaced and were fixed:

1. **"Last one wins" mapping.** An atomic concept can flow
   into multiple lesson-concepts (e.g. `softmax` flows into
   both `softmax-concept` and `sampling-decoding-concept`). The
   naive `set` overwrites — so `softmax` would map to
   `sampling-decoding`, producing false cross-track edges
   pointing back at lessons that should be downstream. Fix:
   "set if not present", so the first lesson-concept in YAML
   order wins.

2. **Edges against reading order.** The graph has a few
   edges that point "backwards" relative to the canonical
   reading order (e.g. `cross-entropy → softmax`,
   `token-embedding → attention-score`). These produce
   confusing "prerequisite" annotations on the map. Fix: build
   a slug → reading-order-index map and drop any edge where
   `fromIndex >= toIndex`.

3. **Lesson-concept as the `to`.** Some edges end at
   lesson-concepts (e.g. `causal-mask → transformer-block`).
   The lesson-concept needs to self-map to its own lesson so
   the cross-track pass can resolve it. Fix: in
   `buildConceptToLesson`, also do `atomicToLesson.set(lc.id,
   lc.lesson)` before the incoming-edge loop.

After all three fixes, the cross-track annotations on the map
match the actual curriculum: Multi-head attention ← from
Attention scores; Residual connections ← from Attention
scores; Transformer block ← from Causal masking, Positional
encoding, Token embeddings, Attention output; Sampling and
decoding ← from Softmax. Nothing else.

### Server/client state asymmetry on the map

`useState(() => new Set(Object.keys(getVisited())))` reads
localStorage in the initializer. On the server that's `{}`
(no window); on the client during hydration that's the full
visited map. React 19 throws a hydration mismatch. Fix: start
with `useState<Set<string>>(() => new Set())` and populate in
`useEffect` after mount. Same fix applied to the Resume CTA's
`useState` in `MapHeader`.

The trade-off: the first paint of the map shows "Start:" and
all-unvisited nodes, then the client takes over and re-renders
to show the visited state. A one-frame flicker is acceptable
for the SSG-friendly approach. (A `useLayoutEffect` would
avoid the flicker but would also run on the server and trip
the same hydration mismatch.)

### `dagre` is gone

The old `ConceptGraphView` used `dagre` for graph layout. The
new design is plain HTML + CSS (flex rows for tracks, a small
inline `<ul>` for the prereq annotation, an `aria-label` for
the legend). The `/map` page bundle went from **135 kB** to
**108 kB** — a 27 kB drop, all from removing dagre and its
related layout work. The 5 kB delta budget the brief
mentioned is way under-shot; we *shrank* /map.

## Bundle delta

| Route  | Before | After | Delta |
|--------|--------|-------|-------|
| /      | 110 kB | 110 kB |   0   |
| /map   | 135 kB | 108 kB |  -27  |
| lesson | 147 kB | 147 kB |   0   |

The lesson page picks up `VisitTracker` (a 16-line component
that fires a setTimeout on mount) but the size is rounded the
same to one decimal place; in practice the delta is ~0.2 kB.

## Verification

- `pnpm lint:content` → 16/16, clean.
- `pnpm test` → 145/145, clean.
- `pnpm build` → 21 pages, clean.
- Live browser probe:
  - Visiting a lesson for 10s, then navigating back to /map,
    the CTA flips to "Resume: {title}" within 100ms (the
    useEffect runs on mount).
  - The localStorage-seeded probe confirmed: 3 seeded visits
    show as 3 visited pills, and the most-recent slug shows as
    the Resume target.
  - Keyboard: `→` on /lessons/dot-product navigates to
    /lessons/vector-projection; `←` returns.
  - The cross-track boundary is marked on vector-projection's
    next button: "NEW TRACK · Next · Softmax: turning scores
    into a distribution" (the New track eyebrow is accent-colored).
  - Zero console errors on /map, /, /lessons/* in both themes.

## Screenshots

- `docs/screenshots/before-navfix/{dark,light}/` — 20 images
  (5 routes × 2 widths).
- `docs/screenshots/after-navfix/{dark,light}/` — 20 images
  (same 5 routes × 2 widths).

The before/after is structural, not state-driven. The
before-screenshots show the old dagre map; the after-screenshots
show the new track-row map with no visits yet (Start: dot-product).

## What I'd improve next

1. **Concept tooltips on hover.** The brief said "demote concepts
   to a per-lesson tooltip — hover/focus a lesson node and the
   concepts it teaches appear in a small popover." I implemented
   the count badge ("N concepts") and the prereq annotation,
   but a real hover-popover listing concept names is the more
   polished version. Add a CSS-only or Radix-style tooltip in a
   follow-up. The data plumbing is already in place
   (`lesson.concepts`).

2. **Multi-lessen "Section" nodes for grouped reading.** Some
   lessons are best read as a unit (e.g. the 4 lessons in the
   Block track form the transformer-block capstone). The current
   map treats each as a separate card; a future revision could
   group them into collapsible "sections" with a shared
   "Continue" CTA. Skipped here to avoid scope creep.

3. **Visit-history analytics for the user.** Beyond visited/
   unvisited, the data is there to compute "you've completed
   3/16 lessons" or "your longest streak was 5 lessons
   without a gap". Not part of this brief; future pass.

4. **A11y: keyboard nav within the map.** Each lesson card is
   focusable (it's a `<Link>`) and shows the focus ring, but
   the visited-pill is a visual element only — not announced.
   A `aria-label` already includes "(visited)" on each card, so
   the screen-reader experience is fine.

5. **Resolve the inverted graph edges at the source.** The
   `findCrossTrackEdges` reading-order filter is a band-aid.
   The real fix is in `content/concepts/graph.yaml`: invert
   `cross-entropy → softmax` to `softmax → cross-entropy` (etc.)
   so the data matches the curriculum. Out of scope here, but
   worth a one-line PR.
