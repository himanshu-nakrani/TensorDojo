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

  useEffect(() => {
    setLoading(true);
    setLessonModule(null);
    setInteractives([]);

    const loader = mdxLessonLoaders[slug];
    if (!loader) {
      setLoading(false);
      return;
    }

    Promise.all([loader(), loadLessonInteractives(slug)]).then(([mod, ints]) => {
      setLessonModule(mod);
      setInteractives(ints);
      setLoading(false);
    });
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
