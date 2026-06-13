import { notFound } from 'next/navigation';
import { LessonShell } from '@/components/lesson/LessonShell';
import { Workbench } from '@/components/lesson/Workbench';
import { PrevNext } from '@/components/lesson/PrevNext';
import { getLesson, listSlugs } from '@/lib/lessons';

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const Lesson = lesson.Component;
  const interactives = lesson.interactives;
  const defaultActive = interactives[0]?.id ?? '';

  return (
    <LessonShell
      title={lesson.meta.title}
      minutes={lesson.meta.minutes}
      summary={lesson.meta.summary}
    >
      <Workbench
        interactives={interactives}
        defaultActive={defaultActive}
        prose={<Lesson />}
      />
      <PrevNext slug={slug} />
    </LessonShell>
  );
}
