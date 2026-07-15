/**
 * next/dynamic shim for Vite migration.
 * Wraps React.lazy with Suspense so callers work without change.
 *
 * next/dynamic factories can return either:
 *   - A raw ComponentType (when using .then(m => m.Named))
 *   - A module-like object { default: ComponentType } from bare import()
 *
 * React.lazy requires { default: ComponentType }, so we normalise.
 */
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

type DynamicOptions<P> = {
  loading?: () => ReactNode;
  ssr?: boolean;
};

type FactoryResult<P> = ComponentType<P> | { default: ComponentType<P> };

export default function dynamic<P extends object>(
  factory: () => Promise<FactoryResult<P>>,
  options?: DynamicOptions<P>,
): ComponentType<P> {
  const LazyComponent = lazy(() =>
    factory().then((result) => {
      // If it's already module-shaped, pass through
      if (
        result &&
        typeof result === 'object' &&
        'default' in result &&
        typeof (result as { default: unknown }).default === 'function'
      ) {
        return result as { default: ComponentType<P> };
      }
      // Otherwise, it's a raw ComponentType
      return { default: result as ComponentType<P> };
    }),
  );

  const LoadingFallback = options?.loading;
  return function DynamicComponent(props: P) {
    return (
      <Suspense fallback={LoadingFallback ? LoadingFallback() : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
