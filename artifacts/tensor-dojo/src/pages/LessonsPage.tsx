import { LessonDirectory } from "@/components/lessons/LessonDirectory";
import { useDocumentMeta } from "@/hooks/use-document-meta";

export default function LessonsPage() {
  useDocumentMeta({
    title: "All lessons — TensorDojo",
    description:
      "Eighty interactive lessons across ten tracks, in reading order — from the dot product through attention, training, LoRA, DPO, and safety.",
    path: "/lessons",
  });

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto px-6 sm:px-10 py-12 sm:py-16 max-w-wide"
    >
      <header className="mb-8 max-w-prose">
        <div className="text-[12px] uppercase tracking-[0.18em] text-fg-muted font-mono mb-3">
          Lessons
        </div>
        <h1 className="text-[2.25rem] sm:text-[2.5rem] font-semibold text-ink leading-[1.1] tracking-[-0.01em] mb-4">
          Every lesson, by track.
        </h1>
        <p className="text-[1rem] text-muted leading-relaxed">
          Eighty interactive lessons across ten tracks, in reading order.
          Each card opens a workbench where the math is something you can move.
        </p>
      </header>

      <LessonDirectory />
    </main>
  );
}
