import { Route, Switch, Router as WouterRouter } from 'wouter';
import { TopNav } from '@/components/theme/TopNav';
import { SearchPaletteProvider } from '@/components/search/SearchPalette';
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';

const HomePage = lazy(() => import('@/pages/HomePage'));
const MapPage = lazy(() => import('@/pages/MapPage'));
const LessonsPage = lazy(() => import('@/pages/LessonsPage'));
const LessonPage = lazy(() => import('@/pages/LessonPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg">
    <div className="text-muted text-sm font-mono">Loading…</div>
  </div>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/map" component={MapPage} />
      <Route path="/lessons" component={LessonsPage} />
      <Route path="/lessons/:slug" component={LessonPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

type AppErrorBoundaryState = { error: Error | null };

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TensorDojo application error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center bg-bg px-6 py-16">
        <section className="w-full max-w-xl rounded-md border border-border bg-surface p-8 text-center shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-accent">Something went wrong</p>
          <h1 className="mt-3 text-2xl font-semibold text-ink">The lab needs a reset.</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            This page could not finish rendering. Your local lesson progress is still safe.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="focus-ring rounded-md border border-border px-4 py-2 text-sm font-mono text-ink hover:bg-bg-elevated"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <a
              className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-mono text-white hover:bg-accent-hover"
              href="/lessons"
            >
              Browse lessons
            </a>
          </div>
        </section>
      </main>
    );
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <SearchPaletteProvider>
          <TopNav />
          <Suspense fallback={<PageLoader />}>
            <Router />
          </Suspense>
        </SearchPaletteProvider>
      </WouterRouter>
    </AppErrorBoundary>
  );
}

export default App;
