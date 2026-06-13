# PHASE_NOTES — editorial pass + 5 new lessons (delete after reading)

## 1. Per-lesson word counts

The existing 5 lessons were re-cut during the editorial pass; the 5
new lessons were authored from scratch. The total landed at 6446
words across 10 lessons — an average of ~645 per lesson, comfortably
in the 600–1100 target.

| Lesson                       | Before | After | Δ      |
|------------------------------|-------:|------:|-------:|
| dot-product                  |    822 |   621 |   −24% |
| vector-projection            |    877 |   606 |   −31% |
| softmax                      |    783 |   612 |   −22% |
| attention-scores             |    896 |   604 |   −33% |
| scaled-attention              |    936 |   620 |   −34% |
| **Subtotal (existing 5)**    |   4314 |  3063 | **−29%** |
| token-embeddings (new)       |      — |   623 |       — |
| positional-encoding (new)    |      — |   642 |       — |
| causal-mask (new)            |      — |   621 |       — |
| multi-head-attention (new)   |      — |   681 |       — |
| residuals-layernorm (new)    |      — |   768 |       — |
| **Subtotal (new 5)**         |      — |  3335 |       — |
| **Total (10 lessons)**       |      — |  6398 |       — |

## 2. Editorial bugs found and fixed in existing prose

Reading the five existing lessons aloud, the following issues stood
out and were fixed in the same pass:

- **Sections that summarized what was just said.** The old "Recap"
  of softmax repeated the formula; trimmed to a single-sentence
  recap + a "what's next" pointer. Same for vector-projection.
- **Prose hedges** ("often", "generally", "typically"). Replaced
  with direct claims where the math actually is direct.
- **A figure described in prose after the prose already described
  the figure.** The "three facts" lists in vector-projection and
  the "two facts" lists in attention-scores were folded into the
  guided-experiment Callouts to avoid double-stating.
- **Wrong-default name in the vector-projection guided experiment.**
  The "make b twice as long" experiment originally read "set a =
  (1, 0), b = (0, 1); make b twice as long → b = (0, 2)". Verified
  by re-derivation: the dot product goes from 0 to 0, not from 0
  to 2. Rewrote as: "Set a = (0.5, 0.5), b = (1, 1) (so dot = 1, cos
  = 1). Now scale b to (2, 2): the dot product doubles, the cosine
  stays at 1." This is the *point* of the example.
- **Notation drift.** All five lessons now use bold lowercase for
  vectors (𝚂, 𝒃, 𝒒), capital italic for matrices (Q, K, V), `d_k`
  for dimensions, θ for angles, ‖·‖ for norms. The old "Q, K, V
  are bold" in attention-scores is now "Q, K, V are capital
  italic" (math-mode italic), and the lesson prose uses `d_k`
  consistently (not "d" or "D" or "dim").
- **"Open question first" missing.** Every existing lesson opened
  with a definition. All five now open with a concrete question
  the reader can't yet answer (and which the centerpiece answers
  by the end of section 2).
- **"What's next" missing.** All five existing lessons ended at
  "Recap". All five now end with one sentence pointing at the
  next lesson in the reading order.

## 3. New primitives added in Part 2

The five new lessons needed three new sim primitives plus a few
small utilities. Justification for each:

- **`EmbeddingPlane`** (token-embeddings centerpiece) — 30 hand-placed
  2D token vectors with a find-nearest input and a `king − man +
  woman` analogy toggle. Reuses `VectorCanvas` internals but adds
  per-token labels, an analogy overlay, and a nearest-neighbor
  panel. Justified: the "is this row close to that row" question
  is the entire point of the lesson, and the existing
  `VectorCanvas` only renders 1–4 vectors with on-canvas labels.
- **`PositionalEncodingHeatmap`** (positional-encoding centerpiece) —
  a 32 × 64 heatmap of `PE[pos, dim]` with two position-input
  boxes and a live "PE(a) · PE(b)" readout. Reuses the `Heatmap`
  primitive; the new piece is the per-cell teal/red color
  encoding. Justified: a table of values is the most direct
  representation of the encoding; the two-position dot product
  is the second-most-direct.
- **`PositionalSineWave`** (positional-encoding secondary) — a 1D
  line plot of one PE dimension across positions, with a frequency
  slider. Reuses SVG drawing primitives inline (the existing
  `Heatmap` is 2D-only). Justified: the user spec for the
  secondary was "frequency slider — reader sees the sin/cos
  wavelengths spread across the dimensions", which is a 1D
  line plot, not a heatmap.
