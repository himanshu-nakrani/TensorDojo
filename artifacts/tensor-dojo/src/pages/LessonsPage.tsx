import { LessonCardList } from "@/components/home/LessonCardList";

export default function LessonsPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto px-6 sm:px-10 py-12 sm:py-16 max-w-wide"
    >
      <header className="mb-10 max-w-prose">
        <div className="text-[12px] uppercase tracking-[0.18em] text-fg-muted font-mono mb-3">
          Lessons
        </div>
        <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-4">
          Every lesson, by track.
        </h1>
        <p className="text-[1rem] text-muted leading-relaxed">
          Fifty-eight interactive lessons across eight tracks, in reading order.
          Each card opens a workbench where the math is something you can move.
        </p>
      </header>

      <LessonCardList />
    </main>
  );
}
