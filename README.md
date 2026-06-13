# AI Learning Lab

> **Learn AI engineering by manipulating, implementing, and deploying every concept.**

[![Design Spec](design-spec.md)] | [![Technical Spec](technical-spec.md)] | [![Roadmap](#roadmap) | [![Contributing](#contributing)

---

## 🎯 Vision

AI Learning Lab is a **local-first, interactive learning platform** where every AI engineering concept exists in four synchronized views:

1. **Explanation** — Mental models in prose and diagrams
2. **Interactive Simulation** — Manipulable widgets (sliders, toggles, editable inputs)
3. **Code Notebook** — Runnable Jupyter notebooks that implement the concept
4. **Engineering Lab** — The concept used inside a real mini-system

These views are **synchronized**: change a value in the notebook and the simulation updates; drag a slider and the notebook cell re-runs. Your mental model is constantly tested against executable reality.

---

## ✅ MVP-1: What works now

This is the current build. One lesson, published to the standard the broader spec demands. The rest of this README (and the linked `design-spec.md` / `technical-spec.md`) describe the *destination*, not the work order.

**Stack & surface**
- Static Next.js 15 site — no backend, no DB, no auth, no payments
- MDX-authored lessons with embedded React components
- KaTeX-rendered math (`remark-math` + `rehype-katex`)
- React + SVG interactive diagrams
- Dark-mode design with one accent (teal `#2DD4BF`) reserved for manipulable elements
- One lesson live: **[Softmax: turning scores into a distribution](/lessons/softmax)**

**Quality bar hit**
- `pnpm test` covers the math (`lib/softmax.test.ts`, 6 cases)
- `pnpm build` is clean, TypeScript strict, and statically pre-renders every lesson route
- Slider drag → bar update is single-digit ms (CSS transitions on SVG geometry props, no animation library)

### Quick start (MVP-1)

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Production:

```bash
pnpm build
pnpm start
```

Tests:

```bash
pnpm test
```

Requires Node 18+ and pnpm 9+. That's the whole prerequisite list for MVP-1.

### How to add the next lesson

This is the actual pattern I used — no speculation. When lesson 3+ lands, refactor when the duplication hurts, not before.

1. **Create the folder** `content/lessons/<slug>/` with two files:
   - `meta.ts` — exports a const object with `slug`, `title`, `summary`, `minutes`, `order`. The `order` field controls card ordering on the landing page.
   - `lesson.mdx` — the content. Import components at the top from `@/components/lesson/*` and `@/components/sim/*`, then write Markdown with KaTeX (`$$…$$` display, `$…$` inline) and JSX for interactives.

2. **Register the lesson in `lib/lessons.ts`.** Add an explicit import for both `meta` and the `.mdx` module, then an entry in the `registry` object pointing at `meta` and the `.mdx` default export. The `generateStaticParams` in `app/lessons/[slug]/page.tsx` reads `listSlugs()` from this registry, so adding here is the only wiring needed.

3. **Done.** `pnpm dev` shows the card on the landing page; `/lessons/<slug>` renders it. `pnpm build` pre-renders it as static HTML.

If the new lesson needs a new interactive primitive (e.g. a toggle, a heatmap, a vector field), add it under `components/sim/primitives/` and a composing component under `components/sim/`. If it needs a new math function, put it in `lib/<name>.ts` with a `lib/<name>.test.ts` next to it — that file pair is the convention.

Patterns to copy from the Softmax lesson: `<MathCode>` for side-by-side math + code, `<Callout>` for "try this" prompts, `<SoftmaxExplorer>` / `<ScoreEditor>` as the two interactive shapes (one with a temperature dial, one score-only). The lesson body lives inside `<LessonShell>` automatically — you only author the sections.

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────── Browser ────────────────────────────┐
│  Next.js App                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │  Lesson (MDX)│  │ Simulations  │  │ Notebook UI (Monaco)  │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬────────────┘   │
│         │                │                     │                │
│         │         ┌──────▼─────────────────────▼──────┐         │
│         │         │      Sync Engine (state store)    │         │
│         │         └──────────────┬────────────────────┘         │
│         │                        │                              │
│         │              ┌─────────▼──────────┐                   │
│         │              │  Pyodide Worker    │                   │
│         │              │  (WASM Python)     │                   │
│         │              └────────────────────┘                   │
└─────────┼───────────────────────┬───────────────────────────────┘
          │ HTTPS                 │ HTTPS / WS
┌─────────▼───────────────────────▼───────────────────────────────┐
│  FastAPI Backend (Fly.io/Railway)                                  │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │ Auth     │ │ Progress  │ │ Diagnosis    │ │ Tutor         │  │
│  │ (Clerk)  │ │ API       │ │ API (tier 1) │ │ orchestrator  │  │
│  └──────────┘ └─────┬─────┘ └──────┬───────┘ └──────┬────────┘  │
│                     │              │                │           │
│              ┌──────▼──────────────▼───┐    ┌───────▼────────┐  │
│              │ Postgres (Neon/Supabase)│    │ LLM providers  │  │
│              └─────────────────────────┘    │ MiMo / fallback│  │
│  ┌────────────────────┐ ┌──────────────┐    └────────────────┘  │
│  │ S3-compatible (R2) │ │ Modal        │                        │
│  │ notebooks, exports │ │ hosted exec  │                        │
│  └────────────────────┘ └──────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15+, TypeScript, Tailwind, shadcn/ui | Deployed on Vercel |
| Lessons | MDX, compiled at build time | Content lives in repo |
| Simulations | React + Canvas/D3 | Open-source component library |
| Code Editor | Monaco | Notebook cells + code panels |
| Math Rendering | KaTeX | Server-rendered where possible |
| In-browser Execution | **Pyodide** (Python 3.12 WASM) | NumPy included, runs in Web Worker |
| Hosted Execution | **Modal** | GPU lessons (Pro, Month 4+) |
| Backend | FastAPI | Single service on Fly.io/Railway |
| Database | Postgres (Neon/Supabase) | Managed, serverless tier |
| Auth | Clerk | Don't build auth solo |
| Object Storage | Cloudflare R2 | Notebooks, exports; zero egress fees |
| LLM | Xiaomi MiMo + Anthropic/OpenAI fallback | Orchestrated by Hermes library |
| Payments | Stripe | Checkout + customer portal |
| Analytics | PostHog (product), Sentry (errors) | Observability |

---

## 📚 Project Structure

```
TensorDojo/
├── README.md                    # This file
├── design-spec.md               # Product design specification
├── technical-spec.md           # Technical architecture specification
├── content/                     # Lesson content (future)
│   ├── modules.yaml             # Module ordering and metadata
│   ├── concepts/
│   │   └── graph.yaml           # All concept nodes + edges
│   └── lessons/
│       └── 04-attention/
│           └── 02-self-attention/
│               ├── lesson.mdx    # Explanation content
│               ├── lesson.yaml   # Lesson metadata + sync bindings
│               ├── simulation.tsx # Interactive simulation component
│               ├── notebook.ipynb # Canonical notebook
│               ├── solution.ipynb # Solution notebook
│               ├── quiz.yaml     # Questions with tagged distractors
│               └── diagram.svg    # Static diagrams
├── frontend/                    # Next.js application (future)
│   ├── app/
│   ├── components/
│   └── lib/
├── backend/                     # FastAPI application (future)
│   ├── api/
│   ├── models/
│   └── main.py
├── scripts/                     # Utility scripts
│   └── lesson-lint/             # Content validation suite
├── .env.example
├── docker-compose.yml
├── requirements.txt
└── package.json
```

---

## 🎓 Learning Experience

### Core Learning Loop

```
Observe      → Read the mental model. See the diagram.
   ↓
Manipulate   → Tweak sliders, edit inputs, toggle masks.
   ↓
Predict      → Commit to a guess: "what will change?"
   ↓
Run          → Execute. Get the actual result.
   ↓
Compare      → Mental model vs reality. Mismatch = diagnosable moment.
   ↓
Transfer     → Apply it: in a notebook, in a lab, in a mini-system.
```

### Key Features

#### ✅ Concept Debugger (The Moat)
When you get something wrong, the platform diagnoses:
1. **The confusion, named** — "You confused attention score with attention weight."
2. **The distinction, stated** — "Score = raw Q·K similarity. Weight = softmax(score)."
3. **The experiment** — A deep link into a simulation pre-configured to demonstrate the distinction.

#### ✅ Notebook–Simulation Sync
- Drag a slider → notebook cell rewrites and re-runs
- Edit notebook variable → slider animates to new value
- Bidirectional, per-variable binding declared in lesson config
- **<500ms re-run budget** for causal interaction

#### ✅ Concept Graph
- ~120 concepts at full build-out
- Prerequisite-based routing
- Skip-ahead testing for practitioners
- Progress visualization (known/in-progress/unknown)

#### ✅ AI Tutor (Pro Feature)
- Chat panel on every lesson page
- Powered by Hermes orchestrator with Xiaomi MiMo (default) + Anthropic fallback
- **Action chips:** Show fix, Run experiment, Explain more
- Guardrails: never writes full lab solutions; hint mode for labs

#### ✅ Labs
Each module ends in a real mini-system:
- Foundations: Gradient descent visualizer
- Neural Networks: MNIST classifier
- Tokenization: BPE tokenizer from scratch
- Attention: **Tiny GPT** — character-level GPT training
- Training: Training-run debugger
- AI Engineering: RAG pipeline over your documents

---

## 📊 Product Modules

| # | Module | Concepts | Lessons | Status |
|---|--------|----------|---------|--------|
| 1 | **Foundations** | Python for tensors, NumPy, vectors/matrices, dot product, gradients, loss functions, optimization | 8 | Planned (Month 6) |
| 2 | **Neural Networks** | Perceptron, MLP, activations, backprop, initialization, normalization, overfitting | 7 | Planned (Month 2) |
| 3 | **Tokenization & Embeddings** | Tokenization, BPE, embeddings, positional encoding | 5 | Planned (Month 2) |
| 4 | **Attention & Transformers** | Self-attention, multi-head, causal mask, layer norm, residuals, transformer block, GPT | 7 | **Month 1 (Vertical Slice)** |
| 5 | **Training** | Datasets, batching, cross-entropy, optimizers, schedules, evaluation | 6 | Planned (Month 4) |
| 6 | **AI Engineering** | RAG, vector DBs, chunking, evals, agents, tool calling, observability, deployment | 9 | Planned (Month 5) |

**Total at full build-out:** ~42 lessons, ~120 graph concepts, 6 labs

---

## 💰 Pricing

| Feature | Free | Pro ($20/mo) | Team ($49/seat/mo) |
|---------|------|--------------|--------------------|
| Static lessons + diagrams | ✅ | ✅ | ✅ |
| Simulations | ✅ All | ✅ All | ✅ All |
| Notebooks (download + run) | ✅ | ✅ | ✅ |
| Tier-1 (rule-based) diagnosis | ✅ | ✅ | ✅ |
| AI Tutor | ❌ | ✅ | ✅ |
| LLM misconception diagnosis | ❌ | ✅ | ✅ |
| Hosted notebook execution (GPU) | ❌ | ✅ | ✅ |
| Progress tracking + concept map | Local only | ✅ Synced | ✅ Synced |
| Lab grading with feedback | ❌ | ✅ | ✅ |
| Private lessons / custom graphs | ❌ | ❌ | ✅ |
| Team analytics + onboarding | ❌ | ❌ | ✅ |

**Free tier philosophy:** Genuinely good — it's our marketing. Simulations and rule-based diagnosis stay free because they run client-side at zero marginal cost.

---

## 🗺️ Roadmap

### Month 1: Attention Studio Vertical Slice ✅ **IN PROGRESS**
- 4 lessons in Module 4 (self-attention, masking, multi-head, transformer block)
- 4 simulations
- 2 notebooks (NumPy + PyTorch)
- Tiny GPT lab (manual checkpoints)
- Quiz per lesson with tagged distractors + variants
- Tier-1 diagnosis
- Tutor MVP behind allowlist
- Sync engine meeting 500ms re-run budget
- Stripe billing

### Month 2: Tokenization & Embeddings Module
- 5 lessons
- BPE simulation
- Embedding explorer
- Concept graph live with routing

### Month 3: Transformer Depth
- Full Module 4
- In-browser Tiny GPT training
- Lab checkpoints + grading v1

### Month 4: Training Module
- 6 lessons
- Training-run debugger lab
- Hosted execution (Pro) for larger training runs

### Month 5: AI Engineering Module
- RAG, agents, evals lessons
- RAG-over-your-docs lab
- Tier-2 LLM diagnosis

### Month 6: Public Launch
- Foundations + NN modules
- Team tier
- Content expansion cadence

**Sequencing rationale:** Attention Studio first because it's the hardest content to fake and strongest demo. Foundations written *last* — patterns are established by then, and beginners get the most polished treatment.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) (coming soon) for details.

### Content Authoring

Lessons are defined as files in the `content/` directory:

```
content/lessons/{module}/{lesson}/
├── lesson.mdx          # Explanation content
├── lesson.yaml         # Metadata: id, prerequisites, concepts, sync bindings
├── simulation.tsx      # Interactive simulation component
├── notebook.ipynb      # Canonical notebook
├── solution.ipynb      # Solution notebook for checkpoints
├── quiz.yaml           # Questions with tagged distractors
└── diagram.svg         # Static diagrams
```

**Requirements for all content:**
- Every quiz wrong option must have a `misconception` tag
- Every diagnosable question must have a `variant` for re-testing
- Every sync binding must name a variable that exists as a literal assignment
- Synced cells must complete in <200ms compute time (CI validated)

### Building Lessons Locally

```bash
# Validate lesson content
npm run lesson-lint

# Run content CI locally
docker run --rm -v $(pwd):/app lesson-lint:latest
```

---

## 📜 License

This project uses an **open-core** model:

- **Open Source (MIT):** Lesson schema, quiz schema, simulation component library
- **Proprietary:** Sync engine, diagnosis engine, concept-graph routing, tutor, backend code

See [LICENSE](LICENSE) for details (coming soon).

---

## 🙏 Acknowledgments

- Inspired by [Observable](https://observablehq.com/), [Linear](https://linear.app/), and [Jupyter](https://jupyter.org/)
- Built with [Pyodide](https://pyodide.org/) for in-browser Python execution
- Special thanks to the open-source AI community

---

## 📞 Contact

- **Owner:** Himanshu
- **Email:** [Add your email]
- **Twitter:** [@yourhandle](https://twitter.com/yourhandle)
- **Website:** [https://ail-learning.lab](https://ail-learning.lab) (coming soon)

---

<p align="center">
  Made with ❤️ for AI engineers, students, and curious minds
</p>
