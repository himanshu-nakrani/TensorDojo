interface Tile {
  eyebrow: string;
  headline: string;
  body: string;
}

const TILES: readonly Tile[] = [
  {
    eyebrow: '01 / Manipulate',
    headline: 'Manipulate, don’t memorize.',
    body:
      'The math is interactive. Change an input, watch the output update — every formula in every lesson is a live thing on the page.',
  },
  {
    eyebrow: '02 / Math-honest',
    headline: 'Math-honest.',
    body:
      'The numbers in the simulators are the real operations on real values, not animated approximations. When you drag a vector, the dot product on the screen is the dot product.',
  },
  {
    eyebrow: '03 / No jargon walls',
    headline: 'No jargon walls.',
    body:
      'New terms are grounded in something you’ve already moved with your hands. You don’t read about a softmax before you’ve felt one normalize.',
  },
];

/**
 * "Why this works" section. Three editorial tiles, no state, no
 * fills. Type does the work; the bordered cards just provide
 * separation between the three statements.
 */
export function WhyTiles() {
  return (
    <section aria-labelledby="why-heading">
      <div className="mb-8">
        <div className="text-[12px] uppercase tracking-[0.18em] text-fg-muted font-mono mb-3">
          Why this works
        </div>
        <h2
          id="why-heading"
          className="text-[1.75rem] sm:text-[2rem] font-semibold text-ink leading-[1.15] tracking-[-0.01em]"
        >
          A different way to learn the same math.
        </h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {TILES.map((tile) => (
          <li
            key={tile.eyebrow}
            className="rounded-xl border border-border bg-bg-elevated p-6 sm:p-7 card-surface"
          >
            <div className="text-[12px] uppercase tracking-[0.18em] font-mono text-fg-muted mb-3">
              {tile.eyebrow}
            </div>
            <h3 className="text-[1.125rem] font-semibold text-ink tracking-[-0.005em] mb-2 leading-snug">
              {tile.headline}
            </h3>
            <p className="text-[14px] text-muted leading-relaxed">
              {tile.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