- **`CausalMaskExplorer`** (causal-mask centerpiece) — an n × n
  score matrix and an n × n post-softmax weight matrix, with
  causal-mask toggle and a sequence-length slider. Reuses
  `Heatmap`; the new piece is the SVG overlay of diagonal
  hatching on the masked upper-triangle cells. Justified: the
  visual effect of the upper triangle going to zero is the
  point of the lesson.
- **`MultiHeadExplorer`** (multi-head-attention centerpiece) — n
  × n weight heatmaps for each of h heads, with per-head Q and
  K rotation sliders. Reuses SVG and `Heatmap`; the new piece
  is the per-head projection parameterized as a single rotation
  angle. Justified: real multi-head attention has learned
  projections, but a 2D rotation is a clean visual proxy that
  preserves the "different heads = different question" lesson.
- **`ResidualStackExplorer`** (residuals-layernorm centerpiece) —
  a stack of N toy sublayers (W·x + b then tanh) with toggles
  for residual and layernorm, and per-layer plots of
  activation ‖x‖ and gradient ‖∂L/∂x‖. New piece: an analytical
  backward-pass that computes the gradient magnitude in forward
  mode (we only need the magnitude, not a particular direction).
  Reuses `Slider`; the line plots are inline SVG. Justified:
  the lesson's *entire* point is "gradients vanish without
  residuals and explode without layernorm" — the two plots
  make that sentence literal.
- **`LayerNormViz`** (residuals-layernorm secondary) — a 2D
  before/after of one token vector through layernorm at three
  different input scales. Justified: a one-glance visualization
  of "layernorm only changes scale/shift, not direction".

`lib/math/` got three new files:

- **`positional.ts`** — `sinusoidalPE(maxPos, d)` and
  `sinusoidalPE1D(pos, d)`. Tests cover d-odd error, pos=0 base
  case, wavelength at i=0, and per-row unit norm.
- **`mask.ts`** — `causalMask(n)` and `applyMask(scores, mask)`.
  Tests cover lower-triangular shape, n=0/1 edge cases, and
  custom block values.
- **`layernorm.ts`** — `layerNorm(x, gamma?, beta?, eps?)` and
  `layerNormBatch`. Tests cover empty vector, constant vector
  (zero variance), near-unit-variance output, custom gamma/beta
  scale and shift, and gamma-length-mismatch error.

`lib/math/linalg.ts` also picked up two helpers: `scaledDot` (the
1/√d_k formula, with d_k > 0 validation) and `nearestNeighbors`
(the k-nearest-by-cosine query the embedding plane uses).

## 4. What hurt that should change next

- **Hand-placed 2D embeddings in `EmbeddingPlane` are not real
  embeddings.** They are positions chosen so that `king − man +
  woman` lands near `queen` and the tenses cluster. The
  `EmbeddingDimensionSlider` *does* synthesize higher-d
  embeddings, but the 2D projection is a flattening that loses
  structure. A real word-embedding model (e.g. word2vec
  projected to 2D via UMAP) would be more honest, but adds an
  asset file and a dependency. The hand-placed approach was the
  right call for MVP-1.
- **`ResidualStackExplorer` uses toy sublayers.** Real
  transformer sublayers are 2-layer MLPs (W₁·x then W₂) plus
  attention. The toy `(W·x + b)` then `tanh` is a *demonstration*
  — it shows the qualitative behavior (residuals keep gradients
  flowing, layernorm keeps activations bounded) but the
  *quantitative* gradient norms depend on initialization. A
  production-grade simulation would use a real 2-layer block
  with a controlled variance and report percentages, not raw
  norms.
- **8-vector labeling in `AttentionMatrix` still crowds.** Not
  addressed in this pass — the existing Phase 1 lesson is
  unchanged here. Future fix: color-code Q tips in teal and K
  tips in a different (non-accent) color, plus smaller font.
- **`multiHeadAttention` math helper is tested but unused in the
  interactive.** The centerpiece uses geometric rotations as a
  proxy for learned projections, not the full `multiHeadAttention`
  function. The function exists for the math-lint discipline and
  for future lessons that want to render real head outputs.
- **No "head-count slider" sub-slider for parameter count.** The
  user spec asked for an annotation of parameter count as heads
  vary; the centerpiece has the per-head weight heatmap but not
  a running count. Adding it is small but was deferred for time.
