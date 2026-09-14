# Landing page redesign

## Background

The current `/` is a lesson directory with a small hero. It works for returning visitors but does almost no work for a first-time visitor: there is no demonstration of what makes TensorDojo different, no curriculum overview, and no answers to the obvious "is this for me" questions. The home page reads as a table of contents, not a product.

This spec turns `/` into a landing page that:

1. Demonstrates the pitch ("manipulate, don't memorize") in the first viewport with a live interactive.
2. Sells the philosophy in one short scroll.
3. Lets a serious learner self-qualify and jump straight to the right place.

The existing lesson directory moves to `/lessons` and is otherwise untouched.

## Goals

- A first-time visitor understands what TensorDojo is within five seconds of landing on `/`.
- A returning visitor with progress sees a resume strip immediately, one click from continuing.
- Navigation between landing, full lessons directory, and concept map is one click from any page.
- Visual treatment stays consistent with the editorial, math-first style already established (same tokens, same spacing scale, one teal accent).

## Non-goals

- No marketing illustrations, hero gradient, glow effects, or stock-style imagery.
- No "trusted by" / social-proof row. There is no real social proof yet, and fabricating it is worse than omitting it.
- No newsletter signup, email gate, or cookie banner work.
- No animated typing, scroll-jacking, or parallax.
- No second interactive in the hero. One focused demo beats two competing ones.
- No changes to lesson content, simulator behavior, or the concept-map page beyond removing duplicated back-links.

## Routing & navigation

### New route: `/lessons`

A new route renders the existing `LessonCardList`. The page is a thin server component:

- Eyebrow ("Lessons"), heading ("Every lesson, by track"), short subtitle.
- `<LessonCardList />` exactly as it exists today.
- No "← Home" link — the top nav covers that.

The component itself is not modified. Anchor IDs (`#track-<id>`) already exist on each track section, so links from the curriculum grid on the landing page can deep-link directly.

### New component: `TopNav`

A persistent top nav is mounted in `app/layout.tsx` and shown on every page. Replaces the per-page "← Home" links on `/lessons`, `/map`, and individual lessons.

- 56px tall, full width.
- Left: wordmark `tensor dojo` (links to `/`).
- Right (desktop, ≥ md): `Lessons`, `Concept map` text links.
- Right (mobile, < md): a hamburger button that opens a full-height drawer with the same three links. Closes on link click and on Escape.
- Sticky on scroll. Transparent over the hero, gains a hairline border and a `bg-bg/80 backdrop-blur-md` after ~80px of scroll. The transition is opacity/background only — never height — to avoid layout shift.
- Active route is marked with the teal accent on the link text. No underline or background pill.

Active-route detection uses `usePathname()`, so `TopNav` is a `'use client'` component.

### Existing per-page back-links

- Remove the `← Home` `<Link>` at the top of `components/lesson/LessonShell.tsx`.
- Remove the `← Home` `<Link>` at the top of `app/map/page.tsx`.
- `/lessons` does not get one in the first place.

The top nav replaces them.

## Page composition (`app/page.tsx`)

Top to bottom:

### 1. Hero

Two-column on `lg`+, single column below.

**Left column** (40–50% of width on desktop, full width on mobile):

- Headline: "Learn AI by manipulating it." at `clamp(2.75rem, 5vw, 4rem)`, tight tracking, `text-balance`.
- Subtitle: "Every concept is something you can move, change, and watch respond. Drag a slider, edit a number, read a result." at 1.125rem, muted.
- Two CTAs in a horizontal row (stack on narrow):
  - Primary: `Start with vectors →` → `/lessons/dot-product`. Solid accent button, comfortable touch target (≥ 44px high).
  - Secondary: `Browse all lessons` → `/lessons`. Outlined button, same height.

**Right column**:

- `<HeroInteractive />` — a new wrapper that renders `DotProductExplorer` with a landing-page preset (see "Hero interactive" below).
- The wrapper carries the visual framing: corner registration ticks (small 1.5px-stroke right-angle marks at the four corners of the panel), a small mono eyebrow row at the top reading `Live · drag a vector tip`, and a softer caption row at the bottom reading `From the first lesson: vectors and the dot product.`

On `< lg`, the columns stack and the interactive sits above the CTAs — the demo lands before the asks.

