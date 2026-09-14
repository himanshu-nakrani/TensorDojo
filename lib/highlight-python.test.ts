import { describe, expect, it } from 'vitest';
import { tokenizePython } from './highlight-python';

function kinds(src: string) {
  return tokenizePython(src).map((t) => [t.kind, t.text] as const);
}

describe('tokenizePython', () => {
  it('marks def/return/for/in as keywords', () => {
    const k = kinds('def dot(a, b):\n    return sum(x * y for x, y in zip(a, b))');
    expect(k.filter(([kind]) => kind === 'keyword').map(([, t]) => t)).toEqual([
      'def',
      'return',
      'for',
      'in',
    ]);
  });

  it('marks the name after def as a function', () => {
    const fn = kinds('def dot(a, b):').filter(([kind]) => kind === 'fn');
    expect(fn.map(([, t]) => t)).toEqual(['dot']);
  });

  it('marks comments dim', () => {
    const c = kinds('dot([1, 2], [3, 4])  # → 11\n');
    expect(c.some(([kind, t]) => kind === 'comment' && t.includes('→'))).toBe(
      true,
    );
  });

  it('marks numbers', () => {
    const nums = kinds('dot([1.5, 0.5], [1.0, 0])').filter(
      ([kind]) => kind === 'number',
    );
    expect(nums.map(([, t]) => t)).toEqual(['1.5', '0.5', '1.0', '0']);
  });

  it('marks True/False/None as keywords and keeps strings together', () => {
    const tokens = tokenizePython('x = "cat" if True else None');
    expect(tokens.some((t) => t.kind === 'string' && t.text === '"cat"')).toBe(
      true,
    );
    expect(
      tokens.filter((t) => t.kind === 'keyword').map((t) => t.text),
    ).toEqual(['if', 'True', 'else', 'None']);
  });

  it('marks ordinary identifiers silver, not keywords', () => {
    const idents = kinds('dot([1.5, 0.5], [1.0, 0])').filter(
      ([kind]) => kind === 'ident',
    );
    expect(idents.map(([, t]) => t)).toEqual(['dot']);
  });

  it('does not drop any source characters', () => {
    const src = 'def dot(a, b):\n    return sum(x * y for x, y in zip(a, b))\n';
    expect(tokenizePython(src).map((t) => t.text).join('')).toBe(src);
  });
});
