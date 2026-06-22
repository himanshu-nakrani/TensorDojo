interface FaqEntry {
  q: string;
  a: string;
}

const FAQS: readonly FaqEntry[] = [
  {
    q: 'Who is this for?',
    a: 'Engineers, students, and curious technical readers who want to actually feel how modern AI works, not memorize a glossary. Comfort with basic algebra and a willingness to read code is enough.',
  },
  {
    q: 'What do I need to know first?',
    a: 'High-school algebra, a vague memory of vectors, and the patience to drag things. No calculus, no Python, no prior ML.',
  },
  {
    q: 'Is the math real or hand-wavy?',
    a: 'Real. Every simulator runs the actual operation on real numbers. The dot-product demo is computing a dot product; the attention demo is computing softmax-weighted values.',
  },
  {
    q: 'How long is the whole curriculum?',
    a: 'Roughly 8–10 hours of reading and tinkering across fifty-five lessons, but each lesson stands on its own. The concept map shows what depends on what.',
  },
  {
    q: 'Can I skip around?',
    a: 'Yes. The map marks cross-track prerequisites; the lessons list groups them in reading order. Pick a track, pick a lesson, dive in.',
  },
];

/**
 * Native <details>-based FAQ. No JS state to manage; the browser
 * handles open/close, keyboard, and screen-reader semantics. The
 * chevron rotates via the [open] attribute selector.
 */
export function FaqAccordion() {
  return (
    <section aria-labelledby="faq-heading">
      <div className="mb-8">
        <div className="text-[12px] uppercase tracking-[0.12em] text-fg-muted font-mono mb-3">
          Questions
        </div>
        <h2
          id="faq-heading"
          className="text-[1.75rem] sm:text-[2rem] font-semibold text-ink leading-[1.15] tracking-[-0.01em]"
        >
          Before you start.
        </h2>
      </div>

      <div className="border-t border-border max-w-prose">
        {FAQS.map((entry) => (
          <details
            key={entry.q}
            className="group border-b border-border py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="focus-ring flex cursor-pointer items-center justify-between gap-4 rounded-sm text-[16px] font-semibold text-ink list-none">
              <span>{entry.q}</span>
              <span
                aria-hidden="true"
                className="text-fg-muted transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 2 L8 6 L4 10" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-[15px] text-muted leading-relaxed">
              {entry.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
