# AI Learning Lab — Technical Spec

**Status:** Draft v1
**Owner:** Himanshu
**Last updated:** 2026-06-13
**Companion doc:** [design-spec.md](design-spec.md)

**Build context:** solo developer, nights/weekends. Every decision below is biased toward low ops burden, managed services, and deferring infrastructure until a feature forces it.

---

## 1. Architecture overview

### 1.1 System diagram

```
┌──────────────────────────── Browser ────────────────────────────┐
│                                                                 │
│  Next.js app                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │ Lesson (MDX) │  │ Simulations  │  │ Notebook UI (Monaco)  │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬────────────┘   │
│         │                │                     │                │
│         │         ┌──────▼─────────────────────▼──────┐         │
│         │         │      Sync Engine (state store)    │         │
│         │         └──────────────┬────────────────────┘         │
│         │                        │                              │
│         │              ┌─────────▼──────────┐                   │
│         │              │  Pyodide worker    │  ← default exec   │
│         │              │  (WASM Python)     │    for all tiers  │
│         │              └────────────────────┘                   │
└─────────┼───────────────────────┬───────────────────────────────┘
          │ HTTPS                 │ HTTPS / WS
┌─────────▼───────────────────────▼───────────────────────────────┐
│  FastAPI backend (single service, Fly.io/Railway)               │
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
│  │ notebooks, exports │ │ hosted exec  │  ← Pro GPU lessons     │
│  └────────────────────┘ └──────────────┘     (Month 4+)         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Stack summary

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 15+ (App Router), TypeScript, Tailwind, shadcn/ui | Deployed on Vercel |
| Lessons | MDX, compiled at build time | Lessons live in the repo (§5) |
| Simulations | React + Canvas/D3 (p5.js only where it clearly wins) | Published as open-source component lib |
| Code editor | Monaco | Same editor for notebook cells and code panels |
| Math | KaTeX | Server-rendered where possible |
| In-browser execution | **Pyodide** (Python 3.12 WASM) in a Web Worker | NumPy included; see §2 |
| Hosted execution | **Modal** (Month 4+, Pro only) | See §2.3 |
| Backend | FastAPI, single service | Fly.io or Railway, one region |
| Database | Postgres (Neon or Supabase) | Managed, serverless tier |
| Auth | Clerk | Don't build auth solo |
| Object storage | Cloudflare R2 | Notebooks, exports; zero egress fees |
| Cache/queue | **None at MVP** | Redis deferred until a queue exists to need it |
| LLM | Xiaomi MiMo (low-cost open-weight model, served via API) as default; Anthropic/OpenAI fallback. Orchestrated by Hermes, an in-process Python routing/context-assembly library — not a hosted service | See §6 |
| Payments | Stripe | Checkout + customer portal, no custom billing UI |
| Analytics/observability | PostHog (product), Sentry (errors), structured logs | See §10 |

### 1.3 Decisions on the open questions

**D1 — Kernel infra: Pyodide in-browser first; Modal for hosted execution later. Do not build custom kernel infra; do not run Jupyter servers.**
- *Why:* Solo + nights/weekends makes a fleet of per-user Jupyter kernels (auth, idle reaping, resource limits, abuse) a project-killer. Pyodide gives every Free user instant, zero-cost, zero-ops NumPy execution — and sub-500 ms sync re-runs are only achievable in-browser anyway (network round-trip alone eats the budget on hosted kernels).
- *Tradeoff accepted:* no real PyTorch in-browser. Mitigation in §2.2.
- *Revisit when:* Pro users need real GPU training (Month 4) → Modal functions, not persistent kernels.

**D2 — Hosting: managed everything.** Vercel + Fly/Railway + Neon/Supabase + R2 + Modal. Self-hosting nothing at MVP. *Revisit when:* monthly infra cost exceeds ~$500 or a vendor limit bites.

**D3 — Licensing: open core.** Lesson schema, quiz schema, and the simulation component library are MIT on GitHub. Sync engine, diagnosis engine, concept-graph routing, tutor, and all backend code are proprietary. *Why:* community content authoring is the only way a solo builder scales content; the moat is the engine, not the format.

**D4 — Gamification: none beyond the concept map** (design spec §4.7). No backend work for streaks/XP. 

**D5 — Redis: deferred.** The MVP has no queue and no ephemeral state that Postgres + browser state can't hold. Add Redis only when hosted execution (Month 4) needs a job queue — and even then, prefer Modal's own queueing first.

## 2. Execution engine

### 2.1 Pyodide (primary, all tiers)

- Pyodide runs in a **dedicated Web Worker** — never the main thread. The worker is pre-warmed on lesson-page load (load runtime + `import numpy` + run setup cells) so the first slider drag is fast.
- One worker per lesson page. Lesson navigation tears down and re-warms; state does not leak across lessons.
- Packages: `numpy` always; `micropip` installs whitelisted pure-Python packages per-lesson (declared in `lesson.yaml`). No arbitrary pip.
- **Performance budget:** synced cell re-runs must complete in **< 500 ms** end-to-end (design spec contract). Enforced by:
  - lesson-lint rule (lesson-lint = the content CI suite, defined in §5.2): synced cells are profiled in CI against a budget (200 ms compute on a mid-range laptop baseline).
  - Sync engine debounces slider input (16 ms) and coalesces runs: if a run is in flight, the latest value queues, intermediate values drop.
- Cold-start reality: Pyodide + NumPy is a ~10 MB download, ~2–4 s init. Mitigations: service-worker caching after first visit (subsequent loads ~1 s), runtime preload on Home when a "Continue" target exists, skeleton UI on the workbench during warm-up.

### 2.2 The PyTorch gap

Real PyTorch does not run in Pyodide. Strategy by content type:

| Content | Approach |
|---|---|
| Concept lessons (attention, backprop, etc.) | NumPy implements the concept; PyTorch shown as a **read-only annotated panel** with pre-computed outputs checked into the lesson. Numeric equivalence between the NumPy and PyTorch versions is asserted in lesson CI, so the displayed outputs are honest. |
| Tiny GPT lab (Month 3) | Train in-browser in NumPy (char-level, ~50k params — feasible in seconds) — *or* via hosted execution if available. The NumPy training loop **is the pedagogy**, not a workaround. |
| Real GPU training (Month 4+) | Hosted execution (§2.3), Pro only. |

### 2.3 Hosted execution (Modal, Month 4+, Pro)

Not persistent kernels — **stateless function runs**:

1. Client submits `{notebook_id, cell_sources, lesson_id}` to `POST /api/execute`.
2. Backend validates Pro entitlement + per-user quota (e.g., 50 GPU-minutes/month, in Postgres).
3. Backend invokes a Modal function: pinned image (torch + lesson deps), no network egress, CPU/GPU per lesson config, hard timeout (default 120 s, lab max 10 min).
4. Outputs (stdout, rich outputs, generated files ≤ 10 MB) stream back over a WebSocket; artifacts land in R2.

Sandboxing comes free: Modal containers are isolated, ephemeral, and resource-capped. The only custom security work is quota enforcement and egress-off (§9).

### 2.4 Notebook representation

- Canonical format is standard `.ipynb` (nbformat 4) — the local-first promise (design spec) requires downloads to open in Jupyter/VS Code unmodified.
- Sync metadata lives in cell metadata: `{"ail": {"sync": "temperature"}}` — ignored by other tools, round-trips safely.
- The in-app notebook UI is a custom React component stack (Monaco cells + output renderers), **not** embedded JupyterLab. We control execution (Pyodide worker), so we only need editing + output rendering; JupyterLab's extension surface is dead weight.
- User notebook state autosaves to R2 (Pro) or localStorage + explicit download (Free), debounced 5 s. `PUT /notebooks/{id}/mine` returns 402 for Free users — Free persistence is client-side only.

**Content versioning vs. user notebooks:** a user's saved copy records the `lessons.version` it was forked from. When the canonical notebook changes (version bump), in-flight user copies are **not migrated** — on next open the user sees a banner: "This lesson was updated. [Keep my copy] [Start fresh from the new version]". Keeping the copy keeps working (sync bindings are re-validated against the *user's* cells; bindings that no longer match show the standard desync badge). Old canonical versions remain available as static assets so a kept copy's "Reset to lesson state" resets to *its* version, not the new one. No silent merges, ever.

## 3. Sync engine

The core IP. Keeps three parties consistent: simulation controls, notebook variables, and visualizations.

### 3.1 Model

A per-lesson **binding store** — a typed key-value store where each key is a declared binding from `lesson.yaml`:

```typescript
interface Binding {
  variable: string;            // Python variable name
  control: string;             // simulation control id
  type: 'float' | 'int' | 'bool' | 'string' | 'enum';
  range?: [number, number];
  cell: string;                // id of the notebook cell that defines it
}