### 2. Resume strip

Renders only when `getLastVisited()` resolves to a real lesson. The strip is a horizontal row directly under the hero, with a small top margin separating it from the hero.

- Eyebrow: `Resume`
- Title: lesson title
- Right side: `{minutes} min  →`
- Whole row is a single `<Link>` to the lesson.
- Same accent border + faint accent fill as today's `ResumeCard`, but in a one-line layout instead of stacked.

First-time visitors never see this strip, so the page reads as pure marketing for them.

### 3. Why this works

Three tiles in a row on desktop (md+), stacked on mobile. No fills, hairline borders, generous internal padding (`p-6` or `p-7`).

Each tile:

- Eyebrow line, 12px mono uppercase, muted: `01 / Manipulate`, `02 / Math-honest`, `03 / No jargon walls`.
- Headline, 1.125rem semibold ink.
- Body, 14–15px muted, 2 sentences.

Copy:

1. **Manipulate, don't memorize.** The math is interactive. Change an input, watch the output update — every formula in every lesson is a live thing on the page.
2. **Math-honest.** The numbers in the simulators are the real operations on real values, not animated approximations. When you drag a vector, the dot product on the screen is the dot product.
3. **No jargon walls.** New terms are grounded in something you've already moved with your hands. You don't read about a softmax before you've felt one normalize.

### 4. Curriculum at a glance

Section header: `The curriculum` eyebrow, `Eight tracks, in reading order.` headline.

Below it, a grid of 8 track tiles:

- 2 columns on mobile, 3 on `md`, 4 on `lg`.
- Each tile is a `<Link>` to `/lessons#track-{id}`.
- Tile content:
  - Mono uppercase track label (e.g. `VECTORS`, `ATTENTION`).
  - One-line track description, 13–14px muted. Use the existing track metadata if it has descriptions; otherwise hand-write 8 single-line descriptions in `lib/lessons-meta.ts` (additive — adds a `description` field to each `TRACKS` entry).
  - Lesson count, mono, tabular-nums, dim.
- Hover state: tile gains `border-strong` and a teal arrow (`→`) animates in on the right, matching the lesson-card pattern in `LessonCardList`.

Below the grid, a single-line link row: `See how the tracks connect →` linking to `/map`.

### 5. FAQ

Section header: `Questions` eyebrow, `Before you start.` headline.

Five entries rendered as a stack of `<details>` elements (native disclosure, no JS state). One per section, divider between, no card chrome.

- Summary: question text, 1rem semibold ink, chevron on the right that rotates 90° when open. `prefers-reduced-motion: reduce` zeroes the transition.
- Body: 1rem prose, muted, 2–4 sentences, padded.

Questions (with concrete answers — drafted now so the spec can be implemented without further authoring):

1. **Who is this for?** Engineers, students, and curious technical readers who want to actually feel how modern AI works, not memorize a glossary. Comfort with basic algebra and a willingness to read code is enough.
2. **What do I need to know first?** High-school algebra, a vague memory of vectors, and the patience to drag things. No calculus, no Python, no prior ML.
3. **Is the math real or hand-wavy?** Real. Every simulator runs the actual operation on real numbers. The dot-product demo is computing a dot product; the attention demo is computing softmax-weighted values.
4. **How long is the whole curriculum?** Roughly 8–10 hours of reading and tinkering across 40+ lessons, but each lesson stands on its own. The concept map shows what depends on what.
5. **Can I skip around?** Yes. The map marks cross-track prerequisites; the lessons list groups them in reading order. Pick a track, pick a lesson, dive in.

### 6. Footer

Replace today's single-line footer with a slightly more substantial three-column row that collapses to a stack on mobile:

- Left: wordmark + one-line tagline ("Learn AI by manipulating it.").
- Middle: link column — `Lessons`, `Concept map`.
- Right: meta — `Built by @himanshu-nakrani`, optional GitHub link.

Hairline top border, muted text, mono.

## Hero interactive

The hero re-uses the existing `DotProductExplorer` component. A new wrapper, `HeroInteractive`, composes it with landing-page framing.

`DotProductExplorer` already accepts a `preset?: { a, b }` prop, so we set vectors that are immediately legible:

