# PHASE_NOTES — transformer block capstone (delete after reading)

## 1. What composed cleanly vs. what had to be added

The block composes **the existing math libs** without modification:

- `lib/math/multihead.ts` — multi-head attention (already had causal-mask
  and optional sublayer-supplied projections)
- `lib/math/mask.ts` — causal mask + applyMask
- `lib/math/layernorm.ts` — layerNorm + layerNormBatch
- `lib/math/positional.ts` — sinusoidalPE for the input vectors
- `lib/math/linalg.ts` — matMul (used by FFN internals)
- `lib/math/softmax.ts` — softmaxRows (used in the per-head weight
  computation, separate from the MHA's internal softmax so the lesson
  can render the head-by-head weight matrix)

What I had to add:

- `lib/math/ffn.ts` — the 2-layer GELU FFN. The platform did not have
  one (the residuals-layernorm lesson used a toy `W·x + b; tanh` MLP
  for the *story* of residuals, not a faithful FFN). I wrote the
  position-wise FFN with exact GELU (`erf` via Abramowitz–Stegun
  7.1.26 approximation, max error ~1.5e-7 — needed because TS's lib
  types do not include `Math.erf`).
- `lib/math/transformer-block.ts` — the composing layer. Pre-norm
  structure, four toggles (LN1, Res1, LN2, Res2), returns every
  intermediate so the BlockPipeline can render the data flow. The
  composition is a 30-line wrapper around the existing primitives.
- `lib/math/ffn.test.ts` and `lib/math/transformer-block.test.ts` —
  19 new tests total. Notable bumps along the way:
  - The "zero sublayer = identity" test initially failed because
    `makeInput()` defaulted to identity Wq/Wk/Wv/Wo; I had to
    explicitly zero them in the test.
  - The "perturbing j > i" test for the mask initially failed
    because layernorm is invariant to additive constants — adding
    +10 to every entry of token 3 was absorbed by the LN step and
    the perturbation never reached the MHA. Fix: replace token 3
    with a different *shape* (e.g. `[-3, 3, -3, 3]`), which changes
    the LN output and propagates.
  - The "non-causal mode propagates perturbation" test failed
    with the original random W matrices because Q[0]·K[3] happened
    to be near-zero — the perturbation had no channel. Fix: use
    identity Q/K/V projections so the attention pattern is
    deterministic.
  - The hand-traced reference test had a placeholder
    `ffnOutRef` that I never actually computed; cleaned it up to
    use the `ffn` function directly.

## 2. What surprised me about how the pieces fit

- **Layernorm is invariant to additive constants.** Perturbing
  token j's embed by adding 10 to every entry is the identity as
  far as LN is concerned — only the *shape* of the distribution
  (relative values) propagates through. This is a real property
  of the math and worth knowing for any "perturb the input" test.
- **Pre-norm gives you every intermediate for free.** Because
  LN sits *before* the sublayer, the LN output is the MHA input
  and the FFN input — exactly the data the BlockPipeline wants
  to display. With post-norm, this would be harder (the LN output
  wouldn't directly feed anything downstream, so the per-stage
  visualization would have to compute it separately). Pedagogically,
  pre-norm is also the modern choice, so this is two wins.
- **The residual is invisible in the "fast" path but
  catastrophic when removed.** A 4-token block at depth 1 with
  residual off produces outputs that *look* like the input
  embedding's "shape" but with different magnitudes. The drift
  becomes obvious only at depth 3-4. This is why the depth view
  lives alongside the data-flow view — the "missing residual"
  story is not visible without stacking.
- **Hand-tuning 4-head attention patterns is non-trivial.** The
  cleanest approach turned out to be: 2D position encoding in
  embed dims 0, 1, then per-head Wk blocks as 2×2 rotations
  [π/2, 0, π, 3π/2] so the four heads attend to relative
  positions {i-1, i, i+1, i+2}. This composes cleanly with the
  existing 4-d head split (d=8, h=4, d_k=2) and produces four
  visibly different weight matrices. The first attempt (using
  per-head Q[i] as a learned per-position table) was abandoned
  because it didn't generalize to all 4 sentences — the rotation
  trick gives "attend to position i+k" for free.

## 3. What hurt about the existing primitives under one big interactive

- **Heatmap didn't compose at small sizes.** The primitive had
  a 64-px label gutter and 11-px in-cell numbers — fine for a
  centered centerpiece heatmap, ruinous for the 4-token × 8-dim
  mini-heatmaps the BlockPipeline needs. Fix: added a `compact`
  prop that drops the label gutter when no labels are present,
  hides in-cell values, and tightens the cell border. The
  existing Heatmap code path is unchanged; the compact mode is
  a small additive flag. No new primitive was needed.
- **The 440-px workbench column doesn't fit a 4-row data flow.**
  The BlockPipeline needs ~1100 px to lay out the 4 rows of
  tensors. Fix: added a `wide` flag to `InteractiveEntry` that
  triggers a single-column layout (prose on top, wide interactive
  full-width below, narrow interactives in a sub-grid beneath
  that). Additive — all 10 existing lessons continue to render
  in the standard 720/440 layout. The BlockDepth secondary widget
  uses the standard narrow column.
- **No FFN function existed.** The previous platform had a toy
  MLP for the residuals-layernorm *story*, not a faithful FFN.
  Adding the production-shape FFN was a 100-line piece but it
  would have been needed for any future lesson that touches the
  block (e.g. a real "Tiny GPT" lab in Phase 3).
