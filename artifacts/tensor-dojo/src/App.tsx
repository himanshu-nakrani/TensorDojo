import { Suspense } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { TopNav } from '@/components/theme/TopNav';
import { SearchPaletteProvider } from '@/components/search/SearchPalette';
import { lazy } from 'react';

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

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <SearchPaletteProvider>
        <TopNav />
        <Suspense fallback={<PageLoader />}>
          <Router />
        </Suspense>
      </SearchPaletteProvider>
    </WouterRouter>
  );
}

export default App;
