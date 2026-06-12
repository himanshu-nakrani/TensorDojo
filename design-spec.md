# AI Learning Lab — Design Spec

**Status:** Draft v1
**Owner:** Himanshu
**Last updated:** 2026-06-13
**Companion doc:** [technical-spec.md](technical-spec.md)

> "Learn AI engineering by manipulating, implementing, and deploying every concept."

---

## 1. Vision

A learning platform where every AI engineering concept exists in four synchronized views:

1. **Explanation** — a mental model in prose and diagrams.
2. **Interactive simulation** — manipulable widgets (sliders, toggles, editable inputs).
3. **Code notebook** — runnable code that implements the concept.
4. **Engineering lab** — the concept used inside a real mini-system.

The four views are not separate tabs of content. They are **synchronized**: change a value in the notebook and the simulation updates; drag a slider and the notebook cell re-runs. The learner's mental model is constantly tested against executable reality.

Not videos. Not slides. Manipulable intuition + runnable code + real system usage.

### What success looks like

- A learner who finishes the Attention module can implement self-attention from memory in NumPy, explain why softmax temperature changes the weight distribution, and debug a broken causal mask in someone else's code.
- A learner who gets a quiz wrong leaves knowing *which specific concept* they had wrong and *what experiment* proved it to them — not just "incorrect, try again."

## 2. Target users

| Persona | Situation | What they need most |
|---|---|---|
| **Beginner** | Learning AI/ML from scratch | Gentle prerequisite routing; never hit a wall of unexplained math |
| **SWE → AI engineer** | Strong coder, weak ML theory | Code-first entry points; math explained via code they can read |
| **Struggling student** | Enrolled in a math-heavy course, lost | Simulations that make equations tangible; misconception diagnosis |
| **Interview candidate** | Prepping for AI engineering roles | Quizzes, labs, "implement X from scratch" drills |
| **Practitioner** | Uses LLMs daily, wants depth | Skip-ahead via concept graph; engineering module (RAG, agents, evals) |

The primary persona for the MVP is **SWE → AI engineer**. They have the shortest path to paying, they tolerate rough edges, and the code-first approach plays to the platform's strength.

## 3. Product principles

1. **Active over passive.** Every lesson must contain at least one thing the learner *does* — a slider to move, a prediction to make, code to change. If a lesson is read-only, it isn't done.
2. **Predict before run.** Wherever feasible, the UI asks the learner to commit to a prediction before showing the result. The gap between prediction and reality is where learning happens — and it is the raw material for misconception diagnosis.
3. **Diagnose, don't grade.** A wrong answer is data about a specific confusion, not a score deduction. The system's response to "wrong" is always: *here is what you likely confused, here is an experiment that disproves it.*
4. **Code is the ground truth.** Math notation is always paired with runnable code. If a learner doubts the math, they can run the code.
5. **Local-first artifacts.** Notebooks are downloadable, standard `.ipynb` files. Learners own their work forever, with or without the platform.
6. **One concept, one screen.** A lesson page never requires navigating away to use its simulation, notebook, or quiz. Synchronization only works when the views are co-present.

### The core learning loop

```
Observe      Read the mental model. See the diagram.
   ↓
Manipulate   Tweak sliders, edit inputs, toggle masks.
   ↓
Predict      Commit to a guess: "what will change?"
   ↓
Run          Execute. Get the actual result.
   ↓
Compare      Mental model vs reality. Mismatch = diagnosable moment.
   ↓
Transfer     Apply it: in a notebook, in a lab, in a mini-system.
```

Every lesson is structured around at least one full pass of this loop. The **Predict → Run → Compare** segment is instrumented: predictions are recorded as structured data and feed the Concept Debugger (§4.1).

## 4. Feature specs

### 4.1 Concept Debugger (the moat)

When a learner gets something wrong, the platform does not say "incorrect." It diagnoses.

