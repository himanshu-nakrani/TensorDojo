# Frontend Application

Next.js 15+ application for AI Learning Lab, deployed on Vercel.

## 🏗️ Architecture

```
frontend/
├── app/                       # Next.js App Router
│   ├── (auth)/                # Authenticated routes group
│   │   ├── layout.tsx         # Authenticated layout with Clerk
│   │   ├── page.tsx           # Dashboard / home page
│   │   ├── concept-map/        # Concept graph visualization
│   │   │   └── page.tsx
│   │   ├── lessons/           # Lesson pages
│   │   │   ├── [module]/      # Module slug
│   │   │   │   └── [lesson]/  # Lesson slug
│   │   │   │       └── page.tsx
│   │   ├── labs/              # Lab pages
│   │   │   └── [lab]/         # Lab slug
│   │   │       └── page.tsx
│   │   └── settings/          # User settings
│   │       └── page.tsx
│   ├── (marketing)/           # Public marketing pages
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing page
│   │   ├── pricing/           # Pricing page
│   │   │   └── page.tsx
│   │   └── about/             # About page
│   │       └── page.tsx
│   ├── api/                   # API routes (Next.js API routes)
│   │   └── revalidate/        # On-demand revalidation
│   │       └── route.ts
│   ├── layout.tsx             # Root layout
│   ├── globals.css            # Global styles
│   └── not-found.tsx          # 404 page
├── components/                 # Reusable React components
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── slider.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   ├── layout/                # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── sidebar.tsx
│   │   └── navigation.tsx
│   ├── lesson/                # Lesson-specific components
│   │   ├── lesson-content.tsx # MDX content renderer
│   │   ├── workbench.tsx      # Simulation/notebook workbench
│   │   ├── simulation.tsx     # Simulation container
│   │   ├── notebook.tsx       # Notebook UI (Monaco-based)
│   │   ├── quiz.tsx           # Quiz component
│   │   └── sync-indicator.tsx # Sync status indicator
│   ├── tutor/                 # AI tutor components
│   │   ├── tutor-panel.tsx    # Docked tutor chat panel
│   │   ├── tutor-message.tsx  # Message bubble
│   │   ├── action-chips.tsx   # Show fix, Run experiment, Explain more
│   │   └── diff-viewer.tsx    # Code diff viewer for "Show fix"
│   ├── concept-map/           # Concept graph components
│   │   ├── graph-view.tsx     # Interactive graph visualization
│   │   ├── node.tsx           # Concept node
│   │   └── edge.tsx           # Prerequisite edge
│   ├── shared/                # Shared utility components
│   │   ├── math-code.tsx      # Math + Code side-by-side
│   │   ├── heatmap.tsx        # Heatmap visualization
│   │   ├── diagram.tsx        # SVG diagram renderer
│   │   └── loading.tsx        # Loading states
│   └── providers/             # Context providers
│       ├── sync-provider.tsx  # Sync engine context
│       ├── auth-provider.tsx  # Clerk auth context
│       └── theme-provider.tsx # Dark mode context
├── lib/                        # Utility functions and hooks
│   ├── utils.ts               # General utilities (cn, formatters)
│   ├── constants.ts           # App constants
│   ├── fonts.ts               # Font configurations
│   ├── api/                   # API client
│   │   ├── client.ts          # Axios/fetch client setup
│   │   ├── hooks.ts           # React Query hooks
│   │   └── endpoints/         # API endpoint definitions
│   │       ├── progress.ts
│   │       ├── attempts.ts
│   │       └── tutor.ts
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-sync.ts        # Sync engine hook
│   │   ├── use-notebook.ts    # Notebook management hook
│   │   ├── use-simulation.ts  # Simulation control hook
│   │   └── use-media-query.ts # Responsive hooks
│   ├── store/                 # State management (Zustand)
│   │   ├── sync-store.ts      # Sync engine state
│   │   ├── notebook-store.ts  # Notebook state
│   │   ├── tutor-store.ts     # Tutor chat state
│   │   └── ui-store.ts        # UI state (modals, drawers)
│   └── workers/               # Web Workers
│       └── pyodide-worker.ts  # Pyodide Web Worker entry
├── styles/                    # Global and module styles
│   ├── globals.css
│   └── theme/                 # Design system tokens
│       ├── colors.css
│       ├── spacing.css
│       └── typography.css
├── public/                    # Static assets
│   ├── images/                # Static images
│   ├── fonts/                 # Font files (if self-hosted)
│   └── favicon.ico
├── types/                     # TypeScript type definitions
│   ├── index.ts               # Global types
│   ├── lesson.ts              # Lesson types
│   ├── notebook.ts            # Notebook types
│   ├── sync.ts                # Sync engine types
│   ├── api.ts                 # API response types
│   └── components.ts          # Component props types
├── workers/                   # Web Worker files
│   └── pyodide.worker.js      # Pyodide worker bundle
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier configuration
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn or pnpm
- Next.js 15+ (installed via package.json)

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Or with yarn
npm install -g yarn
yarn install

# Or with pnpm
npm install -g pnpm
pnpm install
```

### Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

Required environment variables:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key  # Only for API routes

# Stripe (for billing UI)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Sentry (optional, for error tracking)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# PostHog (optional, for analytics)
NEXT_PUBLIC_POSTHOG_API_KEY=your_posthog_api_key
NEXT_PUBLIC_POSTHOG_URL=https://app.posthog.com

# App settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENV=development
```

### Running Locally

```bash
# Development server
npm run dev

# Or with specific port
npm run dev -- -p 3001

# Production build
npm run build

# Production server
npm run start

# Lint
npm run lint

# Type check
npm run type-check
```

The app will be available at `http://localhost:3000`

### Pyodide Setup

The Pyodide worker needs to be bundled separately:

```bash
# Build the Pyodide worker (from repo root)
npm run build:worker

# Or manually
cd frontend/workers
npx esbuild pyodide.worker.js --bundle --format=esm --outfile=../public/pyodide.worker.js --platform=browser
```

## 📦 Key Dependencies

### Core
- **Next.js 15+** — React framework with App Router
- **React 18+** — UI library
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first CSS

### UI & Components
- **shadcn/ui** — High-quality, accessible component library
- **@radix-ui/react-*** — Headless UI primitives
- **lucide-react** — Icon library
- **framer-motion** — Animations

### Code Execution
- **pyodide** — Python WASM runtime for in-browser execution
- **@monaco-editor/react** — Monaco code editor for notebooks

### State Management
- **zustand** — Lightweight state management
- **@tanstack/react-query** — Server state management

### Math & Visualization
- **katex** — Math rendering
- **react-katex** — React wrapper for KaTeX
- **d3** — Data visualization (optional, for complex visualizations)
- **p5.js** — Creative coding (optional, for specific simulations)

### API & Data
- **axios** or **fetch** — HTTP client
- **zod** — Schema validation
- **date-fns** — Date utilities

## 🎯 Core Components

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (auth state, navigation, settings)                     │
├─────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  Authenticated Layout                                      │   │
│  │  ┌──────────────┬───────────────────────────────────┐  │   │
│  │  │              │                                   │  │   │
│  │  │  Sidebar     │    Main Content Area             │  │   │
│  │  │  (collaps-  │                                   │  │   │
│  │  │   ible)     │    - Lesson page                 │  │   │
│  │  │              │    - Concept map                 │  │   │
│  │  │  Navigation  │    - Lab page                    │  │   │
│  │  │  Progress    │    - Settings                    │  │   │
│  │  │              │                                   │  │   │
│  │  └──────────────┴───────────────────────────────┘  │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Tutor Panel (docked, collapsible)                 │ │   │
│  │  │  - Chat history                                        │ │   │
│  │  │  - Action chips (Show fix, Run experiment, More)   │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────┤
│  Footer (minimal, links to docs, feedback)                     │
└─────────────────────────────────────────────────────────────┘
```

### Lesson Page (The Core Surface)

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back    Lesson Title          ③/⑦  [Tutor 💬]  [⚙]  [⋮]        │
├──────────────────────────────┬─────────────────────────────────────┤
│ EXPLANATION (scrolls)        │ WORKBENCH (sticky)                  │
│                              │ ┌─[Simulation]──[Notebook]────────┐ │
│ ## Section Title               │ │                                 │ │
│                              │ │   ┌─────────────────────┐       │ │
│ Paragraph text with           │ │   │  Simulation Visual  │       │ │
│ embedded components.          │ │   │  (heatmap, graph,   │       │ │
│                              │ │   │   etc.)             │       │ │
│ <MathCodeBlock>              │ │   │                     │       │ │
│   Math: σ(x) = 1/(1+e^-x)     │ │   │  temperature ──●── 0.8    │ │
│   Code: def sigmoid(x):       │ │   │                     │       │ │
│        return 1/(1+np.exp(-x))│ │   │  causal mask  [ON ]   │       │ │
│ </MathCodeBlock>             │ │   │                     │       │ │
│                              │ │   ⚡ synced with        │       │ │
│ Try it → drag the slider       │ │    notebook            │       │ │
│ and watch the curve change.   │ └─────────────────────────────────┘ │
│                              │                                     │
│ ## Next Section               │  [Check understanding →]            │
│                              │                                     │
│ [Quiz appears here when       │                                     │
│  "Check understanding" clicked]│                                     │
└──────────────────────────────┴─────────────────────────────────────┘
```

