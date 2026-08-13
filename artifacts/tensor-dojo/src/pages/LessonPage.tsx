import { Suspense, use, useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { LessonShell } from '@/components/lesson/LessonShell';
import { Workbench } from '@/components/lesson/Workbench';
import { PrevNext } from '@/components/lesson/PrevNext';
import { VisitTracker } from '@/components/lesson/VisitTracker';
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

  if (loading) {
    return (
      <LessonShell title={meta.title} minutes={meta.minutes} summary={meta.summary}>
        <div className="flex items-center justify-center py-32">
          <div className="text-muted text-sm font-mono">Loading lesson…</div>
        </div>
      </LessonShell>
    );
  }

  if (error) {
    return (
      <LessonShell title={meta.title} minutes={meta.minutes} summary={meta.summary}>
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

  return (
    <LessonShell title={meta.title} minutes={meta.minutes} summary={meta.summary}>
      <VisitTracker slug={slug} />
      <Workbench
        interactives={interactives}
        defaultActive={defaultActive}
        prose={<Lesson />}
      />
      <PrevNext slug={slug} />
    </LessonShell>
  );
}
