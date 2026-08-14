import { useId, useState } from 'react';

interface CheckProps {
  question: string;
  options: readonly string[];
  answer: number;
  explanation: string;
}

/**
 * A lightweight, local-only knowledge check for lesson MDX.
 * It deliberately does not block exploration or require an account.
 */
export function Check({ question, options, answer, explanation }: CheckProps) {
  const groupId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = submitted && selected === answer;

  return (
    <section
      className="my-8 rounded-md border border-border bg-surface px-5 py-5 sm:px-6"
      aria-labelledby={`${groupId}-question`}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] font-mono text-accent">Check your intuition</p>
      <h3 id={`${groupId}-question`} className="mt-2 text-base font-semibold text-ink">
        {question}
      </h3>

      <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Answer choices">
        {options.map((option, index) => {
          const checked = selected === index;
          const answerState = submitted
            ? index === answer
              ? 'border-green-600 bg-green-50 text-green-950 dark:border-green-400 dark:bg-green-950/30 dark:text-green-100'
              : checked
                ? 'border-red-600 bg-red-50 text-red-950 dark:border-red-400 dark:bg-red-950/30 dark:text-red-100'
                : 'border-border text-fg-muted'
            : checked
              ? 'border-accent bg-accent-faint text-ink'
              : 'border-border text-ink hover:border-accent';

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={submitted}
              className={`focus-ring min-h-[44px] rounded-md border px-3 py-2 text-left text-sm transition-colors ${answerState}`}
              onClick={() => setSelected(index)}
            >
              <span className="mr-2 font-mono text-[11px] text-muted">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          type="button"
          className="focus-ring mt-4 rounded-md bg-accent px-4 py-2 text-[12px] font-mono uppercase tracking-[0.1em] text-white enabled:hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selected === null}
          onClick={() => setSubmitted(true)}
        >
          Check answer
        </button>
      ) : (
        <div
          className="mt-4 rounded-md border border-border bg-bg-elevated px-4 py-3 text-sm leading-relaxed"
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold text-ink">{isCorrect ? 'Correct.' : 'Not quite.'}</p>
          <p className="mt-1 text-fg-muted">{explanation}</p>
          <button
            type="button"
            className="focus-ring mt-3 text-[12px] font-mono uppercase tracking-[0.1em] text-accent hover:text-accent-hover"
            onClick={() => {
              setSelected(null);
              setSubmitted(false);
            }}
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
