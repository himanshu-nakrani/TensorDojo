import { notFound } from 'next/navigation';
import { LessonShell } from '@/components/lesson/LessonShell';
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

  return (
    <LessonShell
      title={lesson.meta.title}
      minutes={lesson.meta.minutes}
      summary={lesson.meta.summary}
    >
      <Lesson />
    </LessonShell>
  );
}
