import React from 'react';
import { Search, Monitor } from 'lucide-react';

export function DuskReading() {
  return (
    <div className="min-h-screen bg-[#1c1e24] text-[#d4cfc3] font-['Atkinson_Hyperlegible',_sans-serif] selection:bg-[#e29e3a]/30 selection:text-[#fff9ec]">
      {/* Top Nav */}
      <nav className="h-12 border-b border-[#2b2e36] flex items-center justify-between px-6 sticky top-0 bg-[#1c1e24]/90 backdrop-blur-sm z-10 font-['Space_Mono',_monospace] text-sm">
        <div className="flex items-center gap-3 text-[#d4cfc3]">
          <span className="text-[#e29e3a]">◆</span>
          <span className="tracking-wide text-[#a4a094]">tensor dojo</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-[#e29e3a] hover:text-[#f4b655] transition-colors">Lessons</a>
          <a href="#" className="text-[#a4a094] hover:text-[#d4cfc3] transition-colors">Concept map</a>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252830] rounded border border-[#2b2e36] text-[#868378] ml-2">
            <Search size={14} />
            <span className="mr-4">Search</span>
            <span className="border border-[#383d47] px-1 rounded text-xs">Ctrl K</span>
          </div>
          <button className="text-[#868378] hover:text-[#d4cfc3] transition-colors" aria-label="Toggle theme">
            <Monitor size={16} />
          </button>
        </div>
      </nav>

      {/* Lesson Content */}
      <main className="max-w-[65ch] mx-auto px-6 pt-16 pb-32">
        <article className="space-y-12 leading-[1.8] text-[17px]">
          
          <header className="space-y-6">
            <p className="font-['Space_Mono',_monospace] text-xs uppercase tracking-[0.15em] text-[#a4a094]">
              LESSON · 7 MIN
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#e8e4da]">
              Dot product as alignment
            </h1>
            <p className="text-xl text-[#b8b3a5] leading-relaxed">
              The dot product is a single number that says how much two vectors point the same way. Sign tells you direction, magnitude tells you how aligned and how big. It is the only operation in attention, in cosine similarity, and in every projection that follows.
            </p>
          </header>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#e8e4da] mt-12 mb-4">
              How aligned are two vectors?
            </h2>
            <p>
              A word embedding wants to know which other embeddings point the same way. A query wants to know which keys in a retrieval index are aligned with it. A classifier wants to know which side of a decision boundary a sample falls on. All of these are the same question, asked of two vectors. The answer is a single number.
            </p>
            <p>
              <strong className="text-[#e8e4da] font-bold">The dot product is that number.</strong> It is the natural choice — symmetric, smooth, and built from a single sum of products — and every "how aligned?" computation in a neural network reduces to it. One formula; three ways to read it.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#e8e4da] mt-12 mb-4">
              The formula
            </h2>
            <p>
              For two equal-length vectors <em className="italic">a</em> = (a₁, …, aₙ) and <em className="italic">b</em> = (b₁, …, bₙ):
            </p>
            
            <div className="py-8 text-center text-2xl font-['Lora',_serif] italic text-[#e8e4da] tracking-wide">
              a · b &nbsp;=&nbsp; Σᵢ aᵢ bᵢ &nbsp;=&nbsp; ‖a‖ ‖b‖ cos θ
            </div>

            <ol className="list-decimal list-outside ml-5 space-y-4 marker:text-[#868378]">
              <li className="pl-2">
                The <strong className="text-[#e8e4da] font-bold">component form</strong> Σ aᵢbᵢ is the implementation: multiply componentwise, sum. No square roots, no trig.
              </li>
              <li className="pl-2">
                The <strong className="text-[#e8e4da] font-bold">geometric form</strong> ‖a‖‖b‖cos θ is the meaning: cos θ is the alignment, and the magnitudes scale it.
              </li>
              <li className="pl-2">
                The <strong className="text-[#e8e4da] font-bold">sign of the dot product</strong> is the sign of cos θ: positive when acute, zero when orthogonal, negative when obtuse.
              </li>
            </ol>

            <figure className="mt-8 mb-8">
              <figcaption className="font-['Space_Mono',_monospace] text-xs text-[#868378] mb-2 uppercase tracking-wider">
                The component form — the form you actually compute.
              </figcaption>
              <pre className="bg-[#15171b] border border-[#262930] rounded-lg p-5 overflow-x-auto shadow-inner text-[14px] leading-[1.6]">
                <code className="font-['Space_Mono',_monospace] text-[#a9b0bd]">
<span className="text-[#e29e3a]">def</span> <span className="text-[#7daea3]">dot</span>(a, b):{'\n'}
{'    '}<span className="text-[#e29e3a]">return</span> <span className="text-[#a4a094]">sum</span>(x * y <span className="text-[#e29e3a]">for</span> x, y <span className="text-[#e29e3a]">in</span> <span className="text-[#a4a094]">zip</span>(a, b)){'\n'}
{'\n'}
<span className="text-[#656c78]"># 2D example</span>{'\n'}
dot([<span className="text-[#d8985b]">1.5</span>, <span className="text-[#d8985b]">0.5</span>], [<span className="text-[#d8985b]">1.0</span>, <span className="text-[#d8985b]">0.0</span>])  <span className="text-[#656c78]"># → 1.5</span>
                </code>
              </pre>
            </figure>

            <div className="mt-10 bg-gradient-to-br from-[#272117] to-[#1c1e24] border border-[#e29e3a]/20 rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#e29e3a]/60"></div>
              <p className="font-['Space_Mono',_monospace] text-xs uppercase tracking-[0.15em] text-[#e29e3a] mb-3 font-semibold">
                TRY IT · DOT EXPLORER
              </p>
              <p className="text-[16px] leading-[1.7]">
                Drag <em className="italic">a</em> so it lies parallel to <em className="italic">b</em>. The dot product jumps to ‖a‖‖b‖ (its maximum). Now drag <em className="italic">a</em> so it lies perpendicular to <em className="italic">b</em>. The dot product snaps to zero, regardless of magnitude. <strong className="text-[#e8e4da] font-bold">Alignment</strong> in isolation.
              </p>
            </div>
          </section>
        </article>

        {/* Footer Nav */}
        <footer className="mt-20 pt-8 border-t border-[#2b2e36] flex justify-end text-right">
          <a href="#" className="group block hover:bg-[#252830]/50 p-4 rounded-lg transition-colors border border-transparent hover:border-[#2b2e36]">
            <p className="font-['Space_Mono',_monospace] text-xs uppercase tracking-widest text-[#868378] mb-2">
              NEXT LESSON
            </p>
            <p className="text-[#e29e3a] font-bold text-lg group-hover:text-[#f4b655] transition-colors">
              Matrix multiplication: the dot product, stacked →
            </p>
          </a>
        </footer>
      </main>
    </div>
  );
}
