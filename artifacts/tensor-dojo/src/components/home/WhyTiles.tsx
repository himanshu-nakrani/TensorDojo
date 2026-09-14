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
 * "Why this works" section — three paper cards in the lab-notebook
 * voice. Type does the work; the lab-card surface provides quiet
 * separation without SaaS glass chrome.
 */
export function WhyTiles() {
  return (
    <section aria-labelledby="why-heading">
      <div className="mb-8">
        <div className="text-[12px] uppercase tracking-[0.12em] text-fg-muted font-mono mb-3">
          Why this works
        </div>
        <h2
          id="why-heading"
          className="lab-display text-[1.85rem] sm:text-[2.15rem] text-ink leading-[1.15]"
        >
          A different way to learn the same math.
        </h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {TILES.map((tile) => (
          <li key={tile.eyebrow} className="lab-card p-6 sm:p-7">
            <div className="text-[12px] uppercase tracking-[0.12em] font-mono text-accent mb-3">
              {tile.eyebrow}
            </div>
            <h3 className="text-[1.125rem] font-semibold text-ink tracking-[-0.005em] mb-2 leading-snug">
              {tile.headline}
            </h3>
            <p className="text-[14px] text-muted leading-relaxed">{tile.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
