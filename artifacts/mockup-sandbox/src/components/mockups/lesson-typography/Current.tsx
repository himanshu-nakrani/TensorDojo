/**
 * Baseline: faithful replica of Tensor Dojo's current lesson reading
 * experience. Exact tokens copied from artifacts/tensor-dojo/src/index.css.
 * Fonts: Inter (prose + headings), JetBrains Mono (labels, code).
 */
const t = {
  bg: 'rgb(251 250 248)',
  bgElevated: 'rgb(255 255 255)',
  bgCode: 'rgb(244 241 236)',
  fg: 'rgb(26 24 21)',
  fgMuted: 'rgb(74 71 66)',
  fgSubtle: 'rgb(111 108 104)',
  border: 'rgb(230 226 219)',
  borderStrong: 'rgb(207 201 191)',
  accent: 'rgb(21 128 61)',
  accentSoft: 'rgba(21, 128, 61, 0.10)',
  accentDim: 'rgba(21, 128, 61, 0.32)',
};

const sans = "'Inter', system-ui, sans-serif";
const mono = "'JetBrains Mono', ui-monospace, monospace";

const paper = {
  backgroundImage: [
    `linear-gradient(to right, rgba(31,26,22,0.035), rgba(31,26,22,0.035) 1px, transparent 1px, transparent)`,
    `linear-gradient(to bottom, rgba(31,26,22,0.035), rgba(31,26,22,0.035) 1px, transparent 1px, transparent)`,
    `linear-gradient(to right, rgba(31,26,22,0.018), rgba(31,26,22,0.018) 1px, transparent 1px, transparent)`,
    `linear-gradient(to bottom, rgba(31,26,22,0.018), rgba(31,26,22,0.018) 1px, transparent 1px, transparent)`,
  ].join(', '),
  backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
};