**Inputs to diagnosis:**
- Quiz answer chosen (each wrong option is pre-tagged with the misconception it implies — see §6.3)
- Prediction made before a simulation run vs. actual result
- Code submitted in notebook checkpoints (AST/output analysis)
- Pattern across recent attempts (e.g., three errors all involving normalization)

**Diagnosis output — always three parts:**

1. **The confusion, named.** One sentence: "You confused attention *score* with attention *weight*."
2. **The distinction, stated.** Two lines max: "Score = raw Q·K similarity. Weight = softmax-normalized score."
3. **The experiment.** A deep link into a simulation, pre-configured to demonstrate the distinction: "Lower the temperature slider. Watch the distribution sharpen. Now raise it to 1.5 — watch it flatten."

**Example flow:**

```
Quiz: "Which values sum to 1 across a row of the attention matrix?"
Learner picks: "The attention scores"          ← tagged: score-vs-weight

┌─────────────────────────────────────────────────────┐
│  Not quite — you confused score with weight.        │
│                                                     │
│  Score  = raw Q·K similarity (any real number)      │
│  Weight = softmax(score) — these sum to 1           │
│                                                     │
│  ▶ Try it: [Open simulation with softmax step       │
│    highlighted, temperature slider focused]         │
│                                                     │
│  [Show me in the notebook]  [I get it, continue]    │
└─────────────────────────────────────────────────────┘
```

**Diagnosis engine tiers** (detail in technical spec):
- **Tier 1 — Rule-based:** pre-tagged quiz distractors and known code-error patterns. Deterministic, instant, free. Expected to cover the large majority of cases at launch (every quiz wrong-answer is tier-1 by construction; only free-form code needs more).
- **Tier 2 — LLM-based:** for free-form code and open-ended answers, an LLM classifies the error against the lesson's misconception catalog. Pro tier only.

Every diagnosis is logged. The catalog of misconceptions grows from real learner data — this is the compounding moat.

### 4.2 Notebook–Simulation Sync

The signature interaction. A lesson's simulation and notebook share **named variables**.

**Behavior contract:**

| Action | Result |
|---|---|
| Learner drags `temperature` slider to 0.5 | Notebook cell containing `temperature = ...` is rewritten to `temperature = 0.5`, cell re-runs, downstream cells re-run, visualization updates |
| Learner edits `temperature = 2.0` in the notebook and runs the cell | Slider animates to 2.0, visualization updates |
| Learner writes code that breaks the sync contract (deletes the variable) | Simulation shows a "disconnected" badge on the affected control; notebook still runs freely |

**Design rules:**
- Sync is **per-variable**, declared in lesson config — not magic inference. Authors list which variables are bound to which controls.
- Re-runs must complete in **< 500 ms** for the interaction to feel causal. This constrains synced cells to lightweight NumPy computation (see technical spec §2).
- The learner can always break out: the notebook is a real notebook. Sync is a layer on top, never a cage. A "Reset to lesson state" button restores the canonical notebook.

### 4.3 Concept Graph

A directed prerequisite graph over ~120 concepts (at full content build-out).

**Node:** a concept (e.g., `softmax`, `dot-product`, `causal-mask`) with: a micro-lesson (2–5 min), at least one simulation reference, and a 2–3 question check.

**Edge:** "you need A before B."

**Uses:**
1. **Routing on failure.** Fail the attention quiz with a softmax-tagged misconception → the graph routes you to the `softmax` micro-lesson, then returns you to where you were. The return path is explicit and visible ("2 quick refreshers, then back to Masking").
2. **Skip-ahead testing.** A practitioner can take a concept's check directly; passing marks it and its ancestors as known.
3. **Progress visualization.** The learner's map: known (filled), in progress (half), unknown (outline), locked (greyed — prerequisites unmet). This *is* the progress UI; there are no percent-complete bars.

**Design rule:** routing never silently changes the learner's place. Detours are framed as short, bounded side-quests with a visible return path.

