import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { PythonCode } from './PythonCode';

/**
 * MDX fenced-code renderer. Python (and `py`) blocks get token
 * color; everything else stays monochrome ink.
 */
export function CodeBlock({
  children,
  ...props
}: HTMLAttributes<HTMLPreElement> & { children?: ReactNode }) {
  const child = Children.toArray(children).find((c) => isValidElement(c)) as
    | ReactElement<{ className?: string; children?: ReactNode }>
    | undefined;
  const className = child?.props.className ?? '';
  const lang = /language-(\w+)/.exec(className)?.[1];
  const raw = String(child?.props.children ?? '').replace(/\n$/, '');
  if (lang === 'python' || lang === 'py') {
    return (
      <pre {...props}>
        <code className={className}>
          <PythonCode source={raw} />
        </code>
      </pre>
    );
  }
  return <pre {...props}>{children}</pre>;
}
