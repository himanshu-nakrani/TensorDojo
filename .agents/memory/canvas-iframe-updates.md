---
name: Canvas iframe shape updates
description: Correct payload shape for canvas update actions and quirks of getCanvasState responses
---

# Canvas iframe shape updates

The rule: when updating a canvas shape, `shapeType` belongs INSIDE `updates`, not at the action's top level:

```js
{ type: "update", shapeId, updates: { shapeType: "iframe", url, componentPath, state } }
```

**Why:** Discovered through repeated schema-validation failures (July 2026) — the intuitive placement (`shapeType` beside `shapeId`) is rejected.

**How to apply:** Any `applyCanvasActions`-style update to iframe shapes (e.g. flipping mockups from `loading` to `live`). Also note:
- `getCanvasState` returns `focusedShapes` / `blurryShapes` / `peripheralClusters` — there is no flat `shapes` array.
- Shape objects in those lists may not expose a top-level `id` field; track the shape IDs you assigned at creation instead of reading them back.