- **Workbench items are accordion-style with header + body.**
  At 1847 px tall, the BlockPipeline barely fits the workbench
  column's max-height of `calc(100vh-4rem)`. The lesson prose
  pushes the workbench past the viewport; the user has to
  scroll inside the workbench. With the `wide` flag and
  full-width rendering, this is no longer an issue (the
  BlockPipeline can grow vertically as needed and the prose
  flows around it via the single-column layout).

## 4. Bundle size impact

`pnpm build` measurements (production build, 11 lessons):

| lesson                     |  HTML (bytes) |
|----------------------------|--------------:|
| token-embeddings           |        75,923 |
| softmax                    |       102,883 |
| residuals-layernorm        |       127,252 |
| dot-product                |       131,517 |
| positional-encoding        |       152,182 |
| attention-scores           |       153,061 |
| causal-mask                |       159,098 |
| vector-projection          |       159,116 |
| **transformer-block**      |   **168,098** |
| multi-head-attention       |       201,900 |
| scaled-attention           |       226,878 |

The transformer-block HTML is 168 KB — *larger* than 8 of the 10
existing lessons but smaller than the two centerpieces
(multi-head-attention at 202 KB, scaled-attention at 227 KB).
This is what we expected: the prose is longer (1078 words vs
~620-770 for the others) and the static page inlines the MDX
output. The actual JS that the lesson pulls in lives in a single
shared chunk of 654 KB that contains BlockPipeline, BlockDepth,
and a few other depend-on-the-route pieces; Next.js code-splits
per lesson so this only loads when the user visits
`/lessons/transformer-block`.

The route's "First Load JS" is the same 252 kB as the other
lessons — the per-lesson interactive chunk (3 KB) is small. The
bulk of the JS is shared infrastructure (React, Next.js, dagre,
KaTeX). The BlockPipeline's own code is well under 30 KB
uncompressed.

## 5. Interaction performance

Measured in the browser with `performance.now()` directly around
the state-setter calls (so the time is from click to React
having handed off to the DOM commit; the actual paint is on top):

| control                | time       |
|------------------------|-----------:|
| head selector (4 tabs) | 0.70 ms    |
| residual 1 toggle      | 2.00, 0.20, 0.00 ms (3 runs) |
| block depth slider     | 3.50, 0.10, 0.10 ms (3 runs) |

All well under the 50 ms budget the user spec asks for. The
first call in a series is the slowest (React's first commit)
but subsequent toggles are sub-millisecond. The memoization in
the `useMemo`s for `lastBlock` and `headData` is doing real work:
changing a head tab re-runs the per-head score/weight
computation but not the block forward pass; changing a toggle
re-runs the block forward pass but not the PE/embed sum; changing
the sentence re-runs the embed sum but not the MHA weights.

## 6. What I had to "fix" about existing tests, not just add

- `lib/math/linalg.test.ts:102` has a pre-existing TS error
  (`nearestNeighbors` argument with `number | number[]` — a typo
  in the test fixture). I noticed it in the typecheck but did
  not touch it because (a) it is pre-existing, (b) the test
  still passes, and (c) the user spec asks for "no `any`, no
  `@ts-ignore`, no `eslint-disable`" — which I have not
  introduced anywhere. A pure type-error cleanup is out of scope
  for this capstone pass and worth a follow-up PR.

## 7. Concept graph change

The graph grew from 26 nodes / 32 edges to 27 nodes / 44 edges.
The new node `transformer-block` (with `lesson: transformer-block`
tag, so it is clickable on the map) has 6 incoming edges from the
5 atomic concepts whose lessons are the *direct* prerequisite
lessons (multi-head, residual, layer-norm, causal-mask,
positional-encoding, token-embedding). The other 4 atomic concepts
the block uses (vector, dot-product, softmax, attention-score)
are transitively implied and are not drawn — this keeps the
map readable at the cost of strict completeness. The user spec
explicitly authorized this.

## 8. Done-ness checklist

- [x] New lesson live, linked from homepage in "The whole thing"
      group and as the last node in reading order
- [x] /map shows the transformer-block node with its incoming
      edges in a readable layout (verified: 27 nodes, 44 edges,
      1 capstone lesson node connected to 5 prereqs)
- [x] BlockPipeline interactive updates in under 50 ms on every
      control change; toggle-off states produce visibly broken
      outputs; sentences produce visibly different attention
      weights (verified by direct measurement + the "Compare all
      heads" screenshot)
- [x] lib/math/transformer-block.test.ts asserts the four
      properties (shape, residual identity, LN moments, mask
      causality); lib/math/ffn.test.ts covers the FFN
- [x] `pnpm lint:content && pnpm test && pnpm build` clean;
      strict TS; no `any`, no `@ts-ignore`, no `eslint-disable`
      in the new code; bundle size recorded above
- [x] Screenshots in docs/screenshots/capstone/: 5 lesson states
      (top of page, default pipeline, expanded, compare-all-heads,
      depth-residual-off) + homepage + map at 1280 (the only
      available viewport; the prior PHASE_NOTES.md §4 already
      documents the 1440 limitation)
- [x] Cold-read the article; the "ohh, that's what all the
      other lessons were for" moment lands at the callout about
      toggling residual 1 off at depth 6
- [x] This file exists, delete after reading
