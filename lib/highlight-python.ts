/**
 * Tiny Python tokenizer for lesson code blocks. Not a parser — just
 * enough to paint comments, keywords, numbers, def-names, and
 * strings with the instrument-panel tokens.
 */

export type PyKind =
  | 'comment'
  | 'string'
  | 'keyword'
  | 'number'
  | 'fn'
  | 'builtin'
  | 'ident'
  | 'text';

export interface PyToken {
  kind: PyKind;
  text: string;
}

const KEYWORDS = new Set([
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'False',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'None',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'True',
  'try',
  'while',
  'with',
  'yield',
]);

const BUILTINS = new Set([
  'abs',
  'all',
  'any',
  'dict',
  'enumerate',
  'filter',
  'float',
  'int',
  'len',
  'list',
  'map',
  'max',
  'min',
  'print',
  'range',
  'reversed',
  'set',
  'sorted',
  'str',
  'sum',
  'tuple',
  'zip',
]);

const IDENT = /[A-Za-z_][A-Za-z0-9_]*/;
const NUMBER = /(?:\d+\.\d+|\.\d+|\d+)(?:[eE][+-]?\d+)?/;

export function tokenizePython(src: string): PyToken[] {
  const out: PyToken[] = [];
  let i = 0;
  let lastKw: string | null = null;

  const push = (kind: PyKind, text: string) => {
    if (!text) return;
    const prev = out[out.length - 1];
    if (prev && prev.kind === kind && kind === 'text') {
      prev.text += text;
      return;
    }
    out.push({ kind, text });
  };

  while (i < src.length) {
    const rest = src.slice(i);

    if (src[i] === '#') {
      const end = src.indexOf('\n', i);
      const to = end === -1 ? src.length : end;
      push('comment', src.slice(i, to));
      i = to;
      lastKw = null;
      continue;
    }

    const triple = rest.match(/^("""[\s\S]*?"""|'''[\s\S]*?''')/);
    if (triple) {
      push('string', triple[0]);
      i += triple[0].length;
      lastKw = null;
      continue;
    }

    if (src[i] === '"' || src[i] === "'") {
      const q = src[i]!;
      let j = i + 1;
      while (j < src.length && src[j] !== q && src[j] !== '\n') {
        if (src[j] === '\\' && j + 1 < src.length) j += 2;
        else j += 1;
      }
      if (src[j] === q) j += 1;
      push('string', src.slice(i, j));
      i = j;
      lastKw = null;
      continue;
    }

    const num = rest.match(NUMBER);
    if (num && num.index === 0) {
      push('number', num[0]);
      i += num[0].length;
      lastKw = null;
      continue;
    }

    const id = rest.match(IDENT);
    if (id && id.index === 0) {
      const name = id[0];
      if (KEYWORDS.has(name)) {
        push('keyword', name);
        lastKw = name;
      } else if (lastKw === 'def' || lastKw === 'class') {
        push('fn', name);
        lastKw = null;
      } else if (BUILTINS.has(name)) {
        push('builtin', name);
        lastKw = null;
      } else {
        push('ident', name);
        lastKw = null;
      }
      i += name.length;
      continue;
    }

    push('text', src[i]!);
    if (!/\s/.test(src[i]!)) lastKw = null;
    i += 1;
  }

  return out;
}