type SyncState = {
  values: Record<string, Value>;
  status: 'idle' | 'running' | 'desynced';
  generation: number;          // monotonic, for dropping stale results
}
```

Implemented as a Zustand store; simulations and the notebook UI both subscribe.

### 3.2 Data flow

**Slider → notebook:**
```
slider input (debounced 16ms)
  → store.set('temperature', 0.5, source: 'sim')
  → cell rewrite: regex-targeted assignment in the bound cell
      (`temperature = <literal>` — bound cells are constrained by
       lesson-lint to contain simple literal assignments, so the
       rewrite is reliable, not arbitrary code transformation)
  → execution scheduler: re-run bound cell + downstream cells
      (dependency order = notebook cell order; coalesce if busy)
  → worker posts results, store.generation gates stale outputs
  → visualization re-renders from new outputs
```

**Notebook → slider:** learner edits the cell and runs it → post-run, the worker reports values of all bound variables → store updates → controls animate to new values. If a bound variable's value is outside the control's range, the control pins to its limit and shows the true value numerically.

**Desync:** if a bound variable disappears (cell deleted/renamed), binding status → `desynced`; the control shows a "disconnected" badge (design spec contract). "Reset to lesson state" restores the canonical notebook and re-runs setup.

**Errors during synced re-runs:** if a cell raises, execution stops at that cell; its error renders inline in the notebook (standard traceback); downstream cells show a "stale" indicator; bound controls whose defining cell succeeded stay live, others go `desynced`. The store keeps the last-good values so visualizations never blank out — they dim 40% with an error chip until the next successful run.

### 3.3 What the sync engine is NOT

- Not a reactive notebook (no Observable-style dataflow graph). Re-run = bound cell + everything after it, in document order. Simple, predictable, debuggable — and correct for linear teaching notebooks, which lesson-lint enforces (no out-of-order dependencies in synced lessons).
- Not bidirectional text sync. The notebook is the source of truth for code; the store is the source of truth for bound values only.

## 4. Data model

Postgres. Schema highlights (not exhaustive — migrations via Alembic):

```sql
-- Identity (Clerk owns auth; we mirror the id)
users (
  id            text PRIMARY KEY,          -- clerk user id
  email         text NOT NULL,
  persona       text,                      -- onboarding choice
  plan          text NOT NULL DEFAULT 'free',  -- free | pro | team
  team_id       uuid REFERENCES teams,
  created_at    timestamptz NOT NULL DEFAULT now()
)

