import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';
import { CodeBlock } from '@/components/lesson/CodeBlock';
import { headingText, slugifyHeading } from '@/lib/heading';

/**
 * Default MDX element mapping. Lesson-specific components
 * (MathCode, Callout, sims) are still imported in each .mdx file.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: CodeBlock,
    h2: ({ children, id, ...rest }: ComponentPropsWithoutRef<'h2'>) => {
      const slug = id ?? slugifyHeading(headingText(children));
      return (
        <h2 id={slug || undefined} {...rest}>
          {children}
        </h2>
      );
    },
  };
}