### Workbench Component

The workbench is the sticky right column containing:

1. **Tab Switcher** — Simulation | Notebook | Both (split view)
2. **Simulation Panel** — Interactive widgets with sync bindings
3. **Notebook Panel** — Monaco-based notebook UI
4. **Sync Indicator** — Shows sync status and bound variables
5. **Quiz Launcher** — "Check understanding" button

### Sync Engine Integration

The sync engine connects simulations ↔ notebooks ↔ visualizations:

```typescript
// In a lesson page component
import { useSyncStore } from '@/lib/store/sync-store';

function LessonPage({ lesson }) {
  const { values, setValue, status } = useSyncStore();
  
  const handleSliderChange = (controlId: string, value: number) => {
    setValue(controlId, value, 'sim');
    // This triggers:
    // 1. Cell rewrite in bound notebook cell
    // 2. Re-run of bound cell + downstream cells
    // 3. Visualization update from new outputs
  };
  
  return (
    <Workbench 
      lesson={lesson} 
      onControlChange={handleSliderChange}
    />
  );
}
```

### Notebook Component

Monaco-based notebook UI with:

- **Cell types:** Code, Markdown, Raw
- **Execution:** Pyodide worker for Python execution
- **Sync bindings:** Highlighted bound variables
- **Output rendering:** Text, images, plots, errors
- **Autosave:** LocalStorage (Free) or R2 (Pro)

```typescript
// Notebook cell component
function NotebookCell({ cell, onRun, onEdit }) {
  const { isBound, variableName } = useSyncBinding(cell.id);
  
  return (
    <div className={cn("cell", isBound && "bound")}>
      {isBound && (
        <SyncBadge 
          variable={variableName} 
          tooltip="Bound to simulation control" 
        />
      )}
      <MonacoEditor
        language="python"
        value={cell.source}
        onChange={onEdit}
      />
      <CellOutput output={cell.output} error={cell.error} />
      <RunButton onClick={() => onRun(cell.id)} />
    </div>
  );
}
```

### Tutor Panel

Docked chat panel with:

- **SSE streaming** — Real-time message streaming
- **Action chips** — Structured tool outputs
- **Context assembly** — Automatic lesson/notebook context
- **History** — Persistent per-lesson chat history

```typescript
// Tutor panel component
function TutorPanel({ lessonId }) {
  const { messages, sendMessage, isStreaming } = useTutor(lessonId);
  
  return (
    <Drawer open={isOpen} onClose={onClose}>
      <div className="tutor-panel">
        <TutorHeader />
        <MessageList messages={messages} />
        <MessageInput 
          onSend={sendMessage} 
          disabled={isStreaming}
        />
      </div>
    </Drawer>
  );
}

// Action chip component
function ActionChip({ type, data, onClick }) {
  const icons = {
    fix: <CodeIcon />,
    experiment: <BeakerIcon />,
    explain: <BookOpenIcon />,
  };
  
  return (
    <button 
      className="action-chip" 
      onClick={() => onClick(data)}
    >
      {icons[type]}
      {type === 'fix' && 'Show fix'}
      {type === 'experiment' && 'Run experiment'}
      {type === 'explain' && 'Explain more'}
    </button>
  );
}
```

## 🎨 Design System

### Color Palette (Dark Mode Default)