-- Content registry (mirrors repo content at deploy time; the repo is canonical)
concepts (
  id            text PRIMARY KEY,          -- 'softmax', 'causal-mask'
  title         text NOT NULL,
  module        text NOT NULL,
  micro_lesson  text                       -- lesson id of refresher
)

concept_edges (
  prerequisite  text REFERENCES concepts(id),
  concept       text REFERENCES concepts(id),
  PRIMARY KEY (prerequisite, concept)
)

lessons (
  id            text PRIMARY KEY,          -- 'attention-002'
  module        text NOT NULL,
  title         text NOT NULL,
  version       int NOT NULL               -- bumped on content change
)

-- Learner state
concept_mastery (
  user_id       text REFERENCES users,
  concept_id    text REFERENCES concepts,
  state         text NOT NULL,             -- unknown | learning | known
  evidence      jsonb,                     -- quiz pass, skip-test, etc.
  updated_at    timestamptz,
  PRIMARY KEY (user_id, concept_id)
)

lesson_progress (
  user_id       text REFERENCES users,
  lesson_id     text REFERENCES lessons,
  status        text NOT NULL,             -- started | completed
  last_position text,                      -- section anchor for resume
  updated_at    timestamptz,
  PRIMARY KEY (user_id, lesson_id)
)

-- The data moat: every attempt + every diagnosis
attempts (
  id            uuid PRIMARY KEY,
  user_id       text REFERENCES users,
  lesson_id     text REFERENCES lessons,
  kind          text NOT NULL,             -- quiz | prediction | checkpoint
  item_id       text NOT NULL,             -- question id / checkpoint id
  payload       jsonb NOT NULL,            -- answer given, prediction made, code hash
  correct       boolean,
  created_at    timestamptz NOT NULL DEFAULT now()
)

