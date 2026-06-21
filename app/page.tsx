import Link from 'next/link';
import { LessonCardList } from '@/components/home/LessonCardList';

export default function HomePage() {
  return (
    <main id="main" className="mx-auto px-6 sm:px-10 py-20 max-w-wide flex flex-col min-h-screen">
      <header className="max-w-prose mb-12">
        <h1 className="text-[2.75rem] sm:text-[3.5rem] font-semibold text-ink leading-[1.05] tracking-[-0.02em] mb-6 text-balance">
          Learn AI by manipulating it.
        </h1>
        <p className="text-[1.125rem] text-muted leading-relaxed max-w-[640px] mb-6">
          Every concept is something you can move, change, and watch
          respond. Drag a slider, edit a number, read a result.
        </p>
        <Link
          href="/map"
          className="focus-ring inline-flex items-center min-h-[44px] gap-2 px-4 py-2.5 text-[13px] font-mono text-accent border border-accent/40 rounded-md hover:bg-accent-soft hover:border-accent transition-colors"
        >
          View concept map
          <span aria-hidden="true">→</span>
        </Link>
      </header>

      <LessonCardList />

      <footer className="mt-auto pt-20 pb-4 max-w-prose text-[12px] text-dim font-mono">
        <span>tensor dojo</span>
      </footer>
    </main>
  );
}
