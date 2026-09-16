import { Link } from 'wouter';
import { track } from '@/lib/analytics';
import { listLessonMeta } from '@/lib/lessons-meta';

const REPO = 'https://github.com/himanshu-nakrani/TensorDojo';

/**
 * Closing beat before the footer: one primary action (start lesson 1),
 * one honest "subscribe" (watch releases on GitHub — there is no
 * backend to hold an email address), and the pitch restated in the
 * lab-notebook voice.
 */
export function FinalCta() {
  const lessonCount = listLessonMeta().length;

  return (
    <section
      aria-labelledby="final-cta-heading"
      className="lab-note relative px-6 py-10 sm:px-10 sm:py-12 text-center"
    >
      <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-accent-2 mb-4">
        Experiment 01 awaits
      </p>
      <h2
        id="final-cta-heading"
        className="lab-display text-display-lg sm:text-display-xl text-ink mx-auto max-w-[22ch] text-balance"
      >
        The intuition sticks better when your hand made it.
      </h2>
      <p className="mt-4 text-body-md text-muted mx-auto max-w-[52ch] text-pretty">
        Start at lesson 01 and drag a vector. {lessonCount} lessons later,
        attention, training, LoRA, and alignment are things you have moved
        with your own cursor — not diagrams you once read.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/lessons/dot-product"
          onClick={() => track('cta_click', { source: 'final-cta', target: 'lesson-01' })}
          className="focus-ring inline-flex min-h-[48px] items-center gap-2 rounded px-6 py-3 text-[14px] font-semibold bg-accent-2 text-accent-2-fg hover:bg-accent-2-hover transition-colors"
        >
          Open lesson 01
          <span aria-hidden="true">→</span>
        </Link>
        <a
          href={`${REPO}/releases`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('cta_click', { source: 'final-cta', target: 'watch-releases' })}
          className="focus-ring inline-flex min-h-[48px] items-center gap-2 rounded border border-border-strong px-5 py-3 text-[13px] font-mono text-ink hover:border-accent-2 hover:text-accent-2 transition-colors"
        >
          Get notified of new tracks
        </a>
      </div>
      <p className="mt-5 text-[11px] font-mono text-fg-subtle">
        Free · MIT · no account, no email required
      </p>
    </section>
  );
}
