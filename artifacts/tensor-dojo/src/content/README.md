# Content Directory

All lesson content for TensorDojo. 31 lessons across 8 tracks, served
by the Next.js routes in `app/lessons/[slug]/`.

## Structure

```
content/
├── concepts/
│   └── graph.yaml       # Concept graph (used by /map): nodes + edges
└── lessons/
    └── <slug>/
        ├── meta.ts         # { slug, title, summary, minutes, order }
        ├── lesson.mdx      # MDX body — prose + KaTeX + <Callout>/<MathCode>
        └── interactives.tsx # Registers Workbench items: { id, title, Component, ... }
```

Track grouping lives in `lib/lessons-meta.ts` (`TRACKS`). Reading order is `TRACKS.flatMap(t => t.slugs)`.

## Per-lesson files

### `meta.ts`

```ts
export const meta = {
  slug: 'softmax',
  title: 'Softmax: turning scores into a distribution',
  summary: 'Models emit raw numbers. A probability distribution needs ...',
  minutes: 8,
  order: 3,
} as const;
```

- `order` is the global reading order, contiguous `1..31`.
- `minutes` is the reading-time estimate shown in the lesson header (6–10 min for most lessons).

### `lesson.mdx`

Standard MDX with two components imported at the top:

```mdx
import { MathCode } from '@/components/lesson/MathCode';
import { Callout } from '@/components/lesson/Callout';

## How aligned are two vectors?

Prose with inline KaTeX like $\mathbf{a} \cdot \mathbf{b}$ and display blocks:

$$
\mathbf{a} \cdot \mathbf{b} = \sum_i a_i b_i
$$

<MathCode
  math="\mathbf{a} \cdot \mathbf{b} = \sum_i a_i b_i"
  code={`def dot(a, b):
    return sum(x * y for x, y in zip(a, b))`}
  caption="The component form — the form you actually compute."
/>

<Callout title="What to watch for" targetInteractive="dot-product-explorer">
  Drag tip A toward B. Watch cos θ rise to 1; the dot product peaks
  when they're parallel.
</Callout>
```

- Math: `$inline$` and `$$display$$` (KaTeX via `remark-math` + `rehype-katex`).
- `<Callout targetInteractive="<id>">` ties prose to the Workbench item registered under that `id` in `interactives.tsx`. The id must match.
- `<MathCode math="..." code={\`...\`} caption="..." />` pairs a KaTeX expression with a runnable code block.

### `interactives.tsx`

```tsx
import type { InteractiveEntry } from '@/lib/lessons-meta';
import { DotProductExplorer } from '@/components/sim/DotProductExplorer';

export const interactives: readonly InteractiveEntry[] = [
  {
    id: 'dot-product-explorer',
    title: 'Dot Product Explorer',
    description: 'Drag two vectors; |a|, |b|, cos θ, a·b update live.',
    caption: 'A sign flip happens when the angle crosses 90°.',
    Component: DotProductExplorer,
  },
];
```

Each entry becomes a Workbench item on the lesson page. The `id` is what `<Callout targetInteractive>` references; the `title` and `description` are reader-facing.

## Sim components

The `Component` field in each interactive points to a sim component in `components/sim/`. Sim conventions:

- `'use client'` directive at the top.
- Wraps in `<SimFrame title onReset?>` from `components/sim/primitives/`.
- Math imported from `lib/math/`, not redefined inline.
- Visual primitives (`Slider`, `NumberInput`, `BarChart`, `Heatmap`, `VectorCanvas`) live under `components/sim/primitives/`.

See `components/sim/README.md` for the sim authoring conventions.

## Concept graph

`concepts/graph.yaml` lists concept nodes and prerequisite edges. The `/map` route reads this file at build time. Each lesson is associated with one or more concept nodes.

## Validation

`npm run lint:content` runs `scripts/lint-content.ts`, which checks:

- Every lesson directory has both `meta.ts` and `interactives.tsx`.
- `interactives.tsx` declares well-formed `id` fields (regex-scanned, no transpile).
- `concepts/graph.yaml` has no dangling prereq edges and no cycles.

For deeper checks (MDX parses, KaTeX renders, types match), use:

```bash
npm run lint:content   # content-only fast checks
npm test               # math + component tests under lib/math/
npm run build          # full Next.js build (catches MDX/KaTeX errors)
```

## Adding a new lesson

1. Pick a slug and create `content/lessons/<slug>/`.
2. Write `meta.ts` with a chosen `order`; bump every later lesson's `order` by 1.
3. Write `interactives.tsx` and the sim component(s) it imports.
4. Write `lesson.mdx`.
5. Add the slug to the appropriate track in `lib/lessons-meta.ts` `TRACKS`.
6. Add concept nodes/edges to `concepts/graph.yaml` if relevant.
7. `npm run lint:content && npm test && npm run build`.

## Resources

- [Sim authoring conventions](../components/sim/README.md)
- [Tracks definition](../lib/lessons-meta.ts)
