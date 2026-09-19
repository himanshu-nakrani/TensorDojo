import type { ReactNode } from 'react';

/**
 * Dependency-free Python highlighter for the instrument's code wells.
 * One regex pass, five token classes (see .tok-* in index.css). The
 * wells are dark in both themes, so a single token palette serves the
 * manual and the bench alike. Unknown languages fall through as plain
 * text — never guess, never break the source.
 */

const KEYWORDS = new Set([
  'def', 'return', 'import', 'from', 'as', 'for', 'in', 'if', 'elif',
  'else', 'while', 'class', 'lambda', 'not', 'and', 'or', 'None',
  'True', 'False', 'with', 'try', 'except', 'raise', 'pass', 'yield',
  'assert', 'del', 'global', 'nonlocal', 'finally', 'async', 'await',
]);

const TOKEN_RE =
  /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+\.?\d*(?:e[+-]?\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/gm;

export function highlightPython(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of src.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(src.slice(last, idx));
    const [full, comment, str, num, word] = m;
    if (comment) {
      out.push(
        <span key={key++} className="tok-c">
          {comment}
        </span>,
      );
    } else if (str) {
      out.push(
        <span key={key++} className="tok-s">
          {str}
        </span>,
      );
    } else if (num) {
      out.push(
        <span key={key++} className="tok-n">
          {num}
        </span>,
      );
    } else if (word) {
      const isCall = src[idx + full.length] === '(';
      out.push(
        KEYWORDS.has(word) ? (
          <span key={key++} className="tok-k">
            {word}
          </span>
        ) : isCall ? (
          <span key={key++} className="tok-f">
            {word}
          </span>
        ) : (
          word
        ),
      );
    } else {
      out.push(full);
    }
    last = idx + full.length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}