misconception_events (
  id            uuid PRIMARY KEY,
  attempt_id    uuid REFERENCES attempts,
  user_id       text NOT NULL,
  misconception text NOT NULL,             -- 'score-vs-weight'
  source        text NOT NULL,             -- rule | llm
  resolved_at   timestamptz,               -- set when re-test passes
  created_at    timestamptz NOT NULL DEFAULT now()
)

-- Tutor
tutor_sessions (
  id            uuid PRIMARY KEY,
  user_id       text NOT NULL,
  lesson_id     text NOT NULL,
  messages      jsonb NOT NULL,            -- append-only transcript
  token_usage   int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
)

-- Hosted execution (Month 4+)
execution_runs (
  id            uuid PRIMARY KEY,
  user_id       text NOT NULL,
  lesson_id     text NOT NULL,
  status        text NOT NULL,             -- queued | running | done | failed | timeout
  gpu_seconds   int,
  created_at    timestamptz NOT NULL DEFAULT now()
)
```

Notes:
- **Content lives in the repo, not the DB.** `concepts`/`lessons` tables are a registry synced at deploy time so foreign keys and analytics work. The DB never stores lesson bodies.
- `attempts.payload` is deliberately schemaless jsonb — attempt shapes will evolve fast; analytics reads them with jsonb operators until patterns stabilize.
- Free-tier users get rows too (progress is "local only" in *presentation* per pricing, but attempts are still logged when online — the misconception dataset is the moat and must include free users; disclosed in the privacy policy).

## 5. Content pipeline

### 5.1 Authoring = files in the repo

```
content/
  modules.yaml                    # module ordering, metadata
  concepts/
    graph.yaml                    # all concept nodes + edges
  lessons/
    04-attention/
      02-self-attention/
        lesson.mdx
        lesson.yaml
        simulation.tsx            # imports from @ail/sim-components
        notebook.ipynb
        solution.ipynb
        quiz.yaml
        diagram.svg
```

(Schemas for `lesson.yaml` and `quiz.yaml` are in design-spec §6 — single source of truth there.)

### 5.2 Build-time validation (lesson-lint)

CI runs on every content change:

1. **Schema validation** — `lesson.yaml`, `quiz.yaml` against JSON Schemas (the OSS-published schemas, D3).
2. **Graph integrity** — every `prerequisites` entry exists in `graph.yaml`; graph is acyclic; every concept reachable.
3. **Distractor tagging** — every non-correct quiz option has a `misconception` tag; every tag exists in the module's misconception catalog file (`content/misconceptions.yaml` — the closed set that constrains DB rows and the tier-2 classifier); every tag has a `diagnosis` block; every diagnosable question has a `variant` for re-testing.
4. **Sync contract** — every `sync` binding names a variable that exists as a literal assignment in exactly one cell of `notebook.ipynb`; control ids exist in the simulation.
5. **Notebook execution** — run `notebook.ipynb` and `solution.ipynb` under the same Pyodide version in CI (via Node + Pyodide); all cells must pass; synced cells profiled against the 200 ms compute budget.
6. **NumPy↔PyTorch equivalence** — where a lesson shows a PyTorch panel, an equivalence test asserts outputs match the NumPy implementation (tolerance 1e-5); the displayed pre-computed outputs are regenerated, never hand-edited.

### 5.3 Deploy

- MDX compiled at Next.js build time; simulations are code-split per lesson.
- A deploy script syncs `graph.yaml` + lesson registry into Postgres (upsert; bump `lessons.version` on content hash change).
- Notebooks ship as static assets, served from the app (they're small); user copies go to R2.

## 6. AI layer

### 6.1 Topology

```
Client → FastAPI /api/tutor (SSE stream)
            │
        Hermes orchestrator (Python lib, in-process — not a service)
            │  builds context, picks route, enforces guardrails
            ├→ Xiaomi MiMo  (default: tutor chat, diagnosis classify)
            └→ Anthropic    (fallback on MiMo error/timeout; also used
                             for lab grading where quality matters most)
