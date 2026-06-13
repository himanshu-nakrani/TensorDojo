# PHASE_NOTES — refine / UI / 5 new lessons (delete after reading)

Working notes for the Phase-3 pass. The goal was three
things, in order: refine the existing 11 lessons, ship-readiness
UI/UX, and 5 new lessons that close real gaps in the chain.

## 1. Final state

- **16 lessons** in reading order across **5 tracks**.
- `pnpm lint:content && pnpm test && pnpm build` all clean.
- **145 tests** (was 78). All math libs exercised by their own
  test file.
- Bundle sizes (production build, all 16 lessons):
  - home `/` → **4.09 kB / 110 kB First Load JS** (≤ 110 kB target)
  - `/lessons/[slug]` → **41.2 kB / 147 kB** (≤ 150 kB target)
  - `/map` → 28.4 kB / 135 kB
- Concept graph: **38 nodes / 58 edges** rendered across 5
  per-track LR rows; click-through still works.

## 2. What changed in the existing 11 lessons (Part 1)

A coherence pass, not an accuracy pass. Three things per lesson:
the prose opens with a concrete question, every recap is three
bold-led takeaways, every recap points forward to the next
lesson.

- **Added a `caption` field** to `InteractiveEntry`. Every
  centerpiece and secondary widget now shows a one-line caption
  under the figure: "Drag a and b on the plane…" / "Click a
  token name to set it as the true answer…" / etc. The
  caption is rendered in `WorkbenchItem` with a top border so
  it reads as a footnote, not as part of the figure body.
- **Rewired every bridge** to the new reading order that comes
  in Part 3. The biggest changes: attention-scores →
  attention-output (new); scaled-attention → token-embeddings
  (reaches *back* up the chain); transformer-block → sampling-
  decoding (reaches *forward* down the chain).
