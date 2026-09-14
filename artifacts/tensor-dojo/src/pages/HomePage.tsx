import { Link } from "wouter";
import { HeroInteractive } from "@/components/home/HeroInteractive";
import { ResumeStrip } from "@/components/home/ResumeStrip";
import { StatsStrip } from "@/components/home/StatsStrip";
import { WhyTiles } from "@/components/home/WhyTiles";
import { CurriculumGrid } from "@/components/home/CurriculumGrid";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { Footer } from "@/components/home/Footer";
import { listLessonMeta } from "@/lib/lessons-meta";

export default function HomePage() {
  const lessonCount = listLessonMeta().length;

  return (
    <main
      id="main"
      tabIndex={-1}
      className="lab-home mx-auto px-6 sm:px-10 pt-12 sm:pt-16 max-w-lab"
    >
      {/* HERO — editorial lab notebook */}
      <section className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)] gap-10 lg:gap-14 items-start pb-14 sm:pb-20">
        <div className="relative order-2 lg:order-1 max-w-[560px]">
          <div
            className="animate-fade-up text-[12px] uppercase tracking-[0.16em] text-fg-muted font-mono mb-5"
            style={{ "--delay": "0ms" } as React.CSSProperties}
          >
            A lab for language models
          </div>
          <h1
            className="animate-fade-up lab-display text-ink leading-[1.08] text-balance mb-5 text-[2.5rem] sm:text-[3.1rem] lg:text-[3.4rem]"
            style={{ "--delay": "80ms" } as React.CSSProperties}
          >
            Learn AI the way scientists learn: by{" "}
            <em className="text-accent italic font-medium">
              touching the variables.
            </em>
          </h1>
          <p
            className="animate-fade-up text-[1.05rem] sm:text-[1.125rem] text-muted leading-relaxed mb-8 text-pretty"
            style={{ "--delay": "160ms" } as React.CSSProperties}
          >
            {lessonCount} interactive lessons. Real math on every page — not
            animated approximations. Drag a slider, edit a number, watch the
            formula answer back.
          </p>
          <div
            className="animate-fade-up flex flex-wrap items-center gap-3 mb-8"
            style={{ "--delay": "240ms" } as React.CSSProperties}
          >
            <Link
              href="/lessons/dot-product"
              className="focus-ring inline-flex items-center gap-2 min-h-[48px] px-5 py-3 rounded text-[14px] font-semibold bg-accent text-accent-fg hover:bg-accent-hover transition-colors"
            >
              Open lesson 01
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/lessons"
              className="focus-ring inline-flex items-center gap-2 min-h-[48px] px-5 py-3 rounded text-[14px] font-mono text-ink border border-border-strong hover:border-accent hover:text-accent transition-colors"
            >
              Browse the curriculum
            </Link>
          </div>
          <div
            className="animate-fade-up"
            style={{ "--delay": "300ms" } as React.CSSProperties}
          >
            <StatsStrip variant="inline" />
          </div>
        </div>

        <div
          className="relative animate-fade-up order-1 lg:order-2 min-w-0 lg:pt-2"
          style={{ "--delay": "120ms" } as React.CSSProperties}
        >
          <HeroInteractive />
        </div>
      </section>

      {/* RESUME */}
      <div className="mb-16 sm:mb-20">
        <ResumeStrip />
      </div>

      {/* WHY THIS WORKS */}
      <div className="mb-20 sm:mb-28">
        <WhyTiles />
      </div>

      {/* CURRICULUM */}
      <div className="mb-20 sm:mb-28">
        <CurriculumGrid />
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <FaqAccordion />
      </div>

      <Footer />
    </main>
  );
}
