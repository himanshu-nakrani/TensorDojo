import { tokenizePython, type PyKind } from '@/lib/highlight-python';

const KIND_CLASS: Record<PyKind, string | undefined> = {
  comment: 'tok-comment',
  keyword: 'tok-keyword',
  number: 'tok-number',
  fn: 'tok-fn',
  builtin: 'tok-builtin',
  ident: 'tok-ident',
  string: 'tok-string',
  text: undefined,
};

/**
 * Token-colored Python source. Used by MathCode and fenced MDX
 * blocks. Output is a list of spans — no innerHTML.
 */
export function PythonCode({ source }: { source: string }) {
  return (
    <>
      {tokenizePython(source).map((t, i) =>
        t.kind === 'text' ? (
          t.text
        ) : (
          <span key={i} className={KIND_CLASS[t.kind]}>
            {t.text}
          </span>
        ),
      )}
    </>
  );
}
