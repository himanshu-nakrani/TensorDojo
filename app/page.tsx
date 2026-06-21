import Link from 'next/link';
import { HeroInteractive } from '@/components/home/HeroInteractive';
import { ResumeStrip } from '@/components/home/ResumeStrip';
import { StatsStrip } from '@/components/home/StatsStrip';
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
      <section className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center pb-16 sm:pb-24">
        {/* Ambient accent glow — soft halo behind the hero that adds
            depth without putting accent on static text. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[420px] max-w-[120vw]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgb(var(--accent) / 0.08), transparent 70%)',
          }}
        />

        {/* On mobile the interactive lands above the CTAs so the
            demo is the first thing you see scrolling past the
            headline. Desktop puts the interactive on the right. */}
        <div className="relative order-2 lg:order-1 max-w-[560px]">
          <div
            className="animate-fade-up text-[12px] uppercase tracking-[0.18em] text-fg-muted font-mono mb-5"
            style={{ '--delay': '0ms' } as React.CSSProperties}
          >
            Tensor Dojo
          </div>
          <h1
            className="animate-fade-up font-semibold text-ink leading-[1.05] tracking-[-0.02em] text-balance mb-5 text-[2.5rem] sm:text-[3rem] lg:text-[3.25rem]"
            style={{ '--delay': '80ms' } as React.CSSProperties}
          >
            Learn AI by{' '}
            <span className="bg-gradient-to-r from-ink to-accent bg-clip-text text-transparent">
              manipulating it.
            </span>
          </h1>
          <p
            className="animate-fade-up text-[1.05rem] sm:text-[1.125rem] text-muted leading-relaxed mb-8 text-pretty"
            style={{ '--delay': '160ms' } as React.CSSProperties}
          >
            Every concept is something you can move, change, and watch
            respond. Drag a slider, edit a number, read a result.
          </p>
          <div
            className="animate-fade-up flex flex-wrap items-center gap-3"
            style={{ '--delay': '240ms' } as React.CSSProperties}
          >
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

        <div
          className="relative animate-fade-up order-1 lg:order-2 min-w-0"
          style={{ '--delay': '120ms' } as React.CSSProperties}
        >
          <HeroInteractive />
        </div>
      </section>

      {/* STATS ---------------------------------------------------- */}
      <div className="mb-16 sm:mb-24">
        <StatsStrip />
      </div>

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
