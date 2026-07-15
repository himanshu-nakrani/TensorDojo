import type { MDXComponents } from 'mdx/types';

/**
 * Pass-through. Components used inside MDX (SoftmaxExplorer, ScoreEditor,
 * MathCode, Callout) are imported explicitly in the .mdx file, so the
 * default mapping can stay empty.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
