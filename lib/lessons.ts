import type { ComponentType } from 'react';
import { meta as softmaxMeta } from '@/content/lessons/softmax/meta';
// MDX files have no default export; importing the module gives the compiled
// MDX component on the `default` key.
import * as SoftmaxLesson from '@/content/lessons/softmax/lesson.mdx';
import type { LessonMeta } from '@/content/lessons/softmax/meta';

export interface LessonEntry {
  meta: LessonMeta;
  Component: ComponentType;
}

const registry: Record<string, LessonEntry> = {
  [softmaxMeta.slug]: {
    meta: softmaxMeta,
    Component: SoftmaxLesson.default,
  },
};

export function getLesson(slug: string): LessonEntry | undefined {
  return registry[slug];
}

export function listLessons(): LessonEntry[] {
  return Object.values(registry).sort((a, b) => a.meta.order - b.meta.order);
}

export function listSlugs(): string[] {
  return listLessons().map((l) => l.meta.slug);
}