- `a = [1.4, 0.6]`
- `b = [-0.4, 1.3]`

These are the existing defaults — they produce a small negative dot product, which is more interesting than two roughly-parallel vectors (the user immediately sees that "dot product" can be negative).

The wrapper:

- Wraps the explorer in a panel with the same `card-surface` border and elevated background used elsewhere.
- Adds corner registration ticks (four small SVG right-angle marks, accent color at 50% opacity).
- Adds a 12px mono eyebrow `Live · drag a vector tip` above the canvas.
- Adds a 12px mono caption below: `From the first lesson: vectors and the dot product.`

The wrapper does not import any sim internals. If `DotProductExplorer`'s public API ever changes, the wrapper is the only thing that has to follow.

## Visual treatment

- All sizing, color, type, and spacing use the existing tokens in `app/globals.css` and `tailwind.config.ts`. No new colors, no new font, no new spacing scale.
- Section vertical rhythm: `space-y-24` between major sections (`sm:space-y-32` on larger viewports). Generous, editorial.
- Section eyebrows are always 12px mono uppercase, `text-fg-muted`, `tracking-[0.18em]`. Section headlines are always 1.75–2rem semibold ink, tight tracking.
- The hero is the only place a "loud" element exists. Everything else is type-led.
- Dark mode uses the bumped tokens shipped in the recent UX audit pass.

## Accessibility

- Top nav: real `<nav>` element with an `aria-label`. Mobile drawer uses `<dialog>` or a `role="dialog"` with focus trap, opens with `aria-expanded` on the trigger, closes on Escape, returns focus to the trigger on close.
- Hero: headline is a single `<h1>`. The hero interactive's existing `aria-label` is preserved.
- All section headlines are `<h2>`.
- "Why this works" tile headlines are `<h3>`.
- FAQ uses native `<details>`/`<summary>`, which is screen-reader-friendly by default.
- All interactive surfaces have ≥ 44px touch targets and `focus-ring` styles.
- Color contrast: section copy uses `text-muted` or `text-fg-muted`, both verified in the audit pass.

## Component breakdown

New files:

- `app/lessons/page.tsx` — server component wrapping `<LessonCardList />`.
- `components/chrome/TopNav.tsx` — sticky nav, active-route highlighting, mobile drawer.
- `components/home/HeroInteractive.tsx` — `DotProductExplorer` wrapper with corner ticks and framing copy.
- `components/home/ResumeStrip.tsx` — one-line resume row. Reads `getLastVisited()` client-side.
- `components/home/WhyTiles.tsx` — three editorial tiles, no state.
- `components/home/CurriculumGrid.tsx` — 8 track tiles. Reads from `TRACKS` metadata.
- `components/home/FaqAccordion.tsx` — `<details>` list, no state.
- `components/home/Footer.tsx` — three-column landing footer.

Modified files:

- `app/page.tsx` — replaced with landing composition.
- `app/layout.tsx` — mount `<TopNav />` above `{children}`.
- `app/map/page.tsx` — remove the inline "← Home" link.
- `components/lesson/LessonShell.tsx` — remove the inline "← Home" link.
- `lib/lessons-meta.ts` — add `description: string` to each `TRACKS` entry. Hand-write 8 single-line descriptions.

Deleted files: none.

Total new components: 7. Each has one clear responsibility, no shared state beyond the existing `getLastVisited()` / `getVisited()` helpers, and the largest (`TopNav`) is roughly 120 lines.

## Testing & verification

- `npx tsc --noEmit` clean.
- `pnpm test` — existing tests must still pass. No new unit tests for these components: they are presentational and stateless aside from `TopNav`'s scroll/drawer state and `ResumeStrip`'s localStorage read, both of which are tested implicitly via the existing `LessonCardList` resume tests if those exist.
- Manual verification at 390×844, 768×1024, 1440×900:
  - Landing page renders end-to-end with no overflow.
  - Top nav appears on every page; mobile drawer opens/closes; active route is marked.
  - Hero interactive is interactive (drag the tip, dot-product updates).
  - Resume strip appears after visiting any lesson, disappears after clearing localStorage.
  - `← Home` links no longer appear on `/map`, `/lessons`, or any `/lessons/*`.
  - All CTAs route correctly.

## Open questions

None. Design is locked.
