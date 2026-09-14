import React from 'react';

export function HumanistClarity() {
  const styles = {
    sans: { fontFamily: '"IBM Plex Sans", sans-serif' },
    mono: { fontFamily: '"IBM Plex Mono", monospace' },
    math: { fontFamily: 'Georgia, serif' },
  };

  return (
    <div 
      className="min-h-screen text-slate-900 bg-slate-50 selection:bg-blue-100" 
      style={styles.sans}
    >
      {/* Top Nav */}
      <header className="h-12 border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2" style={styles.mono}>
          <span className="text-blue-600 text-sm">◆</span>
          <span className="font-medium tracking-tight text-slate-800 text-sm">tensor dojo</span>
        </div>
        
        <nav className="flex items-center gap-6 text-sm text-slate-600" style={styles.mono}>
          <a href="#" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">Lessons</a>
          <a href="#" className="hover:text-slate-900 transition-colors hidden sm:block">Concept map</a>
          
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded border border-slate-200 bg-white shadow-sm text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span className="text-xs">Search</span>
            <span className="text-[10px] tracking-wider ml-2 border border-slate-200 rounded px-1 bg-slate-50">Ctrl K</span>
          </div>

          <button className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle theme">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <article className="mx-auto max-w-[65ch]">
          {/* Header */}
          <header className="mb-12 sm:mb-16">
            <div 
              className="text-blue-600 text-[11px] font-bold uppercase tracking-widest mb-6" 
              style={styles.mono}
            >
              LESSON · 7 MIN
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-6 font-display">
              Dot product as alignment
            </h1>
            
            <p className="text-xl leading-relaxed text-slate-600 font-medium">
              The dot product is a single number that says how much two vectors point the same way. Sign tells you direction, magnitude tells you how aligned and how big. It is the only operation in attention, in cosine similarity, and in every projection that follows.
            </p>
          </header>

          <div className="space-y-12 sm:space-y-16 text-[17px] leading-[1.7] text-slate-800">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">
                How aligned are two vectors?
              </h2>
              <div className="space-y-6">
                <p>
                  A word embedding wants to know which other embeddings point the same way. A query wants to know which keys in a retrieval index are aligned with it. A classifier wants to know which side of a decision boundary a sample falls on. All of these are the same question, asked of two vectors. The answer is a single number.
                </p>
                <p>
                  <strong className="font-semibold text-slate-900">The dot product is that number.</strong> It is the natural choice — symmetric, smooth, and built from a single sum of products — and every "how aligned?" computation in a neural network reduces to it. One formula; three ways to read it.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">
                The formula
              </h2>
              <div className="space-y-8">
                <p>
                  For two equal-length vectors <em className="italic text-slate-900">a</em> = (a₁, …, aₙ) and <em className="italic text-slate-900">b</em> = (b₁, …, bₙ):
                </p>

                <div className="py-8 my-8 border-y border-slate-200 bg-white/50 flex justify-center text-2xl sm:text-3xl text-slate-900">
                  <span style={styles.math} className="italic tracking-wide">
                    a · b  =  Σᵢ aᵢ bᵢ  =  ‖a‖ ‖b‖ cos θ
                  </span>
                </div>

                <ol className="list-decimal list-outside ml-6 space-y-4 marker:text-slate-400 marker:font-medium">
                  <li className="pl-2">
                    The <strong className="font-semibold text-slate-900">component form</strong> Σ aᵢbᵢ is the implementation: multiply componentwise, sum. No square roots, no trig.
                  </li>
                  <li className="pl-2">
                    The <strong className="font-semibold text-slate-900">geometric form</strong> ‖a‖‖b‖cos θ is the meaning: cos θ is the alignment, and the magnitudes scale it.
                  </li>
                  <li className="pl-2">
                    The <strong className="font-semibold text-slate-900">sign of the dot product</strong> is the sign of cos θ: positive when acute, zero when orthogonal, negative when obtuse.
                  </li>
                </ol>

                <figure className="my-10">
                  <figcaption className="text-sm text-slate-500 mb-3 ml-1" style={styles.mono}>
                    The component form — the form you actually compute.
                  </figcaption>
                  <div className="bg-slate-900 text-slate-50 rounded-lg p-5 overflow-x-auto shadow-sm">
                    <pre className="text-[14px] leading-relaxed" style={styles.mono}>
                      <code>
<span className="text-blue-300">def</span> <span className="text-blue-100">dot</span>(a, b):{'\n'}
    <span className="text-blue-300">return</span> sum(x * y <span className="text-blue-300">for</span> x, y <span className="text-blue-300">in</span> zip(a, b)){'\n'}
{'\n'}
<span className="text-slate-500"># 2D example</span>{'\n'}
dot([<span className="text-blue-200">1.5</span>, <span className="text-blue-200">0.5</span>], [<span className="text-blue-200">1.0</span>, <span className="text-blue-200">0.0</span>])  <span className="text-slate-500"># → 1.5</span>
                      </code>
                    </pre>
                  </div>
                </figure>

                <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-6 my-10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" aria-hidden="true" />
                  <div className="text-blue-700 text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={styles.mono}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>
                    TRY IT · DOT EXPLORER
                  </div>
                  <p className="text-slate-800 leading-relaxed text-[16px]">
                    Drag <em className="italic font-medium">a</em> so it lies parallel to <em className="italic font-medium">b</em>. The dot product jumps to ‖a‖‖b‖ (its maximum). Now drag <em className="italic font-medium">a</em> so it lies perpendicular to <em className="italic font-medium">b</em>. The dot product snaps to zero, regardless of magnitude. <strong className="font-semibold text-slate-900">Alignment</strong> in isolation.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </article>
      </main>

      {/* Footer Nav */}
      <footer className="mt-12 border-t border-slate-200 pb-20">
        <div className="mx-auto max-w-[65ch] px-4 sm:px-0 pt-8 flex justify-end">
          <a href="#" className="group block text-right">
            <div className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-2 transition-colors group-hover:text-blue-600" style={styles.mono}>
              NEXT LESSON
            </div>
            <div className="text-lg font-medium text-slate-900 transition-colors group-hover:text-blue-600 flex items-center gap-1 justify-end">
              Matrix multiplication: the dot product, stacked <span className="text-blue-600 transform transition-transform group-hover:translate-x-1">→</span>
            </div>
          </a>
        </div>
      </footer>
    </div>
  );
}
