import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LessonShell } from '@/components/lesson/LessonShell';
import { Workbench } from '@/components/lesson/Workbench';
import { PrevNext } from '@/components/lesson/PrevNext';
import { VisitTracker } from '@/components/lesson/VisitTracker';
import {
  getLessonMeta,
  loadLessonInteractives,
} from '@/lib/lesson-manifest';
import { listSlugs, mdxLessonLoaders } from '@/lib/lessons';

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = getLessonMeta(slug);
  if (!meta) {
    return { title: 'AI Learning Lab' };
  }
  return {
    title: `${meta.title} — AI Learning Lab`,
    description: meta.summary,
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { slug } = await params;
  const meta = getLessonMeta(slug);
  if (!meta) notFound();
  const loader = mdxLessonLoaders[slug];
  if (!loader) notFound();
  const [mod, interactives] = await Promise.all([
    loader(),
    loadLessonInteractives(slug),
  ]);
  const Lesson = mod.default;
  const defaultActive = interactives[0]?.id ?? '';

  return (
    <LessonShell
      title={meta.title}
      minutes={meta.minutes}
      summary={meta.summary}
    >
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
