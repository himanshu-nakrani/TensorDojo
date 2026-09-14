# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/tensor-dojo/` — the Tensor Dojo web app (Vite + React + MDX): 58 lessons in `src/content/lessons/<slug>/lesson.mdx`, interactives registered per-lesson via `src/lib/lesson-manifest.ts`
- Theme source of truth: `artifacts/tensor-dojo/src/index.css` — all colors are RGB-triplet CSS tokens on `:root` / `:root.dark` ("Humanist Clarity": IBM Plex Sans/Mono, slate palette, blue accent, inverted dark code blocks). Fonts load in `index.html`; `--font-sans`/`--font-mono` are defined in `index.css` and consumed by `tailwind.config.ts`

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Tensor Dojo theme: append `?theme=dark|light` to any app URL to force a theme for that load without persisting it (used for screenshots/sharing; bootstrap script in `index.html`)
- `.lesson-body` spacing: element `margin: 0` resets outspecific the `> * + *` rhythm rule — direct-child `margin-top` rules at the end of the lesson-body block in `index.css` restore it; keep new element resets consistent with that pattern

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
