import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LessonShell } from '@/components/lesson/LessonShell';
import { Workbench } from '@/components/lesson/Workbench';
import { PrevNext } from '@/components/lesson/PrevNext';
import { getLessonManifest } from '@/lib/lesson-manifest';
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
  const manifest = getLessonManifest(slug);
  if (!manifest) {
    return { title: 'AI Learning Lab' };
  }
  return {
    title: `${manifest.meta.title} — AI Learning Lab`,
    description: manifest.meta.summary,
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { slug } = await params;
  const manifest = getLessonManifest(slug);
  if (!manifest) notFound();
  const loader = mdxLessonLoaders[slug];
  if (!loader) notFound();
  const mod = await loader();
  const Lesson = mod.default;
  const interactives = manifest.interactives;
  const defaultActive = interactives[0]?.id ?? '';

  return (
    <LessonShell
      title={manifest.meta.title}
      minutes={manifest.meta.minutes}
      summary={manifest.meta.summary}
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