**Precedence with the Concept Debugger (§4.1):** a single wrong answer always gets the in-place diagnosis card first. Graph routing triggers only on *repeated* failure of the same concept (2+ misconception events on the same tag, or failing the re-test after the experiment) — the card handles slips, the detour handles gaps.

### 4.4 AI Tutor (Pro)

A chat panel docked on every lesson page. Powered by Hermes (a Python orchestration library that assembles context and routes between LLM providers) with Xiaomi MiMo as the default model (chosen for low cost per token at tutor-quality output); Anthropic/OpenAI as fallback. Provider details and cost controls are in technical-spec §6.

**Context the tutor sees:** current lesson content, the learner's notebook state (code + last outputs), current simulation parameter values, the learner's recent misconception history.

**What makes it different from "ChatGPT in a sidebar":** the tutor can *act on the lesson*:

- **[Show fix]** — applies a suggested code edit to the notebook as a visible diff the learner accepts/rejects.
- **[Run experiment]** — sets simulation parameters and triggers a run, narrating what to watch.
- **[Explain more]** — expands with lesson-grounded explanation, linking to graph concepts.

**Example:**

```
Learner: Why is my loss going up?

Tutor:  Your model is diverging. Your learning rate is 1e-2 — at this
        scale the gradient steps overshoot the minimum. Try 1e-4.

        [Show fix]  [Run experiment]  [Explain more]
```

**Guardrails:** the tutor never writes the lab solution. For lab exercises it operates in hint mode — escalating hints (concept → approach → pseudocode), never full code. Answer-grade help is available only after the learner submits a working attempt.

### 4.5 Quizzes

- 3–6 questions per lesson, mixed formats: multiple choice, predict-the-output, spot-the-bug, drag-to-order.
- **Every distractor is authored with a misconception tag** (§6.3). An untagged distractor is a content-lint error.
- No timed pressure, no lives, no streak-loss. Retakes always allowed; the graph remembers what was missed, not how many tries.

### 4.6 Labs

Each module ends in a lab: a real mini-system, not a toy.

| Module | Lab |
|---|---|
| Foundations | Gradient descent visualizer you build yourself |
| Neural Networks | MLP that classifies MNIST, trained in-browser |
| Tokenization & Embeddings | BPE tokenizer from scratch + embedding explorer |
| Attention & Transformers | **Tiny GPT** — train a character-level GPT on a small corpus |
| Training | Training-run debugger: fix 5 sabotaged training runs |
| AI Engineering | RAG pipeline over your own documents, with evals |