```

In-process orchestration: no separate AI service to operate. Provider clients behind a common interface; routing is config, not code.

### 6.2 Tutor context assembly

Per message, the orchestrator assembles:

| Context block | Source | Budget |
|---|---|---|
| Lesson summary + current section | Pre-computed at build time per lesson | ~800 tokens |
| Notebook state: bound values + last-run cells + last outputs/errors | Client sends with request | ~1,500 tokens |
| Simulation state | Client sends (binding store snapshot) | ~100 tokens |
| Learner's open misconceptions | Postgres (`misconception_events` unresolved) | ~200 tokens |
| Conversation history | `tutor_sessions`, truncated | ~2,000 tokens |

System prompt encodes the guardrails (design spec §4.4): hint-mode in labs, never full lab solutions, always offer the three action chips where applicable. Action chips are tool calls: `apply_fix(cell_id, diff)`, `run_experiment(bindings)`, returned as structured output the client executes — the model never executes anything itself.

**Cost control:** Pro-only; per-user daily token budget (e.g., 150k tokens/day, config). `tutor_sessions.token_usage` is per-session; the daily check is `SUM(token_usage) WHERE user_id = ? AND created_at > start-of-day (UTC)` — no separate counter table until query cost demands one. Budget exhaustion degrades to "tutor is resting" with rule-based diagnosis still active. Prompt caching on the lesson-summary block.

### 6.3 Misconception diagnosis

**Tier 1 — rules (free, instant, in FastAPI):**
- Quiz: distractor → tag, direct lookup from `quiz.yaml`. No inference.
- Predictions: prediction vs actual mapped by author-defined rules in the lesson (`if predicted 'sharper' and actual 'flatter' → temperature-direction`).
- Code checkpoints: assertion failures map to tags (`assert weights.sum(axis=-1) ≈ 1` failing → `forgot-softmax`); plus a small static-pattern library (e.g., `Q @ K` without transpose → `qk-transpose`).

**Tier 2 — LLM classifier (Pro):**
- Input: learner code + expected behavior + lesson's misconception catalog (closed set).
- Output: structured `{misconception_id | 'unknown', confidence, one_line_evidence}`. Forced to choose from the catalog or `unknown` — no free-form diagnosis, which keeps it honest and evaluable.
- `unknown` results with high frequency on the same item = signal to authors that a new catalog entry is needed. Weekly review query, manual curation. This loop is how the catalog compounds (the moat).

### 6.4 Lab grading (Pro, Month 3+)

- Checkpoints are deterministic asserts (run in the same execution path as the lab).
- Rubric grading: solution notebook + learner notebook + rubric → Anthropic model → structured scores + written feedback per rubric line. Graded async (acceptable UX: "feedback in ~1 min"); results stored on the attempt.

## 7. API surface

FastAPI, versioned under `/api/v1`. Auth: Clerk JWT middleware on everything except content reads.

```
# Progress & graph
GET  /me                          → profile, plan, resume target
GET  /graph                       → concept graph + my mastery states
POST /lessons/{id}/progress       → update position/status
GET  /lessons/{id}/progress

# Attempts & diagnosis
POST /attempts                    → record quiz/prediction/checkpoint attempt
                                    response includes tier-1 diagnosis if triggered
POST /diagnose                    → tier-2 LLM diagnosis (Pro)
POST /misconceptions/{id}/resolve → mark resolved after re-test