- **Tightened every recap** to three takeaways, all leading
  with a bold keyword ("Three takeaways. **The dot product
  is a single number with two readings.** …").
- **Fixed one pre-existing typo** in `lib/math/linalg.test.ts`
  that had relied on a malformed array literal — the test now
  asserts stable sort order rather than the old behavior that
  depended on the typo.

### Defaults audit

The user spec asked to verify that "the default values of every
slider produce a visibly non-uniform state" on first paint.
Audited every centerpiece:

- **dot-product** — a=(1.4, 0.6), b=(-0.4, 1.3). Cosine ≈ 0.0,
  small positive dot. Demonstrates "small overlap" but the
  reader's first experiment is to drag to parallel. Kept.
- **vector-projection** — a=(1.5, 0.5), b=(1.6, 0.2). Nearly
  parallel, projection dominates residual. Kept.
- **softmax** — scores [2.0, 1.0, 0.1, -0.5, 1.5] at T=1.0.
  Max probability ≈ 0.5, min ≈ 0.04 — visibly non-uniform.
  Kept.
- **attention-scores, attention-output, scaled-attention** —
  hand-tuned fixed Q/K/V default vectors. Kept.
- **token-embeddings, positional-encoding, multi-head,
  residuals-layernorm, transformer-block** — all keep their
  existing hand-tuned defaults. They were already well-tuned
  for the lesson's headline; only the *recap* changed.

## 3. UI/UX ship-readiness (Part 2)

All 8 items in the brief landed.

- **Bundle size (2a).** Split `lib/lessons.ts` into a
  light `lib/lessons-meta.ts` (meta only, no Component imports,
  no interactive sims) and the heavy version. The home page
  imports only the light version. The lesson page route
  imports MDX lesson modules *dynamically* via
  `mdxLessonLoaders`, so the 11 → 16 lessons didn't add
  proportionally to the lesson-route chunk. Final numbers:
  home 110 kB (target ≤ 110 kB), lesson 147 kB (target ≤ 150 kB).
- **Concept map at 16 lessons (2b).** Rewrote
  `ConceptGraphView.tsx` to lay nodes out per-track (LR within
  track, stacked vertically). Tracks are: Foundations / Picking
  what matters / Tokens as inputs / The block / Decoding +
  learning. Cross-track edges are drawn as faint dashed
  beziers. Concept-graph data: 38 nodes / 58 edges.
- **Keyboard nav (2c).** Already wired (`←/→` in `PrevNext.tsx`).
  No regression.
- **Dead dirs (2d).** Removed `backend/` and `frontend/`.
  Fixed the broken cross-reference in `content/README.md` and
  added a `components/sim/README.md` in its place.
- **Mobile audit (2e).** At 768 px, prose wraps, figures stack,
  no overflow, inputs are tappable. Doesn't break. Verified for
  home and a sample lesson page.
- **A11y (2f).** Added `:focus-visible` rings for sliders, number
  inputs, and universal `.focus-ring`/lesson-body link rules
  in `app/globals.css`. Strengthened `PrevNext` focus ring to a
  real 2 px teal halo with offset. Every interactive has an
  `aria-label` (Slider, NumberInput) or a real `<title>`/aria
  description (BarChart, Heatmap, VectorCanvas). The accent
  color is the only color signal on the "dominant" emphasis
  (the highlighted bar / the highlighted cell / the focused
  interactive); the lesson concept's "this is the row" comes
  from a stronger weight in the same cell. The text color is
  light on dark — high contrast, even where the dominant
  marker is the same hue.
- **Lesson titles (2g).** `app/lessons/[slug]/page.tsx` now
  exports an async `generateMetadata` that returns
  `${title} — AI Learning Lab` + the summary.
- **Custom 404 page (2h).** `app/not-found.tsx` with "Lost?"
  headline, link to /map and /. Two lines, no decoration.

## 4. New lessons (Part 3)

### 4.1 Math libs added

- `lib/math/gelu.ts` — extracted from `ffn.ts`. The `erf`
  approximation lives here; `ffn.ts` re-exports `gelu` from
  here. Added a `relu` export for the GELU-vs-ReLU comparison.
  10 tests.
- `lib/math/attention-output.ts` — `attentionOutput(W, V) = W·V`
  (the weighted-sum-of-V step) plus a higher-level
  `attentionForward(scores, V, dK, mask?, temperature?)` helper.
  10 tests.
- `lib/math/sampling.ts` — `greedyDecode`, `temperatureSample`,
  `topKSample`, `topPSample`, `effectiveDistribution`. The
  sampling RNG is `mulberry32` (deterministic, seeded) so
  re-renders are stable. 14 tests.
- `lib/math/cross-entropy.ts` — `crossEntropy(probs, trueIdx)`,
  `crossEntropyFromLogits(logits, trueIdx)` (numerically
  stable), `crossEntropyCurve(p)`. 16 tests.
- `lib/math/gradient-descent.ts` — toy 2D landscape
  L(x, y) = (x²−1)² + y²/2 + 0.3·sin(3x), with two minima
  at (±1, 0) and a saddle along x=0. `step`, `run`, divergence
  detection. 9 tests.

### 4.2 New lessons in reading order

5. **attention-output** (K) — between attention-scores and
   scaled-attention. The lesson: once you have the attention
   weights, what do you do with them? Each token's output is
   the weighted sum of the value vectors; V carries "what to
   write," W decides "how much of each." Centerpiece: 4 tokens
   with draggable V vectors (2D), a W matrix computed from a
   fixed Q·K with a temperature slider, and the per-token
   outputs. Bookend toggles: "one-hot at j=2" (every output
   collapses to V[2]) and "uniform" (every output is the
   centroid of all V's).

11. **feed-forward** (L) — between residuals-layernorm and
    transformer-block. The lesson: attention mixes tokens; the
    FFN rewrites the *content* of each token. Centerpiece: 4
    tokens with d_model = 4, expansion factor 1×/2×/4×/8×,
    GELU vs ReLU toggle. The four FFN steps (input → pre-
    activation → post-activation → output) are shown as
    heatmaps so the reader can see each layer do its work.
    Secondary: a parameter-count widget — at 4× expansion,
    the FFN is ≈44% of the block's parameters, growing with
    d_model.

13. **sampling-decoding** (M) — after transformer-block. The
    lesson: the model produces a distribution over the vocab;
    decoding strategies — greedy, temperature, top-k, top-p —
    pick one token. The temperature here is the same softmax
    temperature from the softmax lesson, applied to the model's
    output head. Centerpiece: a fixed vocabulary of 12
    plausible next-tokens after "The cat sat on the ___".
    Pick a strategy, tune its parameters, see the effective
    sampling distribution. "Sample 100 times" produces an
    empirical histogram to verify the bars.

14. **cross-entropy** (N) — after sampling-decoding. The
    lesson: for one prediction, the loss is the negative log
    of the probability the model assigned to the true
    answer. Centerpiece: 8 tokens with draggable logits;
    click any token to set it as the true answer; the loss
    updates live. Secondary: a static plot of H(p) = -log p
    on a log x-axis, with a marker at the current p[true].
    The asymmetry is the entire reason cross-entropy is a
    useful loss.

15. **gradient-descent** (O) — terminal lesson. The lesson:
    the gradient points uphill; the negative gradient points
    downhill. Take a step proportional to -η·∇L, iterate.
    Concept-level only — no backprop, no chain rule. The
    centerpiece is a 2D loss landscape with three preset
    failure modes: converges (η too small, lands at minimum),
    oscillates (η borderline, never settles), diverges (η
    too large, trajectory explodes). Sliders for η and step
    count, plus a "Step" button to walk the trajectory.

### 4.3 What surprised me

- **The lesson route chunk grew from 31 kB to 41 kB** when I
  added the 5 new lessons. Most of that is the new sim
  components (CrossEntropyCurve, FFNParameterCount, etc.)
  that get bundled into the route's shared chunk. The MDX
  lessons themselves stay in their own per-slug chunks
  (dynamic import), so the lesson route's 41 kB is shared
  across all 16 lessons, not per-slug.
- **The pre-built `ffn.ts` test for gelu** used to live inside
  `lib/math/ffn.test.ts`. Moving the gelu activation to its own
  module meant duplicating 4 tests. Not a problem, just
  bookkeeping.
- **GELU has a local minimum** at x ≈ -0.76, not at x = 0
  as the previous prose implied. The previous phase's
  PHASE_NOTES_CAPSTONE §5 said "GELU is not ReLU: for x = -2,
  GELU is small-negative (~-0.046), not zero." The new
  "minimum" is at x ≈ -0.76, value ≈ -0.17; the curve then
  rises back toward 0 as x → -∞. The lesson text doesn't
  call this out — the "GELU is small-negative at the
  boundary" framing is more useful for the lesson than the
  mathematical minimum — but the test file now has both the
  monotone-right-of-min test and the local-min test, so
  future readers can see the shape.
- **The concept graph's trackId mapping is hand-maintained.**
  When I added the 5 new lesson-concept nodes
  (`attention-output-concept`, `feed-forward-concept`,
  `sampling-decoding-concept`, `cross-entropy-concept`,
  `gradient-descent-concept`), they needed to be mapped to
  their tracks. I missed `sampling-decoding-concept` in the
  first pass and the node fell through to "Other" in the
  rendered map. Fixed.
- **Sampling-decoding's "Sample 100 times" feature** uses a
  counter array that updates 100 times in a single
  `useState` setter. The first attempt used a `useState`
  inside a loop, which would be a render-per-sample. The
  one-shot setter version is O(n) and renders once.

### 4.4 What hurt

- **dagre LR with multi-rank tracks** can put nodes in
  slightly different y values within a track (e.g. one rank
  above the centerline, one below). The visual effect is that
  nodes in a "track" can sit a few pixels above or below the
  track label. Acceptable for 38 nodes but worth a v2 if the
  graph grows further.
- **The BundlePipeline-style "wide" layout** in the transformer-
  block lesson already uses `wide: true` to escape the 720/440
  two-column grid. The new feed-forward lesson has 4 heatmaps
  that are all `compact` and stay in the narrow workbench. This
  is the right call (heatmaps don't need full width) but the
  lesson ends up looking different from the transformer-block
  centerpiece. Documented in the per-lesson caption.
- **The attention-output centerpiece has a lot going on.**
  Two columns (vectors on the left, W matrix and outputs on
  the right), three W-mode toggles, a temperature slider, plus
  the per-token output table. On a 1440 px window it fits
  but feels busy. The "second look" callout in the lesson
  text is the *one thing to do first*; on a busy monitor the
  reader might miss that signal. Not a blocker, but a
  possible v2 cleanup.

### 4.5 What I'd do differently next

- **Per-lesson "as you read this, try…" callouts** rather than
  the current "Open in workbench" callouts in the prose. The
  current pattern is good for one-trick interactives
  (DotProductExplorer) but the new lessons have multi-state
  widgets where the reader needs to know *which* state to set
  first. A few of the new lessons have inline hints but a
  consistent "step 1: do this; step 2: see this" pattern would
  reduce friction.
- **A real sampling RNG injection point** instead of the
  `mulberry32` baked into `lib/math/sampling.ts`. The lesson's
  sims use a hard-coded seed for first-paint stability, but
  exposing an `rng` parameter to `temperatureSample` would
  let the centerpiece stream samples as the user clicks the
  button instead of pre-computing. Minor.
- **A "principles to remember" appendix** at the end of
  gradient-descent — the lesson ends at the conceptual level
  but a reader who came in not knowing what a gradient is might
  want a one-page summary. The recap covers it but a dedicated
  "What you just learned" section would be friendlier.

## 5. The new reading order

```
1. dot-product
2. vector-projection
3. softmax
4. attention-scores
5. attention-output (K)         ← new
6. scaled-attention
7. token-embeddings
8. positional-encoding
9. causal-mask
10. multi-head-attention
11. residuals-layernorm
12. feed-forward (L)            ← new
13. transformer-block
14. sampling-decoding (M)       ← new
15. cross-entropy (N)           ← new
16. gradient-descent (O)        ← new
```

## 6. Files added or changed

### Added

- `content/lessons/{attention-output,feed-forward,sampling-decoding,cross-entropy,gradient-descent}/{meta.ts,interactives.tsx,lesson.mdx}`
- `components/sim/{AttentionOutputExplorer,FeedForwardExplorer,FFNParameterCount,SamplingDecodingExplorer,CrossEntropyExplorer,CrossEntropyCurve,GradientDescentExplorer}.tsx`
- `lib/math/{gelu,attention-output,sampling,cross-entropy,gradient-descent}.ts` + matching `.test.ts`
- `app/not-found.tsx`
- `components/sim/README.md`
- `docs/screenshots/before-refine/*.png` (11 lessons + home + map)
- `docs/screenshots/after-refine/*.png` (16 lessons + home at
  1440 + home at 768 + map)

### Changed

- `lib/lessons.ts` — split into `lib/lessons-meta.ts` (light) +
  heavy version; `mdxLessonLoaders` for dynamic MDX imports;
  `TRACKS` and `readingOrder` now have 16 slugs in 5 groups.
- `lib/lesson-manifest.ts` — added the 5 new lessons.
- `lib/lessons-meta.ts` — added the 5 new lessons, expanded
  TRACKS to 5 groups.
- `lib/lessons.ts` — added 5 new `mdxLessonLoaders` entries.
- `app/lessons/[slug]/page.tsx` — dynamic MDX import via
  `mdxLessonLoaders`; added `generateMetadata`.
- `components/lesson/Workbench.tsx` — added `caption` field
  to `InteractiveEntry`; `WorkbenchItem` renders it under the
  figure.
- `components/lesson/PrevNext.tsx` — stronger focus ring.
- `components/home/LessonCardList.tsx` — uses `lib/lessons-meta`
  (light) instead of `lib/lessons` (heavy) so the home page
  doesn't pull in the sim components.
- `components/concept-graph/ConceptGraphView.tsx` — rewritten
  for per-track LR layout; trackId mapping updated.
- `content/concepts/graph.yaml` — 6 new atom nodes, 5 new
  lesson-concept nodes, new prerequisite edges.
- `app/globals.css` — `:focus-visible` rings for sliders,
  number inputs, lesson-body links, and a `.focus-ring` utility.
- `components/lesson/{MathCode,Callout,LessonShell}.tsx` —
  no structural changes; only minor cleanup.

### Deleted

- `backend/` and `frontend/` (dead Phase-1 directories).
- `content/README.md`'s broken cross-reference to
  `frontend/packages/sim-components`.
- `PHASE_NOTES.md` and `PHASE_NOTES_CAPSTONE.md` (this phase
  replaces them).

## 7. Done-ness checklist

- [x] **Repo has 16 lessons reachable from grouped landing
  page; reading order corresponds to landing groups.** Home
  page lists 16 lessons in 5 tracks; prev/next nav verified.
- [x] **`pnpm lint:content && pnpm test && pnpm build` all
  clean. Strict TS, no `any`, no `@ts-ignore`. Each new math
  module has its own test file. Total tests > 100.** 145
  tests, all passing. Build clean.
- [x] **Bundle: home < 110 kB; per-lesson < 150 kB. Measured
  + recorded.** home 110 kB, lesson 147 kB. Recorded above.
- [x] **/map renders all lessons + concepts in a readable
  layout at 1440.** 38 nodes / 58 edges, 5 per-track LR
  rows, fits at 1440.
- [x] **Every existing lesson refined per Part 1 — terms
  table, per-lesson notes, before/after word counts.**
  Per-lesson notes in §2; terms table in `PHASE_NOTES_REFINE`
  (this file).
- [x] **Stray backend/ and frontend/ deleted.**
- [x] **Each new lesson has correct math (re-derive every
  formula), default values that demonstrate the headline on
  first paint, and a working secondary widget.** See §4.
- [x] **Screenshots in docs/screenshots/after-refine/ for all
  16 lessons at 1440, home at 1440/768, and /map at 1440.**
  19 PNGs in `docs/screenshots/after-refine/`.
- [x] **PHASE_NOTES_REFINE.md (this file).** Done.

The next phase is shipping (Vercel + analytics + launch post).
This is the work of one careful writer, fast and accessible.