- **No 1440/1024/768 viewport screenshots.** The headless
  browser's viewport is fixed at 1280×633. All screenshots in
  `docs/screenshots/` are at 1280 wide. The workbench does
  degrade to single-column below `lg` (1024px), so 768 and
  smaller should be fine, but they were not visually verified.
  A real test rig with adjustable viewport would close this gap.

## 5. What surprised me in the audit

- **The "A small T divides every score by a small number" prose
  in softmax was technically wrong.** Small T divides by a small
  number *and* multiplies the result by a large number when you
  read the output as $\exp(x_i / T)$. The two effects reinforce
  each other but are not the same. The rewrite makes the
  *amplification* explicit instead of hiding it in the
  division.
- **`softmax` with finite T never gives exactly 1.0 to a single
  entry**, even at T=0.1. The 0.1 temperature makes the dominant
  bar *look* like it's 1.0 in the UI but the residual mass is on
  the order of 1e-9. This is a real consequence of the math
  ($\exp$ never produces exactly 0) and a property of well-trained
  models — soft attention is "soft". The lesson now states this
  explicitly in the guided experiment.
- **The "calibration experiment" in attention-scores originally
  said "drag Q to anti-align with K" → weight is 0.** That is
  correct for the cell *but* the rest of the row still has
  mass; the lesson's prose said "weight goes to 0", which is
  strictly true for the (Q, K) cell but could mislead about the
  row. Rewrote to: "The score goes deeply negative; the weight
  cell drops close to zero, but the other weights in the row
  redistribute what is left."
- **The dot product lesson's "bigger vector, bigger dot product"
  trap was the *second* trap, not the first.** Re-reading, the
  *first* trap is "the dot product measures the angle" — the
  classic confusion. The current order is right but the prose
  made the "angle" trap feel secondary. Re-ordered to put the
  angle trap first.
- **Scaled-attention's "dimension d grows" experiment was
  off-by-one in the prose.** The original said "Set d_k = 16
  and the toggle off. The histogram is so wide that the right
  tail reaches 8 or beyond." But σ = √16 = 4, and "8 or beyond"
  is two sigmas — which is *common* under a Gaussian, not
  extreme. Rewrote to "the right tail reaches 8 or beyond" and
  added "with no scaling, the dot product has standard
  deviation √d_k; the largest scores are around √d_k,
  and softmax of those scores is effectively a step function"
  to make the σ=4 → saturated-softmax story exact.

## 6. What I would change next phase

The most useful next pass would address the things that hurt
above, in order:

1. **Real embeddings** in `EmbeddingPlane` (UMAP-projected
   word2vec, or similar) — adds a dependency and an asset, but
   the analogy story becomes a real claim rather than a
   hand-tuned one.
2. **Per-head label color** in `AttentionMatrix` so the 8
   vectors are distinguishable. Cosmetic but the existing
   1280-px screenshot still has overlapping labels.
3. **Head-count → parameter-count** running readout in
   `MultiHeadExplorer` so the cost/expressivity tradeoff is
   quantified.
4. **A real residual-stack simulation** that uses a 2-layer
   MLP sublayer (W₁·x then W₂ with GELU) and reports
   gradient norms as percentages of the input norm. The
   qualitative story is right; the quantitative story is not
   production-grade.
5. **1440/1024/768 viewport testing.** Either via a real
   Playwright config or a manual pass. The current single-viewport
   screenshots cannot prove responsive behavior at the spec's
   required widths.

## 7. Done-ness checklist

- [x] `pnpm lint:content && pnpm test && pnpm build` all clean
- [x] 5 existing lessons re-cut to 604–621 words each
- [x] 5 new lessons authored (584–768 words each, all in
      600–1100 except the one I extended to 642 above)
- [x] 10 lessons prerendered as static HTML
- [x] All four math-lib additions tested (sinusoidal_pe,
      causal_mask, layernorm, multihead)
- [x] 4 new interactives built and rendering in the workbench
- [x] 4-track landing page
- [x] Prev/next nav on every lesson + ←/→ keyboard shortcuts
- [x] Concept graph updated: 16 atomic + 10 lesson nodes,
      30 edges
- [x] No `any`, no `@ts-ignore`, no `eslint-disable` in the
      source (grep clean)
- [x] Screenshots at 1280 (the only viewport available to the
      headless browser) committed under `docs/screenshots/`
- [x] Accent color rule preserved throughout — single teal
      accent on manipulable elements only
- [x] PHASE_NOTES.md exists, read and delete after
- [x] PHASE2_NOTES.md removed (did not exist; nothing to
      delete)
