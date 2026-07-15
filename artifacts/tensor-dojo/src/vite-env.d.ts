/// <reference types="vite/client" />

/**
 * MDX modules (the 58 lesson files under src/content/lessons).
 * Self-contained on purpose — no import from 'mdx/types', so the
 * declaration keeps working regardless of which @mdx-js packages
 * happen to ship type stubs.
 */
declare module '*.mdx' {
  import type { ComponentType } from 'react';
  const MDXComponent: ComponentType<Record<string, unknown>>;
  export default MDXComponent;
}
