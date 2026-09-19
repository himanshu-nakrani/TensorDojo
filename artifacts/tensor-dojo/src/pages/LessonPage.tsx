import { Suspense, use, useState, useEffect , useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { MDXProvider } from '@mdx-js/react';
import { highlightPython } from '@/lib/highlight';
import { LessonShell } from '@/components/lesson/LessonShell';
import { Workbench } from '@/components/lesson/Workbench';
import { PrevNext } from '@/components/lesson/PrevNext';
import { VisitTracker } from '@/components/lesson/VisitTracker';
import { LessonCompleteBar } from '@/components/lesson/LessonCompleteBar';
import { LessonToc } from '@/components/lesson/LessonToc';
import { OnboardingOverlay } from '@/components/lesson/OnboardingOverlay';
import { useDocumentMeta } from '@/hooks/use-document-meta';
import { track } from '@/lib/analytics';
import {
  getLessonMeta,
  loadLessonInteractives,
  type InteractiveEntry,
} from '@/lib/lesson-manifest';
import { mdxLessonLoaders } from '@/lib/lessons';

export default function LessonPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? '';
  const [, navigate] = useLocation();

  const meta = getLessonMeta(slug);

  // Redirect to 404 if slug unknown
  if (!meta) {
    navigate('/not-found');
    return null;
  }

  return <LessonContent slug={slug} />;
}

function LessonContent({ slug }: { slug: string }) {
  const meta = getLessonMeta(slug)!;
  const [lessonModule, setLessonModule] = useState<{ default: React.ComponentType } | null>(null);
  const [interactives, setInteractives] = useState<readonly InteractiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useDocumentMeta({
    title: `${meta.title} — TensorDojo`,
    description: meta.summary,
    path: `/lessons/${slug}`,
  });

  useEffect(() => {
    track('lesson_start', { slug });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLessonModule(null);
    setInteractives([]);

    const loader = mdxLessonLoaders[slug];
    if (!loader) {
      setLoading(false);
      setError(new Error('This lesson is not available.'));
      return () => {
        cancelled = true;
      };
    }

    Promise.all([loader(), loadLessonInteractives(slug)])
      .then(([mod, ints]) => {
        if (cancelled) return;
        setLessonModule(mod);
        setInteractives(ints);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause : new Error('The lesson could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Returning readers land where they left off: remember the scroll
  // offset per slug for the session and restore it once the lazy MDX
  // has painted (hash links still win).
  const restoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading || restoredRef.current === slug) return;
    restoredRef.current = slug;
    const key = `tld-scroll:${slug}`;
    const saved = window.sessionStorage.getItem(key);
    if (saved && !window.location.hash) {
      window.scrollTo({ top: Number(saved) || 0, behavior: 'instant' });
    }
    let raf = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        window.sessionStorage.setItem(key, String(window.scrollY));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, [slug, loading]);

  if (loading) {
    return (
      <LessonShell title={meta.title} minutes={meta.minutes} summary={meta.summary} objectives={meta.objectives}>
        <div className="flex items-center justify-center py-32">
          <div className="text-muted text-sm font-mono">Loading lesson…</div>
        </div>
      </LessonShell>
    );
  }

  if (error) {
    return (
      <LessonShell title={meta.title} minutes={meta.minutes} summary={meta.summary} objectives={meta.objectives}>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-32 text-center">
          <p className="text-sm font-mono uppercase tracking-[0.16em] text-muted">Unable to load lesson</p>
          <p className="text-sm text-fg-muted">{error.message}</p>
          <button
            type="button"
            className="rounded border border-border px-4 py-2 text-sm font-mono text-ink transition-colors hover:bg-bg-elevated"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </LessonShell>
    );
  }

  const Lesson = lessonModule?.default;
  if (!Lesson) return null;


  const defaultActive = interactives[0]?.id ?? '';

  // Lesson code fences render through the same highlighter as the
  // MathCode wells, so every block on the page shares one voice.
  const mdxComponents = {
    pre: (props: React.ComponentProps<'pre'>) => {
      const child = props.children as React.ReactElement<{ children?: unknown }> | undefined;
      const text =
        child && typeof child.props?.children === 'string'
          ? (child.props.children as string)
          : null;
      if (text === null) return <pre {...props} />;
      const { children: _drop, ...rest } = props;
      return (
        <pre {...rest}>
          <code>{highlightPython(text)}</code>
        </pre>
      );
    },
  };

  return (
    <LessonShell title={meta.title} minutes={meta.minutes} summary={meta.summary} objectives={meta.objectives}>
      <VisitTracker slug={slug} />
      <LessonToc slug={slug} />
      {slug === 'dot-product' && <OnboardingOverlay />}
      <Workbench
        interactives={interactives}
        defaultActive={defaultActive}
        prose={
          <MDXProvider components={mdxComponents}>
            <Lesson />
          </MDXProvider>
        }
      />
      <LessonCompleteBar slug={slug} />
      <PrevNext slug={slug} />
    </LessonShell>
  );
}