export function Current() {
  return (
    <div style={{ backgroundColor: t.bg, color: t.fg, fontFamily: sans, minHeight: '100vh', ...paper }}>
      {/* Top nav */}
      <nav
        style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: 'rgba(251,250,248,0.85)' }}
        className="flex items-center justify-between px-6 h-12"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: t.accent, fontSize: 11 }}>◆</span>
          <span style={{ fontFamily: mono, fontWeight: 600, fontSize: 14 }}>tensor dojo</span>
        </div>
        <div className="flex items-center gap-6" style={{ fontSize: 13.5 }}>
          <span style={{ color: t.accent, fontWeight: 500 }}>Lessons</span>
          <span style={{ color: t.fgMuted }}>Concept map</span>
          <span className="flex items-center gap-1.5" style={{ color: t.fgMuted }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="4.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" />
            </svg>
            Search
            <kbd
              style={{
                fontFamily: mono, fontSize: 10, color: t.fgSubtle,
                border: `1px solid ${t.border}`, borderRadius: 4, padding: '1px 5px',
                backgroundColor: t.bgElevated,
              }}
            >
              Ctrl K
            </kbd>
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t.fgMuted} strokeWidth="1.8">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
      </nav>

      <article className="mx-auto px-10 py-14" style={{ maxWidth: 860 }}>
        {/* Lesson header */}
        <header className="mb-10">
          <div
            className="flex items-center gap-3 mb-5"
            style={{ fontFamily: mono, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.fgMuted }}
          >
            <span>Lesson</span>
            <span style={{ color: t.borderStrong }}>·</span>
            <span>7 min</span>
          </div>
          <h1 style={{ fontSize: '2.75rem', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 20 }}>
            Dot product as alignment
          </h1>
          <p style={{ fontSize: '1.125rem', color: t.fgMuted, lineHeight: 1.65, maxWidth: 640 }}>
            The dot product is a single number that says how much two vectors point the same
            way. Sign tells you direction, magnitude tells you how aligned and how big. It is
            the only operation in attention, in cosine similarity, and in every projection
            that follows.
          </p>
        </header>

        {/* Prose */}
        <div style={{ fontSize: 16, lineHeight: 1.75, maxWidth: 680 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 16, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
            How aligned are two vectors?
          </h2>
          <p style={{ marginBottom: 16 }}>
            A word embedding wants to know which other embeddings point the same way. A query
            wants to know which keys in a retrieval index are aligned with it. A classifier
            wants to know which side of a decision boundary a sample falls on. All of these
            are the same question, asked of two vectors. The answer is a single number.
          </p>
          <p style={{ marginBottom: 32 }}>
            <strong style={{ fontWeight: 600 }}>The dot product is that number.</strong> It is
            the natural choice — symmetric, smooth, and built from a single sum of products —
            and every "how aligned?" computation in a neural network reduces to it. One
            formula; three ways to read it.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 16, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
            The formula
          </h2>
          <p style={{ marginBottom: 20 }}>
            For two equal-length vectors <em>a</em> = (a₁, …, aₙ) and <em>b</em> = (b₁, …, bₙ):
          </p>

          {/* Display formula */}
          <div
            className="text-center"
            style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, padding: '20px 0 28px', color: t.fg }}
          >
            a · b &nbsp;=&nbsp; Σ<sub style={{ fontSize: 13 }}>i</sub> a<sub style={{ fontSize: 13 }}>i</sub> b<sub style={{ fontSize: 13 }}>i</sub> &nbsp;=&nbsp; ‖a‖ ‖b‖ cos θ
          </div>

          <ol style={{ paddingLeft: 24, marginBottom: 32, display: 'grid', gap: 12 }}>
            <li>
              The <strong style={{ fontWeight: 600 }}>component form</strong> Σ aᵢbᵢ is the
              implementation: multiply componentwise, sum. No square roots, no trig.
            </li>
            <li>
              The <strong style={{ fontWeight: 600 }}>geometric form</strong> ‖a‖‖b‖cos θ is
              the meaning: cos θ is the alignment, and the magnitudes scale it.
            </li>
            <li>
              The <strong style={{ fontWeight: 600 }}>sign of the dot product</strong> is the
              sign of cos θ: positive when acute, zero when orthogonal, negative when obtuse.
            </li>
          </ol>

          {/* Code block */}
          <figure style={{ marginBottom: 32 }}>
            <pre
              style={{
                fontFamily: mono, fontSize: 13.5, lineHeight: 1.6,
                backgroundColor: t.bgCode, border: `1px solid ${t.border}`,
                borderRadius: 8, padding: '16px 18px', overflowX: 'auto',
              }}
            >
              <code>{`def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

# 2D example
dot([1.5, 0.5], [1.0, 0.0])  # → 1.5`}</code>
            </pre>
            <figcaption style={{ fontSize: 13, color: t.fgSubtle, marginTop: 8 }}>
              The component form — the form you actually compute.
            </figcaption>
          </figure>

          {/* Callout */}
          <aside
            style={{
              border: `1px solid ${t.accentDim}`, backgroundColor: t.accentSoft,
              borderRadius: 8, padding: '16px 18px', marginBottom: 40,
            }}
          >
            <div
              style={{
                fontFamily: mono, fontSize: 11, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: t.accent, marginBottom: 8, fontWeight: 500,
              }}
            >
              Try it · Dot explorer
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: t.fg }}>
              Drag <em>a</em> so it lies parallel to <em>b</em>. The dot product jumps to
              ‖a‖‖b‖ (its maximum). Now drag <em>a</em> so it lies perpendicular to{' '}
              <em>b</em>. The dot product snaps to zero, regardless of magnitude.{' '}
              <strong style={{ fontWeight: 600 }}>Alignment</strong> in isolation.
            </p>
          </aside>

          {/* Prev/Next */}
          <nav style={{ borderTop: `1px solid ${t.border}`, paddingTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: mono, fontSize: 12, textTransform: 'uppercase',
                  letterSpacing: '0.12em', color: t.fgSubtle, marginBottom: 4,
                }}
              >
                Next lesson
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                Matrix multiplication: the dot product, stacked
                <span style={{ fontFamily: mono, color: t.fgSubtle }}>→</span>
              </div>
            </div>
          </nav>
        </div>
      </article>
    </div>
  );
}
