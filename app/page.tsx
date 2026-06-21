import Link from 'next/link';
import { HeroInteractive } from '@/components/home/HeroInteractive';
import { ResumeStrip } from '@/components/home/ResumeStrip';
import { WhyTiles } from '@/components/home/WhyTiles';
import { CurriculumGrid } from '@/components/home/CurriculumGrid';
import { FaqAccordion } from '@/components/home/FaqAccordion';
import { Footer } from '@/components/home/Footer';

export default function HomePage() {
  return (
    <main
      id="main"
      className="mx-auto px-6 sm:px-10 pt-12 sm:pt-16 max-w-wide"
    >
      {/* HERO ----------------------------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center pb-16 sm:pb-24">
        {/* On mobile the interactive lands above the CTAs so the
            demo is the first thing you see scrolling past the
            headline. Desktop puts the interactive on the right. */}
        <div className="order-2 lg:order-1 max-w-[560px]">
          <div className="text-[12px] uppercase tracking-[0.18em] text-fg-muted font-mono mb-5">
            Tensor Dojo
          </div>
          <h1 className="font-semibold text-ink leading-[1.05] tracking-[-0.02em] text-balance mb-5 text-[2.5rem] sm:text-[3rem] lg:text-[3.25rem]">
            Learn AI by manipulating it.
          </h1>
          <p className="text-[1.05rem] sm:text-[1.125rem] text-muted leading-relaxed mb-8 text-pretty">
            Every concept is something you can move, change, and watch
            respond. Drag a slider, edit a number, read a result.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/lessons/dot-product"
              className="focus-ring inline-flex items-center gap-2 min-h-[48px] px-5 py-3 rounded-md text-[14px] font-mono font-semibold bg-accent text-accent-fg hover:bg-accent-hover transition-colors"
            >
              Start with vectors
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/lessons"
              className="focus-ring inline-flex items-center gap-2 min-h-[48px] px-5 py-3 rounded-md text-[14px] font-mono text-ink border border-border-strong hover:border-accent hover:text-accent transition-colors"
            >
              Browse all lessons
            </Link>
          </div>
        </div>

        <div className="order-1 lg:order-2 min-w-0">
          <HeroInteractive />
        </div>
      </section>

      {/* RESUME (hidden when no progress) ------------------------- */}
      <div className="mb-16 sm:mb-24">
        <ResumeStrip />
      </div>

      {/* WHY THIS WORKS ------------------------------------------- */}
      <div className="mb-20 sm:mb-28">
        <WhyTiles />
      </div>

      {/* CURRICULUM ----------------------------------------------- */}
      <div className="mb-20 sm:mb-28">
        <CurriculumGrid />
      </div>

      {/* FAQ ------------------------------------------------------ */}
      <div className="mb-12">
        <FaqAccordion />
      </div>

      <Footer />
    </main>
  );
}