# Tutor (Pro)
POST /tutor/message               → SSE stream; body includes client context blocks
GET  /tutor/sessions/{lesson_id}

# Notebooks
GET  /notebooks/{lesson_id}       → canonical notebook
PUT  /notebooks/{lesson_id}/mine  → save user copy (Pro → R2)
GET  /notebooks/{lesson_id}/mine

# Hosted execution (Month 4+, Pro)
POST /execute                     → submit run; returns run id
WS   /execute/{run_id}/stream     → output stream
GET  /me/quota                    → GPU-minutes remaining

# Billing
POST /billing/checkout            → Stripe checkout session
POST /billing/portal              → Stripe customer portal
POST /webhooks/stripe             → plan sync
POST /webhooks/clerk              → user sync
```

Client state strategy: attempts and progress are **fire-and-forget with local optimism** — the lesson never blocks on the network. Offline attempts queue in localStorage (client-generated UUIDs; `POST /attempts` upserts on id, so flushes are idempotent) and flush on reconnect.

**Rate limiting:** per-user token-bucket middleware on all writes (defaults: `/attempts` 60/min, `/tutor/message` 10/min, notebook saves 12/min); per-IP limits on unauthenticated routes. SlowAPI or equivalent — config, not infrastructure.

## 8. Infra, deployment, cost envelope

### 8.1 Environments

- `production` only, plus Vercel preview deployments per PR (frontend) and a `staging` Fly app deployed on merge to `main`, promoted manually. Neon branching gives a free staging DB.

### 8.2 CI/CD (GitHub Actions)

1. Lint + typecheck + unit tests (frontend, backend).
2. lesson-lint (§5.2) — content jobs run only when `content/**` changes.
3. Frontend → Vercel (automatic). Backend → Docker → Fly.io on merge.
4. Alembic migrations run on deploy, expand-contract pattern for breaking changes.

### 8.3 Monthly cost envelope (pre-revenue → early revenue)

| Item | MVP (Months 1–3) | With hosted exec (4–6) |
|---|---|---|
| Vercel | $0–20 | $20 |
| Fly.io (1 small VM) | ~$5–15 | ~$15–30 |
| Neon/Supabase | $0–25 | $25 |
| Cloudflare R2 | ~$0 | <$5 |
| Clerk | $0 (free tier) | $25 |
| LLM (tutor + tier-2) | $0 until Pro exists; then usage-capped | budget-capped per user; target <30% of Pro price |
| Modal | — | usage-based; quota-capped per user; target <20% of Pro price |
| Sentry + PostHog | $0 (free tiers) | $0–50 |
| **Total** | **~$10–60/mo** | **scales with paid users, capped by per-user quotas** |

The structural rule: **every marginal-cost feature (LLM, GPU) is Pro-gated and per-user quota-capped**, so costs can only scale with revenue.

**Traffic-spike reality check** (e.g., 10k free signups from a launch post): compute cost stays ~flat — execution is client-side and free users trigger no LLM calls. What actually breaks, in order: Clerk's free tier (~10k MAU → ~$25–100/mo), attempt-write volume on the single Fly VM + Neon free tier (mitigation: rate limits above, plus `/attempts` is the only hot write path and is batch-friendly), and Vercel bandwidth (Pyodide itself is served from the public Pyodide CDN, not our quota). Worst case is a few hundred dollars for a month — survivable, and a good problem.

## 9. Security & sandboxing

| Surface | Risk | Control |
|---|---|---|
| Pyodide execution | User code runs in the page's origin — the real risk is not the user hurting themselves but *shared* notebooks: if user A can get user B to run A's code, A's Python can reach the network (Pyodide's `js` bridge and `pyodide.http` work regardless of whether we install a fetch shim) and call our APIs with B's session | Three controls: (1) auth tokens are never exposed to the worker — API calls go through the main thread, and the worker's `postMessage` surface accepts only typed result messages, not arbitrary requests; (2) at MVP there is **no notebook sharing** — users can only run canonical lesson notebooks (CI-verified) and their own copies; (3) when sharing ships, shared notebooks open in run-disabled view mode with an explicit "I trust this code" gate, and CSP `connect-src` is locked to our own API + CDN origins so exfiltration targets are limited |
| Hosted execution | Arbitrary code on our infra | Modal container isolation; network egress disabled; pinned images; hard timeouts; output size caps; per-user quotas; no credentials in the runtime environment |
| Tutor prompt injection | Lesson/notebook content steering the model into bad actions | Action chips are the only side-effects, and they're structured tool outputs executed *client-side with user confirmation* (fix = diff w/ accept-reject; experiment = visible param change). Worst case is a bad suggestion, not an action |
| User content in R2 | Malicious notebook shared via export | Notebooks are downloads, never executed server-side except in Modal sandbox; content-type locked; no public buckets |
| Auth | Session handling bugs | Delegated to Clerk entirely; backend verifies JWTs, holds no passwords |
| Payments | Card data | Stripe-hosted checkout only; we store customer/subscription ids, never PANs |
| PII | Learner performance data is sensitive-ish | Minimal PII (email, name); misconception data keyed to user id, deletable on account deletion (hard delete, single `user_id` cascade); disclosed in privacy policy |

## 10. Testing & observability

### 10.1 Testing strategy

| Layer | Approach |
|---|---|
| Sync engine | The most-tested code in the repo. Unit tests on the binding store; Playwright tests per synced lesson: drag slider → assert cell text rewritten → assert viz updated → edit cell → assert slider moved. Runs against real Pyodide in CI |
| Content | lesson-lint (§5.2) is the test suite for content; no lesson merges red |
| Diagnosis tier 1 | Table-driven tests: (attempt payload → expected tag) per lesson, authored alongside the quiz |
| Diagnosis tier 2 | Eval set: ~50 real/synthetic wrong-code samples per lesson with expected tags; measured on accuracy + unknown-rate; run on every prompt or model change |
| Tutor | Prompt-regression evals: golden conversations checked for guardrail compliance (no lab solutions, chips offered when applicable). Run on prompt/model change, not every CI |
| Backend | pytest, transaction-rolled-back DB tests against real Postgres (Neon branch) |
| Frontend | Vitest for stores/logic; Playwright smoke for the critical path: signup → lesson → slider → quiz → diagnosis |

### 10.2 Observability

- **Sentry** both sides; Pyodide worker errors captured with lesson id + cell id (code content only with consent).
- **PostHog** product events, the ones that matter: `sync_interaction`, `prediction_made`, `diagnosis_shown`, `diagnosis_experiment_taken`, `misconception_resolved`, `tutor_chip_clicked`. The funnel *diagnosis_shown → experiment_taken → re-test passed* is the single most important product metric — it measures whether the moat works.
- **Structured logs** (JSON) on FastAPI; Fly's built-in log search is enough at this scale. No Grafana stack until it earns its keep.
- Per-provider LLM token/cost metrics logged per request; weekly cost review query.

## 11. Build order (technical view of the roadmap)

Month 1 (Attention Studio) in dependency order:

1. **Week 1:** Repo scaffold (Next.js + FastAPI monorepo), Clerk auth, Postgres schema v1, Pyodide worker loading NumPy, Monaco notebook component rendering + running `.ipynb`.
2. **Week 2:** Sync engine: binding store, cell rewrite, coalesced re-runs, desync handling. Playwright harness for sync. First simulation components (heatmap, slider, toggle) in `@ail/sim-components`.
3. **Week 3:** Lesson pipeline: MDX rendering, `lesson.yaml`/`quiz.yaml` schemas + lesson-lint, attempts API, tier-1 diagnosis, quiz UI with diagnosis cards.
4. **Week 4:** Attention Studio content (4 lessons, the pipeline view), tutor MVP (SSE chat + chips, MiMo via Hermes), Stripe + Pro gating, deploy + smoke tests.

Weeks are nights-and-weekends "weeks" — calendar slippage expected; order is the contract, not the dates.

Months 2–6 follow the roadmap in design-spec §10; new infra appears only twice: concept-graph routing (Month 2, pure backend + data work) and Modal hosted execution (Month 4).
