import React from "react";
import { Search, MonitorPlay } from "lucide-react";
import "./_paperink.css";

export function PaperInk() {
  return (
    <div className="theme-paper-ink font-serif text-[18px] leading-[1.65] antialiased">
      {/* Top Nav */}
      <header className="h-12 pi-border-b flex items-center justify-between px-6 sticky top-0 bg-[#fbf9f6]/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 text-[#a03b26]">
          <div className="w-2.5 h-2.5 bg-[#a03b26] rotate-45" />
          <span className="pi-font-label text-xs font-semibold text-[#2c2a28]">
            tensor dojo
          </span>
        </div>
        <div className="flex items-center gap-6 pi-font-label text-[11px] font-medium text-[var(--pi-ink-muted)]">
          <a href="#" className="text-[#a03b26]">
            Lessons
          </a>
          <a href="#" className="hover:text-[var(--pi-ink)] transition-colors">
            Concept map
          </a>
          <div className="flex items-center gap-2 bg-[#f2efe9] px-2 py-1 rounded-[3px] border border-[var(--pi-border)] text-gray-500">
            <Search size={12} />
            <span>Search</span>
            <span className="pi-font-mono text-[9px] border border-[var(--pi-border)] bg-[#fbf9f6] px-1 rounded-sm text-[#2c2a28] ml-1">
              Ctrl K
            </span>
          </div>
          <button className="w-5 h-5 flex items-center justify-center hover:text-[var(--pi-ink)] transition-colors">
            <MonitorPlay size={14} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[65ch] mx-auto pt-16 pb-24 px-6 box-content">
        <article>
          <header className="mb-10">
            <p className="pi-font-label text-[11px] text-[var(--pi-ink-muted)] mb-4">
              LESSON &middot; 7 MIN
            </p>
            <h1 className="text-4xl font-semibold leading-tight mb-6 text-[var(--pi-ink)]">
              Dot product as alignment
            </h1>
            <p className="text-xl text-[var(--pi-ink-muted)] leading-snug">
              The dot product is a single number that says how much two vectors
              point the same way. Sign tells you direction, magnitude tells you
              how aligned and how big. It is the only operation in attention, in
              cosine similarity, and in every projection that follows.
            </p>
          </header>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--pi-ink)]">
              How aligned are two vectors?
            </h2>
            <p className="mb-5 text-[var(--pi-ink)]">
              A word embedding wants to know which other embeddings point the
              same way. A query wants to know which keys in a retrieval index
              are aligned with it. A classifier wants to know which side of a
              decision boundary a sample falls on. All of these are the same
              question, asked of two vectors. The answer is a single number.
            </p>
            <p className="mb-5 text-[var(--pi-ink)]">
              <strong className="font-semibold">
                The dot product is that number.
              </strong>{" "}
              It is the natural choice — symmetric, smooth, and built from a
              single sum of products — and every "how aligned?" computation in a
              neural network reduces to it. One formula; three ways to read it.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--pi-ink)]">
              The formula
            </h2>
            <p className="mb-6 text-[var(--pi-ink)]">
              For two equal-length vectors <em className="italic">a</em> =
              (a₁, …, aₙ) and <em className="italic">b</em> = (b₁, …,
              bₙ):
            </p>

            <div className="my-8 text-center text-2xl font-serif italic tracking-wide text-[var(--pi-ink)]">
              a &middot; b &nbsp;=&nbsp; &Sigma;<sub>i</sub> a<sub>i</sub> b<sub>i</sub>{" "}
              &nbsp;=&nbsp; ‖a‖ ‖b‖ cos &theta;
            </div>

            <ol className="list-decimal list-outside ml-6 mb-8 text-[var(--pi-ink)] space-y-3">
              <li className="pl-2">
                The{" "}
                <strong className="font-semibold">component form</strong> &Sigma;
                a<sub>i</sub>b<sub>i</sub> is the implementation: multiply
                componentwise, sum. No square roots, no trig.
              </li>
              <li className="pl-2">
                The{" "}
                <strong className="font-semibold">geometric form</strong> ‖a‖‖b‖cos
                &theta; is the meaning: cos &theta; is the alignment, and the
                magnitudes scale it.
              </li>
              <li className="pl-2">
                The{" "}
                <strong className="font-semibold">
                  sign of the dot product
                </strong>{" "}
                is the sign of cos &theta;: positive when acute, zero when
                orthogonal, negative when obtuse.
              </li>
            </ol>

            <figure className="my-8">
              <div className="pi-bg-code border border-[var(--pi-border)] rounded-md overflow-hidden">
                <pre className="p-4 pi-font-mono text-sm leading-relaxed overflow-x-auto text-[var(--pi-ink)]">
                  <code>
<span className="text-[#a03b26]">def</span> <span className="text-[var(--pi-ink)]">dot</span>(a, b):{"\n"}
    <span className="text-[#a03b26]">return</span> <span className="text-[var(--pi-ink)]">sum</span>(x * y <span className="text-[#a03b26]">for</span> x, y <span className="text-[#a03b26]">in</span> <span className="text-[var(--pi-ink)]">zip</span>(a, b)){"\n"}
{"\n"}
<span className="text-[var(--pi-ink-muted)]"># 2D example</span>{"\n"}
<span className="text-[var(--pi-ink)]">dot</span>([<span className="text-[#a03b26]">1.5</span>, <span className="text-[#a03b26]">0.5</span>], [<span className="text-[#a03b26]">1.0</span>, <span className="text-[#a03b26]">0.0</span>])  <span className="text-[var(--pi-ink-muted)]"># → 1.5</span>
                  </code>
                </pre>
              </div>
              <figcaption className="mt-3 text-sm text-[var(--pi-ink-muted)] italic">
                The component form — the form you actually compute.
              </figcaption>
            </figure>

            <div className="my-10 pi-bg-accent-tint border-l-4 border-[var(--pi-accent)] p-6 rounded-r-md">
              <p className="pi-font-label text-[10px] text-[#a03b26] mb-3">
                TRY IT &middot; DOT EXPLORER
              </p>
              <p className="text-[var(--pi-ink)] m-0">
                Drag <em className="italic">a</em> so it lies parallel to{" "}
                <em className="italic">b</em>. The dot product jumps to ‖a‖‖b‖
                (its maximum). Now drag <em className="italic">a</em> so it lies
                perpendicular to <em className="italic">b</em>. The dot product
                snaps to zero, regardless of magnitude.{" "}
                <strong className="font-semibold text-[#a03b26]">
                  Alignment
                </strong>{" "}
                in isolation.
              </p>
            </div>
          </section>
        </article>

        {/* Footer Nav */}
        <footer className="mt-16 pt-8 pi-border-t flex justify-end">
          <a
            href="#"
            className="group block text-right max-w-[280px] hover:opacity-80 transition-opacity"
          >
            <p className="pi-font-label text-[11px] text-[var(--pi-ink-muted)] mb-1">
              NEXT LESSON
            </p>
            <p className="font-semibold text-lg text-[#a03b26] leading-tight">
              Matrix multiplication: the dot product, stacked &rarr;
            </p>
          </a>
        </footer>
      </main>
    </div>
  );
}