import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'wouter';
import { DotProductExplorer } from '@/components/sim/DotProductExplorer';
import { InteractiveSkeleton } from '@/components/lesson/InteractiveSkeleton';
import dynamic from '@/lib/dynamic';
import { track } from '@/lib/analytics';

// The two heavier centerpiece sims are code-split so the landing page
// stays fast; only the visited tab's chunk loads.
const AttentionMatrix = dynamic(
  () => import('@/components/sim/AttentionMatrix').then((m) => m.AttentionMatrix),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);
const DpoLossExplorer = dynamic(
  () => import('@/components/sim/DpoLossExplorer').then((m) => m.DpoLossExplorer),
  { loading: () => <InteractiveSkeleton />, ssr: false },
);

interface HeroFigure {
  id: string;
  /** Notebook-spine label. */
  fig: string;
  tab: string;
  heading: string;
  caption: string;
  lessonSlug: string;
  lessonLabel: string;
  render: () => React.ReactNode;
}

const FIGURES: readonly HeroFigure[] = [
  {
    id: 'dot-product',
    fig: 'Fig. 1 · Dot product as alignment',
    tab: 'Dot product',
    heading: 'When two vectors agree',
    caption:
      'Drag either tip. The signed product and cosine update live — same arithmetic the transformer uses.',
    lessonSlug: 'dot-product',
    lessonLabel: 'Lesson 01',
    render: () => (
      <DotProductExplorer preset={{ a: [1.4, 0.6], b: [-0.4, 1.3] }} drawIn />
    ),
  },
  {
    id: 'attention',
    fig: 'Fig. 2 · Attention scores',
    tab: 'Attention',
    heading: 'Who attends to whom',
    caption:
      'Four queries, four keys on one plane. Rotate a Q and watch its row of the softmax weight matrix sharpen or flatten.',
    lessonSlug: 'attention-scores',
    lessonLabel: 'Lesson 05',
    render: () => <AttentionMatrix />,
  },
  {
    id: 'dpo',
    fig: 'Fig. 3 · DPO loss surface',
    tab: 'DPO loss',
    heading: 'Preference, as a surface you can walk',
    caption:
      'The point is the policy; the surface is the loss over chosen/rejected log-ratios. Drag toward the upper-left — that is alignment working.',
    lessonSlug: 'dpo',
    lessonLabel: 'Lesson 57',
    render: () => <DpoLossExplorer />,
  },
];

const ROTATE_MS = 9000;

/**
 * The hero's interactive panel, framed as a lab-notebook figure.
 * Three figures from across the curriculum (similarity → attention →
 * alignment) cycle slowly so the fold shows breadth, not just one
 * demo. Auto-rotation stops permanently the moment the reader
 * interacts — the figures are for dragging, and yanking a sim away
 * mid-drag is hostile.
 */
export function HeroInteractive() {
  const [index, setIndex] = useState(0);
  // Reduced-motion readers get a static figure: the rotator never starts.
  const [pinned, setPinned] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const pinnedRef = useRef(pinned);

  const pin = useCallback(() => {
    if (!pinnedRef.current) {
      pinnedRef.current = true;
      setPinned(true);
    }
  }, []);

  useEffect(() => {
    if (pinned) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % FIGURES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [pinned]);

  const figure = FIGURES[index]!;

  return (
    <div
      className="lab-note relative p-5 sm:p-6 pl-6 sm:pl-7"
      onPointerDown={pin}
      // Keyboard users manipulate the sims via role="slider" tips and
      // tab buttons; focus or keys inside the figure pin it just like
      // a pointer grab would.
      onFocus={pin}
      onKeyDown={pin}
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="text-[11px] uppercase tracking-[0.12em] font-mono text-fg-subtle">
          {figure.fig}
        </span>
        <span className="text-[11px] uppercase tracking-[0.12em] font-mono text-accent shrink-0">
          <span aria-hidden="true">◆ </span>
          Live
        </span>
      </div>

      <h3 className="lab-display text-[1.2rem] sm:text-[1.3rem] text-ink leading-snug mb-4">
        {figure.heading}
      </h3>

      {/* Tabs — one per figure. Selecting a tab pins the rotator. */}
      <div
        role="tablist"
        aria-label="Hero figures"
        className="mb-4 flex items-center gap-1.5"
      >
        {FIGURES.map((f, i) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => {
              pin();
              setIndex(i);
              track('hero_preset', { figure: f.id });
            }}
            className={clsx(
              'focus-ring rounded-sm px-3 py-1.5 text-[11px] font-mono transition-colors',
              i === index
                ? 'bg-accent text-accent-fg'
                : 'border border-border text-fg-muted hover:border-accent hover:text-accent',
            )}
          >
            {f.tab}
          </button>
        ))}
        {!pinned && (
          <span
            aria-hidden="true"
            className="ml-auto hidden sm:block text-[10px] font-mono text-fg-subtle"
          >
            auto-cycling
          </span>
        )}
      </div>

      <div role="tabpanel" aria-label={figure.fig}>
        {figure.render()}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-end justify-between gap-4">
        <p className="text-[12px] text-fg-muted font-mono leading-relaxed">
          {figure.caption}
        </p>
        <Link
          href={`/lessons/${figure.lessonSlug}`}
          onClick={() => track('cta_click', { source: 'hero-figure', lesson: figure.lessonSlug })}
          className="focus-ring shrink-0 rounded text-[11px] uppercase tracking-[0.12em] font-mono text-accent-2 hover:text-accent-2-hover transition-colors"
        >
          {figure.lessonLabel} →
        </Link>
      </div>
    </div>
  );
}
