# Sim components

Each lesson's centerpiece is a React component in this directory.
They are client components (`'use client'`) and import their math
from `lib/math/`.

- `primitives/` — small reusable visual primitives:
  - `SimFrame` (the standard sim card: border, padding, title row,
    optional Reset / headerAction — every sim wraps in this)
  - `Slider` (range input with custom-styled track + thumb)
  - `NumberInput` (deferred-clamp number input, arrow-key nudges)
  - `BarChart` (SVG bar chart with accent-color dominant bar)
  - `Heatmap` (SVG heatmap with diverging / accent colormap)
  - `VectorCanvas` (2D draggable-tip plane, used as the foundation
    of every vector playground; tips are keyboard-focusable — Tab to
    a tip, arrow keys nudge, Shift+arrow for coarse steps)
- Composing sims (one per lesson's centerpiece or secondary):
  - `DotProductExplorer` — drag two vectors; live |a|, |b|, cos θ, a·b
  - `ProjectionExplorer` — drag two vectors; projection + residual drawn
  - `SoftmaxExplorer`, `ScoreEditor` — softmax lesson
  - `AttentionMatrix`, `AttentionTemperature` — attention scores
  - `CausalMaskExplorer` — mask on/off with sequence-length slider
  - `ScalingHistogram` — random d_k dot products, with/without √d_k
  - `MultiHeadExplorer` — n tokens × h heads with per-head rotations
  - `PositionalEncodingHeatmap`, `PositionalSineWave` — PE table + 1D
  - `EmbeddingPlane`, `EmbeddingDimensionSlider` — token embeddings
  - `ResidualStackExplorer`, `LayerNormViz` — residuals + layernorm
  - `BlockPipeline`, `BlockDepth` — the transformer block capstone

Conventions: every interactive takes a `preset` prop, uses `useMemo`
for derived state, and wraps in `<SimFrame title=...>`. Use the
`onReset` shorthand for a single muted Reset button; use
`headerAction={...}` when the title row needs toggle pills, a
segmented control, or multiple buttons.

Visual: the accent color (`#2DD4BF`) is reserved for things the
reader can manipulate — draggable tips, slider thumbs, dominant
bars, focused interactive cards. Static content never uses it.