Labs have **checkpoints** (auto-verified assertions on the learner's code/outputs) and a **grading rubric** (Pro: AI-assisted grading with written feedback).

### 4.7 Gamification stance

**Decision: stay academic, with one exception.** No streaks, no XP, no leaderboards, no badges-for-logging-in. The audience (engineers, interview preppers) is intrinsically motivated and pattern-matches heavy gamification to low quality.

The exception: **the concept graph filling in is the reward.** Completing concepts visibly lights up the map. This is progress-as-gamification without manufactured urgency. Revisit post-launch if retention data demands it.

## 5. Product modules

Six modules, ordered as a default path through the concept graph. Learners can enter anywhere the graph allows.

| # | Module | Concepts | Lessons (est.) |
|---|---|---|---|
| 1 | **Foundations** | Python for tensors, NumPy, vectors/matrices, dot product, gradients, loss functions, optimization | 8 |
| 2 | **Neural Networks** | Perceptron, MLP, activations, backprop, initialization, normalization, overfitting | 7 |
| 3 | **Tokenization & Embeddings** | Tokenization, BPE, embeddings, positional encoding | 5 |
| 4 | **Attention & Transformers** | Self-attention, multi-head, causal mask, layer norm, residuals, transformer block, GPT | 7 |
| 5 | **Training** | Datasets, batching, cross-entropy, optimizers, schedules, evaluation | 6 |
| 6 | **AI Engineering** | RAG, vector DBs, chunking, evals, agents, tool calling, observability, deployment | 9 |

Total at full build-out: ~42 lessons, ~120 graph concepts, 6 labs.

## 6. Content model

### 6.1 Lesson anatomy

Every lesson is a directory:

```
lessons/04-attention/02-self-attention/
  lesson.mdx          # explanation, with embedded simulation + notebook components
  lesson.yaml         # metadata: id, prerequisites, concepts, sync bindings
  simulation.tsx      # the interactive widget(s)
  notebook.ipynb      # canonical notebook
  solution.ipynb      # for checkpointed exercises
  quiz.yaml           # questions with tagged distractors
  diagram.svg         # static diagrams referenced from MDX
```

### 6.2 Lesson metadata schema

```yaml
id: attention-002
title: Self-Attention From Scratch
module: attention-transformers
prerequisites: [embeddings, dot-product, softmax]   # concept graph node ids
concepts: [query, key, value, attention-score, attention-weight, causal-mask]
simulations: [attention-matrix, mask-toggle, head-compare]
notebooks: [numpy-attention.ipynb]
estimated_minutes: 35
sync:
  - variable: temperature        # notebook variable name
    control: temperature-slider  # simulation control id
    range: [0.1, 3.0]
  - variable: mask_enabled
    control: mask-toggle
```

### 6.3 Quiz schema with misconception tags

```yaml
- id: q-attn-3
  type: multiple-choice
  prompt: "Which values sum to 1 across a row of the attention matrix?"
  options:
    - text: "The attention scores"
      misconception: score-vs-weight        # ← required on every wrong option
    - text: "The attention weights"
      correct: true
    - text: "The value vectors"
      misconception: value-vs-weight
  variant:                                  # re-test after diagnosis (§7.4)
    prompt: "After softmax is applied to a row of scores, what is true of the resulting values?"
    options:
      - text: "They sum to 1"
        correct: true
      - text: "They are unchanged raw similarities"
        misconception: score-vs-weight
  diagnosis:
    score-vs-weight:
      distinction: "Score = raw Q·K similarity. Weight = softmax(score)."
      experiment:
        simulation: attention-matrix
        preset: { highlight: softmax-step, focus: temperature-slider }
        instruction: "Lower temperature — watch weights sharpen. Raise to 1.5 — watch them flatten."
```

### 6.4 Authoring principles

- A lesson explains **one idea**; estimated time 20–40 min. Longer → split.
- Side-by-side math & code is a standard MDX component, used whenever notation appears:

```
┌──────────────────────────────┬──────────────────────────────────┐
│ Math                         │ Code                             │
│                              │                                  │
│ softmax(xᵢ) =                │ def softmax(x):                  │
│   exp(xᵢ) / Σⱼ exp(xⱼ)       │     e = np.exp(x - x.max())      │
│                              │     return e / e.sum()           │
└──────────────────────────────┴──────────────────────────────────┘
```

- Every simulation parameter that matters pedagogically gets a sync binding. Decoration parameters (colors, layout) do not.

## 7. Screen inventory & wireframes

### 7.1 Screens

| Screen | Purpose |
|---|---|
| Home / dashboard | Resume point, recent misconceptions, concept map summary |
| Concept map | Full graph view, progress, skip-ahead entry |
| Lesson page | The core surface: four views + quiz, single screen |
| Lab page | Lab brief, checkpointed workspace, grading |
| Tutor panel | Docked chat, available on lesson + lab pages |
| Onboarding | Persona + prior-knowledge placement (5 graph checks) |
| Settings / billing | Account, plan, notebook export |

### 7.2 Home

```
┌────────────────────────────────────────────────────────────┐
│  AI Learning Lab                          [map] [⚙] [👤]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Hi Himanshu.                                              │
│                                                            │
│  ┌──────────────────────────────────────────────────┐      │
│  │  CONTINUE                                        │      │
│  │  Attention: Masking          lesson 3 of 7       │      │
│  │  Last time you missed: causal mask direction     │      │
│  │  [Resume →]                                      │      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
│  Worth a refresher          Your map                       │
│  ┌────────────────────┐     ┌────────────────────────┐     │
│  │ ● softmax temp     │     │   ◉──◉──◉──◐──○        │     │
│  │   missed 2×        │     │    \  \    \           │     │
│  │ ● matrix transpose │     │     ◉──◐    ○──○       │     │
│  │   missed 1×        │     │  28 of 120 concepts    │     │
│  │ [5-min refresher]  │     │  [Open map →]          │     │
│  └────────────────────┘     └────────────────────────┘     │
└────────────────────────────────────────────────────────────┘
```

The "Continue" card always names the learner's last *specific* struggle — this is the Concept Debugger surfacing at the entry point.

### 7.3 Lesson page (the core surface)

Desktop, two-column. Left: explanation (scrolling). Right: a sticky **workbench** that swaps between simulation and notebook (or splits when space allows).

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Attention      Self-Attention From Scratch        ③/⑦  [tutor 💬]│
├──────────────────────────────┬─────────────────────────────────────┤
│ EXPLANATION (scrolls)        │ WORKBENCH (sticky)                  │
│                              │ ┌─[Simulation]──[Notebook]────────┐ │
│ ## What attention computes   │ │                                 │ │
│                              │ │   attention weights heatmap     │ │
│ Each token asks: "which      │ │   ┌──┬──┬──┬──┐                 │ │
│ other tokens matter to me?"  │ │   │▓▓│░░│  │  │ the             │ │
│                              │ │   │░░│▓▓│░░│  │ cat             │ │
│ ┌─ Math ────┬─ Code ───────┐ │ │   │░░│▓▓│▓▓│  │ sat             │ │
│ │softmax(x) │ def softmax: │ │ │   │░░│░░│▓▓│▓▓│ down            │ │
│ │ = exp(x)/Σ│   e = np.exp │ │ │   └──┴──┴──┴──┘                 │ │
│ └───────────┴──────────────┘ │ │                                 │ │
│                              │ │  temperature ──●────── 0.8      │ │
│ Try it → drag the            │ │  causal mask  [ON ]             │ │
│ temperature slider and       │ │                                 │ │
│ watch the rows sharpen.      │ │  ⚡ synced with notebook         │ │
│                              │ └─────────────────────────────────┘ │
│ ## Why divide by √d          │                                     │
│ ...                          │  [Check understanding →]            │
└──────────────────────────────┴─────────────────────────────────────┘
```

**Interaction notes:**
- Explanation text contains inline "Try it" callouts that focus and pulse the relevant workbench control.
- The `⚡ synced` badge communicates sync state; clicking it reveals which variables are bound.
- Quiz launches in-place in the workbench column ("Check understanding"), never a separate page.
- Mobile/narrow: single column; workbench becomes a bottom sheet pinned under the explanation. Simulations work; notebook editing is read-only on mobile (run, don't write).

### 7.4 Quiz → diagnosis flow

```
[Quiz answer wrong]
   ↓
┌─ Diagnosis card (replaces question, in place) ─────┐
│  You confused score with weight.                   │
│  Score = raw Q·K similarity.                       │
│  Weight = softmax-normalized score.                │
│                                                    │
│  [Try the experiment →]   ← pre-configures the     │
│  [Continue]                  simulation, switches  │
└────────────────────────────  workbench tab ────────┘
   ↓ (if experiment taken)
Simulation opens with softmax step highlighted,
temperature slider pulsing. Banner: "Lower the
temperature. What happens to the weights?"
   ↓
[Return to quiz] — re-test with the question's authored variant
```

Each question that carries diagnoses also carries one `variant` (a re-phrasing testing the same concept) in `quiz.yaml`; the re-test uses it so the learner can't pattern-match the original. Authoring one variant per diagnosable question is part of the content definition-of-done.

### 7.5 Attention Studio (Month-1 vertical slice)

The flagship lesson sequence — a multi-stage pipeline view where each stage is a lesson surface:

```
┌────────────────────────────────────────────────────────────────────┐
│ ATTENTION STUDIO                                                   │
│                                                                    │
│ "The animal did not cross the street because it was tired."        │
│  [edit sentence]                                                   │
│                                                                    │
│  ① Tokens  ② Embeddings  ③ Q·K·V  ④ Scores  ⑤ Mask  ⑥ Weights  ⑦ Output│
│  ────────────────────────────────●──────────────────────────────   │
│                                                                    │
│  ┌──────────────────────────────┬───────────────────────────────┐  │
│  │  score matrix (raw Q·K)      │  PyTorch panel (read-only,    │  │
│  │  [heatmap]                   │   values mirror controls)     │  │
│  │                              │  scores = q @ k.transpose(-2, │  │
│  │  head: [1][2][3][4]          │      -1) / math.sqrt(d_k)     │  │
│  │  □ causal mask               │  ...                          │  │
│  │  temperature ──●── 1.0       │                               │  │
│  └──────────────────────────────┴───────────────────────────────┘  │
│                                                                    │
│  Which token does "it" attend to most in head 2?                   │
│  [ animal ]  [ street ]  [ tired ]                                 │
└────────────────────────────────────────────────────────────────────┘
```

Demo flow: user types a sentence → tokenize → embeddings → Q/K/V → raw scores → mask → softmax weights → weighted sum of V (the output each token actually receives) → "which tokens attend to *it*?" → head-comparison question → feedback with diagnosis.

### 7.6 Tutor panel

Docked right-side drawer, 360 px, over the workbench. Collapsed by default to a button. Messages can carry action chips:

```
┌─ Tutor ──────────────────────────────┐
│ you: why is my loss going up?        │
│                                      │
│ tutor: Your model is diverging. LR   │
│ is 1e-2 — steps overshoot the        │
│ minimum. Try 1e-4.                   │
│                                      │
│ [Show fix] [Run experiment] [More]   │
└──────────────────────────────────────┘
```

`Show fix` renders a diff over the notebook cell with Accept / Reject. `Run experiment` sets simulation params and runs, with a one-line "watch the loss curve" narration.

### 7.7 Onboarding

1. Pick a persona (sets default path + tone).
2. Optional placement: 5 quick graph checks ("Can you read this NumPy expression?" → skip Foundations).
3. Land on Home with a pre-selected "Continue" target. Time to first interactive simulation: **under 2 minutes** from signup.

## 8. Visual design direction

- **Tone:** technical, calm, precise. Closer to a well-made tool (Linear, Observable) than a classroom (Duolingo, Coursera).
- **Typography:** monospace for everything executable (code, variable names, values on sliders); a humanist sans for prose. Math set properly (KaTeX).
- **Color:** dark-mode default (audience expectation). One accent color for interactive/synced elements — anything the learner can manipulate shares the accent; static content never uses it. This single rule teaches "what can I touch" without instruction.
- **Heatmaps/visualizations:** perceptually uniform colormaps (viridis family); colorblind-safe.
- **Motion:** transitions only where they carry meaning (distribution sharpening as temperature drops is *the lesson*; animated page transitions are noise). All meaningful motion ≤ 300 ms and interruptible.

## 9. Pricing & packaging

| | **Free** | **Pro** ($20/mo or $180/yr) | **Team** ($49/seat/mo, min 5) |
|---|---|---|---|
| Static lessons + diagrams | ✓ | ✓ | ✓ |
| Simulations | All (they run client-side at zero marginal cost) | All | All |
| Notebooks (download + run in-browser) | ✓ | ✓ | ✓ |
| Tier-1 (rule-based) diagnosis | ✓ | ✓ | ✓ |
| AI Tutor | — | ✓ | ✓ |
| LLM misconception diagnosis | — | ✓ | ✓ |
| Hosted notebook execution (GPU lessons) | — | ✓ | ✓ |
| Progress tracking + concept map persistence | Local only | Synced | Synced |
| Lab grading with feedback | — | ✓ | ✓ |
| Private lessons / custom concept graphs | — | — | ✓ |
| Team analytics + onboarding tracks | — | — | ✓ |

**Free tier philosophy:** the free tier must be genuinely good — it is the marketing. Simulations and rule-based diagnosis stay free because they run client-side at zero marginal cost and showcase the moat (diagnosis deep-links into simulations, so the two must travel together). The paid line is drawn strictly at *compute that costs money* (LLM calls, hosted kernels, grading) and *persistence/analytics*.

**Open-source stance (decision):** content schema and the simulation component library are open source (community authoring, credibility, hiring). The platform — sync engine, diagnosis engine, concept-graph routing, tutor — is proprietary. This keeps the moat while letting "AI Learning Lab lesson format" become a standard others write to.

## 10. Roadmap

| Month | Deliverable | Definition of done |
|---|---|---|
| **1** | **Attention Studio vertical slice** | 4 lessons in Module 4 (self-attention, masking, multi-head, transformer block); 4 simulations; 2 notebooks (NumPy + PyTorch); 1 lab (Tiny GPT, manual checkpoints — auto-verification arrives Month 3); quiz per lesson with tagged distractors + variants; tier-1 diagnosis; tutor MVP behind a manual allowlist (Stripe billing also ships Month 1 per technical spec, but invite-gating is the fallback); sync engine meeting the 500 ms re-run budget — the budget is part of "done" |
| **2** | Tokenization & Embeddings module | 5 lessons; BPE simulation; embedding explorer; concept graph live with routing |
| **3** | Transformer block + mini-GPT lab depth | Full Module 4; in-browser training for Tiny GPT; lab checkpoints + grading v1 |
| **4** | Training module | 6 lessons; training-run debugger lab; hosted execution (Pro) for lessons whose training runs exceed what in-browser NumPy can do in seconds — real optimizer comparisons, larger models in the Training module and beyond |
| **5** | AI Engineering module | RAG, agents, evals lessons; RAG-over-your-docs lab; tier-2 LLM diagnosis |
| **6** | Public launch | Foundations + NN modules (the "easy" content, written last deliberately — patterns are established by then); billing; team tier; content expansion cadence |

**Sequencing rationale:** Attention Studio first because it is the hardest content to fake and the strongest demo. If the sync engine and diagnosis loop work for attention, everything else is content production. Foundations is written *last* — by then the lesson patterns, component library, and authoring pipeline are proven, and beginners (the most fragile audience) get the most polished treatment.

## 11. Risks & open questions

| Risk | Mitigation |
|---|---|
| Sync engine feels laggy → core promise broken | Hard 500 ms budget; Pyodide pre-warm; synced cells restricted to NumPy-light computation (see technical spec) |
| Content production rate too slow for solo builder | Open-source lesson schema + component library to enable community lessons; Foundations last |
| Misconception catalog cold-start | Seed from known ML-education literature + own teaching experience; every distractor tagged from day one so data accrues immediately |
| LLM tutor cost at Free→Pro conversion rates | Tutor is Pro-only; tier-1 diagnosis (free) has zero marginal cost |
| Mobile expectations | Explicitly de-scoped: mobile is read + simulate, not write. Stated in onboarding |

Resolved decisions: academic tone over gamification (§4.7) and open-core licensing (§9) are product decisions made here; Pyodide-first execution and managed-services hosting are engineering decisions with rationale in technical-spec §1.3.

**Design debt acknowledged for v1 of this spec:** state designs (locked/loading/error/disconnected), responsive breakpoints, concept-map and lab-page wireframes, and the tutor-drawer-overlapping-workbench interaction are deferred to design iteration during Month 1 — the lesson page (§7.3) is the contract; the rest is detail.
