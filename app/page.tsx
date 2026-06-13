import Link from 'next/link';
import { LessonCardList } from '@/components/home/LessonCardList';

export default function HomePage() {
  return (
    <main className="mx-auto px-6 sm:px-10 py-20 max-w-wide flex flex-col min-h-screen">
      <header className="max-w-prose mb-16">
        <h1 className="text-[2.75rem] sm:text-[3.5rem] font-semibold text-ink leading-[1.05] tracking-[-0.02em] mb-6">
          Learn AI by
          <br />
          manipulating it.
        </h1>
        <p className="text-[1.125rem] text-muted leading-relaxed max-w-[640px]">
          Every concept is something you can move, change, and watch
          respond. Drag a slider, edit a number, read a result.
        </p>
      </header>

      <LessonCardList />

      <footer className="mt-auto pt-20 pb-4 max-w-prose">
        <Link
          href="/map"
          className="text-[12px] text-muted hover:text-ink transition-colors font-mono border-b border-border-strong pb-0.5"
        >
          View concept map →
        </Link>
      </footer>
    </main>
  );
}