```css
/* colors.css */
:root {
  /* Background */
  --background: 0 0% 3.9%;           /* #100f17 */
  --background-hover: 0 0% 7%;       /* #1c1b22 */
  --surface: 0 0% 6%;               /* #18181b */
  --surface-hover: 0 0% 8%;          /* #212024 */
  
  /* Foreground */
  --foreground: 0 0% 98%;            /* #fafafa */
  --foreground-muted: 0 0% 70%;      /* #b3b3b3 */
  --foreground-subtle: 0 0% 50%;    /* #808080 */
  
  /* Accent (Interactive elements) */
  --accent: 262 83% 58%;            /* #8b5cf6 */
  --accent-hover: 262 83% 65%;       /* #a78bfa */
  --accent-foreground: 0 0% 98%;      /* White text on accent */
  
  /* Success / Warning / Error */
  --success: 160 84% 39%;           /* #10b981 */
  --warning: 38 92% 50%;             /* #f59e0b */
  --error: 0 84% 60%;               /* #ef4444 */
  
  /* Sync-specific */
  --sync-active: 160 100% 40%;      /* Bright green for active sync */
  --sync-idle: 262 83% 58%;          /* Accent color for idle sync */
  --sync-desynced: 0 84% 60%;        /* Error color for desync */
}
```

**Design Rule:** The accent color is used **only** for interactive/synced elements. This single rule teaches "what can I touch" without instruction.

### Typography

```css
/* typography.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-size-base: 16px;
  --font-size-sm: 14px;
  --font-size-xs: 12px;
  --line-height: 1.6;
}

/* Monospace for everything executable */
code, .code, .variable, .value {
  font-family: var(--font-mono);
  font-size: 0.9em;
}
```

### Spacing

```css
/* spacing.css */
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
}
```

## 🤖 Pyodide Integration

### Worker Setup

Pyodide runs in a dedicated Web Worker to avoid blocking the main thread:

```typescript
// lib/workers/pyodide-worker.ts
import { expose, proxy } from 'comlink';
import { loadPyodide, PyodideInterface } from 'pyodide';

let pyodide: PyodideInterface | null = null;

async function initialize() {
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
  });
  
  // Pre-load NumPy
  await pyodide.loadPackage(['numpy']);
  
  return pyodide;
}

expose({
  initialize,
  async runCode(code: string, cellId: string) {
    if (!pyodide) await initialize();
    
    try {
      const result = await pyodide.runPythonAsync(code);
      return { 
        cellId, 
        output: result || null,
        error: null 
      };
    } catch (error: any) {
      return { 
        cellId, 
        output: null,
        error: error.message 
      };
    }
  },
  async installPackage(packageName: string) {
    if (!pyodide) await initialize();
    await pyodide.loadPackage(packageName);
  },
  async getVariable(value: string) {
    if (!pyodide) await initialize();
    return pyodide.globals.get(value);
  },
});
```

### Worker Usage

```typescript
// lib/hooks/use-pyodide.ts
import { useEffect, useRef, useCallback } from 'react';
import { wrap, releaseProxy } from 'comlink';

interface PyodideWorker {
  initialize: () => Promise<void>;
  runCode: (code: string, cellId: string) => Promise<ExecutionResult>;
  installPackage: (packageName: string) => Promise<void>;
  getVariable: (name: string) => Promise<any>;
}

export function usePyodide() {
  const workerRef = useRef<Worker | null>(null);
  const pyodideRef = useRef<PyodideWorker | null>(null);
  
  useEffect(() => {
    // Load worker from public directory
    const worker = new Worker('/pyodide.worker.js', { type: 'module' });
    workerRef.current = worker;
    
    const pyodideProxy = wrap<PyodideWorker>(worker);
    pyodideRef.current = pyodideProxy;
    
    // Pre-warm the worker
    pyodideProxy.initialize();
    
    return () => {
      if (pyodideRef.current) {
        releaseProxy(pyodideRef.current);
      }
      worker.terminate();
    };
  }, []);
  
  const runCode = useCallback(async (code: string, cellId: string) => {
    if (!pyodideRef.current) return;
    return pyodideRef.current.runCode(code, cellId);
  }, []);
  
  return { runCode, installPackage: pyodideRef.current?.installPackage };
}
```

### Performance Optimization

**Pre-warming:** Worker is initialized and NumPy pre-loaded when lesson page loads.

**Caching:** Service worker caches Pyodide runtime (~10MB) after first visit.

