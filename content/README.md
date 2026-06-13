# Content Directory

This directory contains all lesson content for AI Learning Lab.

## 📁 Structure

```
content/
├── modules.yaml             # Module ordering, metadata, and dependencies
├── concepts/
│   └── graph.yaml           # All concept nodes + prerequisite edges
├── misconceptions.yaml      # Global misconception catalog
└── lessons/
    └── {module-number}-{module-name}/
        └── {lesson-number}-{lesson-name}/
            ├── lesson.mdx          # Main lesson content (MDX format)
            ├── lesson.yaml         # Lesson metadata and configuration
            ├── simulation.tsx      # React simulation component
            ├── notebook.ipynb      # Canonical Jupyter notebook
            ├── solution.ipynb      # Solution notebook (for exercises)
            ├── quiz.yaml           # Quiz questions with tagged distractors
            └── diagram.svg         # Static diagrams (optional)
```

## 📝 Content Types

### 1. `modules.yaml`

Defines the module structure and ordering:

```yaml
- id: foundations
  title: Foundations
  description: Python for tensors, NumPy, and mathematical building blocks
  order: 1
  lessons: [vector-basics, dot-product, gradients, ...]

- id: attention-transformers
  title: Attention & Transformers
  description: The core mechanisms of modern AI
  order: 4
  lessons: [self-attention, masking, multi-head, transformer-block]
```

### 2. `concepts/graph.yaml`

The concept graph defines all learnable concepts and their prerequisites:

```yaml
concepts:
  - id: dot-product
    title: Dot Product
    description: The sum of element-wise products of two vectors
    module: foundations
    micro_lesson: dot-product-001

  - id: softmax
    title: Softmax
    description: Normalizes a vector into a probability distribution
    module: neural-networks
    micro_lesson: softmax-001

edges:
  - prerequisite: dot-product
    concept: softmax
  - prerequisite: softmax
    concept: attention-score
```

### 3. `misconceptions.yaml`

Global catalog of misconceptions for LLM diagnosis (Tier 2):

```yaml
misconceptions:
  score-vs-weight:
    title: "Confusing Score with Weight"
    description: "Attention score is raw similarity; weight is softmax-normalized"
    module: attention-transformers

  forgot-softmax:
    title: "Forgot to Apply Softmax"
    description: "Outputs don't sum to 1 because softmax was omitted"
    module: neural-networks
```

### 4. Lesson Files

#### `lesson.mdx`

MDX format with embedded React components:

```mdx
# Self-Attention From Scratch

## What attention computes

Each token asks: "which other tokens matter to me?"

<MathCodeBlock>
  <Math>
    softmax(x_i) = \frac{exp(x_i)}{\sum_j exp(x_j)}
  </Math>
  <Code language="python">
    def softmax(x):
        e = np.exp(x - x.max())
        return e / e.sum()
  </Code>
</MathCodeBlock>

## Try it

<Simulation id="attention-matrix" />

Drag the temperature slider and watch the distribution sharpen.

<SyncBadge />

## Check understanding

<Quiz id="q-attn-3" />
```

#### `lesson.yaml`

Lesson metadata and sync configuration:

```yaml
id: attention-002
title: Self-Attention From Scratch
module: attention-transformers
prerequisites: [embeddings, dot-product, softmax]
concepts: [query, key, value, attention-score, attention-weight, causal-mask]
simulations: [attention-matrix, mask-toggle, head-compare]
notebooks: [numpy-attention.ipynb]
estimated_minutes: 35
sync:
  - variable: temperature        # Python variable name
    control: temperature-slider  # Simulation control ID
    type: float
    range: [0.1, 3.0]
    cell: cell-1                # Notebook cell ID
  - variable: mask_enabled
    control: mask-toggle
    type: bool
    cell: cell-2
```

#### `simulation.tsx`

React component for interactive simulation:

