---
name: Next.js to Vite dynamic import shim
description: How to correctly shim next/dynamic for Vite migrations when factories return raw ComponentType instead of module objects.
---

## The rule
When migrating Next.js `next/dynamic` to React.lazy, the factory function can return either:
- A raw `ComponentType` (when using `.then(m => m.Named)`)
- A module-like object `{ default: ComponentType }` (from bare `import()`)

React.lazy requires `{ default: ComponentType }`, so the shim must normalise both shapes.

**Why:** next/dynamic accepts factories that return a raw component. React.lazy does not. Without normalisation, `lazy(() => import(...).then(m => m.Named))` throws "Received a promise that resolves to: undefined".

**How to apply:** See `artifacts/tensor-dojo/src/lib/dynamic.tsx` for the implementation. The shim checks for a `default` key on the result and wraps if absent.
