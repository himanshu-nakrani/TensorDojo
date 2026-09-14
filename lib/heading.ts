import { isValidElement, type ReactNode } from 'react';

/** Plain text of a heading's React children (ignores nested markup). */
export function headingText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(headingText).join('');
  if (isValidElement(node)) {
    return headingText(
      (node.props as { children?: ReactNode }).children,
    );
  }
  return '';
}

/** URL fragment for a section heading. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