**Runtime preload:** On home page, if user has a "Continue" target, preload the worker.

**Skeleton UI:** Show loading state during worker initialization.

**Budget:** Synced cells must complete in <200ms compute time (CI validated).

## 🧪 Testing

### Unit Tests (Vitest)

```bash
npm run test:unit
```

Tests for:
- Stores (Zustand)
- Utility functions
- Component logic

```typescript
// tests/unit/sync-store.test.ts
import { create } from 'zustand';
import { createSyncStore } from '@/lib/store/sync-store';

describe('sync store', () => {
  it('should update value and increment generation', () => {
    const store = createSyncStore();
    
    const initial = store.getState();
    expect(initial.values.temperature).toBeUndefined();
    expect(initial.generation).toBe(0);
    
    store.getState().setValue('temperature', 0.5, 'sim');
    
    const updated = store.getState();
    expect(updated.values.temperature).toBe(0.5);
    expect(updated.generation).toBe(1);
  });
});
```

### Component Tests

```bash
npm run test:component
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
npx playwright test
```

**Critical path tests:**
1. Signup → Lesson → Slider drag → Quiz → Diagnosis
2. Notebook edit → Sync to slider
3. Tutor chat → Action chip click
4. Offline → Online sync flush

```typescript
// e2e/lesson-flow.spec.ts
import { test, expect } from '@playwright/test';

test('lesson sync flow', async ({ page }) => {
  await page.goto('/lessons/attention/self-attention');
  
  // Wait for Pyodide to load
  await page.waitForSelector('[data-testid="pyodide-ready"]');
  
  // Drag temperature slider
  const slider = page.locator('[data-testid="temperature-slider"]');
  await slider.dragTo(slider, { targetPosition: { x: 100, y: 0 } });
  
  // Verify notebook cell was updated
  const cell = page.locator('[data-testid="cell-temperature"]');
  await expect(cell).toHaveText(/temperature = 1\.25/);
  
  // Verify visualization updated
  await expect(page.locator('[data-testid="heatmap"]')).toBeVisible();
});

test('diagnosis flow', async ({ page }) => {
  await page.goto('/lessons/attention/self-attention');
  
  // Open quiz
  await page.click('[data-testid="check-understanding"]');
  
  // Answer wrong
  await page.click('[data-testid="option-score"]');
  await page.click('[data-testid="submit"]');
  
  // Verify diagnosis card appears
  await expect(page.locator('[data-testid="diagnosis-card"]')).toBeVisible();
  await expect(page.getByText('score with weight')).toBeVisible();
  
  // Click experiment link
  await page.click('[data-testid="try-experiment"]');
  
  // Verify simulation opened with preset
  await expect(page.locator('[data-testid="temperature-slider"]')).toHaveValue('0.5');
});
```

### Test Coverage

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Vitest | >80% |
| Component | Vitest + React Testing Library | >70% |
| E2E | Playwright | Critical paths |
| API | Backend tests | >80% |

## 📊 Performance

### Core Web Vitals

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | <1.8s | Lighthouse |
| Largest Contentful Paint | <2.5s | Lighthouse |
| First Input Delay | <100ms | Lighthouse |
| Cumulative Layout Shift | <0.1 | Lighthouse |
| Time to Interactive | <3.8s | Lighthouse |

### Custom Metrics

| Interaction | Target | Notes |
|-------------|--------|-------|
| Pyodide cold start | <4s | First lesson load |
| Pyodide warm start | <1s | Subsequent lessons |
| Synced cell re-run | <500ms | End-to-end |
| Slider → visualization update | <300ms | Perceived |
| Tutor first response | <2s | With caching |

### Optimization Techniques

1. **Code Splitting:** Lessons and simulations code-split per lesson
2. **Lazy Loading:** Pyodide worker lazy-loaded per lesson
3. **Image Optimization:** Next.js Image component for all images
4. **Font Optimization:** Self-host fonts with WOFF2
5. **Bundle Analysis:** `npm run analyze` to check bundle sizes

## 🌐 Routing

### Route Structure

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Marketing landing | Public landing page |
| `/signup` | Clerk signup | Authentication |
| `/signin` | Clerk signin | Authentication |
| `/dashboard` | Authenticated home | Resume point, progress |
| `/map` | Concept map | Full graph view |
| `/lessons/[module]/[lesson]` | Lesson page | Core learning surface |
| `/labs/[lab]` | Lab page | Engineering exercises |
| `/settings` | Settings page | Account, billing |
| `/settings/billing` | Billing page | Stripe portal |