```tsx
import { useSyncStore } from '@ail/sync-engine';
import { Slider, Heatmap } from '@ail/sim-components';

export default function AttentionMatrixSimulation() {
  const { values, setValue } = useSyncStore();
  const temperature = values.temperature || 1.0;

  return (
    <div className="simulation">
      <Heatmap
        data={computeAttentionWeights(temperature)}
        labels={['The', 'cat', 'sat', 'down']}
      />
      <Slider
        id="temperature-slider"
        value={temperature}
        onChange={(v) => setValue('temperature', v)}
        min={0.1}
        max={3.0}
        step={0.1}
      />
      <SyncIndicator bindings={['temperature']} />
    </div>
  );
}
```

#### `quiz.yaml`

Quiz questions with misconception tags:

```yaml
- id: q-attn-3
  type: multiple-choice
  prompt: "Which values sum to 1 across a row of the attention matrix?"
  options:
    - text: "The attention scores"
      misconception: score-vs-weight        # Required on wrong options
    - text: "The attention weights"
      correct: true
    - text: "The value vectors"
      misconception: value-vs-weight
  variant:                                  # Re-test after diagnosis
    prompt: "After softmax is applied to a row of scores, what is true of the resulting values?"
    options:
      - text: "They sum to 1"
        correct: true
      - text: "They are unchanged raw similarities"
        misconception: score-vs-weight
  diagnosis:
    score-vs-weight:
      distinction: "Score = raw Q·K similarity. Weight = softmax(score)."
      experiment:
        simulation: attention-matrix
        preset: { highlight: softmax-step, focus: temperature-slider }
        instruction: "Lower temperature — watch weights sharpen. Raise to 1.5 — watch them flatten."
```

## 🎯 Authoring Principles

1. **One concept, one lesson** — Estimated time: 20–40 minutes. Longer → split.
2. **Side-by-side math & code** — Always pair notation with runnable code.
3. **Every parameter that matters pedagogically gets a sync binding** — Decoration parameters (colors, layout) do not.
4. **Every quiz wrong option must have a misconception tag** — This enables the Concept Debugger.
5. **Every diagnosable question must have a variant** — For re-testing after diagnosis.
6. **Synced cells must be lightweight** — <200ms compute time to meet the 500ms interaction budget.

## ✅ Validation

All content is validated via `lesson-lint` in CI:

1. **Schema validation** — YAML files against JSON schemas
2. **Graph integrity** — All prerequisites exist; graph is acyclic
3. **Distractor tagging** — Every wrong option has a misconception tag
4. **Sync contract** — All bindings reference existing variables and controls
5. **Notebook execution** — All cells must pass in Pyodide
6. **Performance budget** — Synced cells profiled against 200ms compute budget

Run validation locally:

```bash
# From repo root
npm run lesson-lint

# Or with Docker
docker run --rm -v $(pwd):/app lesson-lint:latest
```

## 📊 Content Statistics

| Module | Lessons | Concepts | Sims | Notebooks |
|--------|---------|----------|------|-----------|
| Foundations | 8 | 25 | 12 | 8 |
| Neural Networks | 7 | 20 | 10 | 7 |
| Tokenization & Embeddings | 5 | 15 | 8 | 5 |
| Attention & Transformers | 7 | 30 | 15 | 7 |
| Training | 6 | 18 | 10 | 6 |
| AI Engineering | 9 | 22 | 12 | 9 |
| **Total** | **42** | **~120** | **67** | **42** |

## 🚀 Adding New Content

1. Create a new lesson directory under `content/lessons/{module}/{lesson}`
2. Add the 6 required files (MDX, YAML, TSX, 2x IPYNB, YAML)
3. Update `concepts/graph.yaml` with new concepts and edges
4. Add new misconceptions to `misconceptions.yaml` if needed
5. Run `npm run lesson-lint` to validate
6. Create a PR for review

## 🔗 Resources

- [Design Spec](../design-spec.md) — Product requirements and UX
- [Technical Spec](../technical-spec.md) — Architecture and implementation details
- [Simulation Components](../../frontend/packages/sim-components/README.md) — Reusable React components