### Dynamic Routes

Lessons are dynamically generated from content directory:

```typescript
// app/(auth)/lessons/[module]/[lesson]/page.tsx
import { getLesson } from '@/lib/lessons';

export default async function LessonPage({
  params: { module, lesson },
}: {
  params: { module: string; lesson: string };
}) {
  const lessonData = await getLesson(module, lesson);
  
  if (!lessonData) {
    notFound();
  }
  
  return <LessonClient lesson={lessonData} />;
}
```

## 🌓 Dark Mode

Dark mode is the default (audience expectation for developer tools).

```typescript
// components/providers/theme-provider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="dark" 
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}
```

## 📱 Responsive Design

### Breakpoints

```css
/* tailwind.config.js */
module.exports = {
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
};
```

### Responsive Layouts

| Breakpoint | Layout |
|------------|--------|
| < md (768px) | Single column, workbench as bottom sheet |
| md - lg | Two column, workbench right, reduced width |
| ≥ lg (1024px) | Two column, workbench right, full width |

**Mobile considerations:**
- Simulations work fully
- Notebook editing is read-only (run, don't write)
- Tutor panel becomes full-screen overlay
- Navigation collapses into hamburger menu

## 🎛️ Feature Flags

Feature flags for gradual rollouts:

```typescript
// lib/constants.ts
export const FEATURE_FLAGS = {
  // AI Tutor (Pro feature)
  TUTOR_ENABLED: process.env.NEXT_PUBLIC_TUTOR_ENABLED === 'true',
  
  // Hosted execution (Pro feature, Month 4+)
  HOSTED_EXECUTION_ENABLED: process.env.NEXT_PUBLIC_HOSTED_EXECUTION_ENABLED === 'true',
  
  // LLM diagnosis (Pro feature)
  LLM_DIAGNOSIS_ENABLED: process.env.NEXT_PUBLIC_LLM_DIAGNOSIS_ENABLED === 'true',
  
  // Concept graph routing (Month 2+)
  GRAPH_ROUTING_ENABLED: process.env.NEXT_PUBLIC_GRAPH_ROUTING_ENABLED === 'true',
  
  // In development
  IN_DEVELOPMENT: process.env.NODE_ENV === 'development',
};
```

## 📦 Build & Deploy

### Development Build

```bash
npm run dev
```

- Hot module replacement
- Fast refresh
- Source maps

### Production Build

```bash
npm run build
```

- Optimized bundles
- Tree shaking
- Minification
- Static generation where possible

### Preview Build

```bash
npm run build:preview
npm run preview
```

- Production-like build for local testing

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy with specific environment
vercel --env NEXT_PUBLIC_API_URL=https://api-staging.ail.com
```

### Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": { "installCommand": "npm install" }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "http://backend:8000/api/$1",
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"]
    },
    {
      "src": "/execute/(.*)",
      "dest": "http://backend:8000/execute/$1",
      "methods": ["GET", "POST"],
      "headers": { "Upgrade": "websocket" }
    }
  ]
}
```

### Environment Variables (Vercel)

Set via Vercel dashboard or CLI:

```bash
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
```

## 🧰 Tooling

### Code Formatting

```bash
npm run format
# or
prettier --write .
```

### Linting

```bash
npm run lint
# or
next lint
```

### Type Checking

```bash
npm run type-check
# or
tsc --noEmit
```

### Bundle Analysis

```bash
npm run analyze
# or
npx @next/bundle-analyzer
```

### Storybook (Optional)

```bash
npm run storybook
```

For developing UI components in isolation.

## 📚 Related Documentation

- [Design Spec](../design-spec.md) — Product requirements and UX
- [Technical Spec](../technical-spec.md) — Full architecture overview
- [Backend Service](../backend/README.md) — API service documentation
- [Content Directory](../content/README.md) — Lesson content structure

---

## 🎓 Learning Resources

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Learn Course](https://nextjs.org/learn)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### State Management
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)

### Pyodide
- [Pyodide Documentation](https://pyodide.org/en/stable/usage/api.html)
- [Pyodide Examples](https://pyodide.org/en/stable/examples.html)
