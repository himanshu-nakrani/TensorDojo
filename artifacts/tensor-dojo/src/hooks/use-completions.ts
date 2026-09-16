import { useEffect, useState } from 'react';
import { getCompleted, subscribeToCompletions, type Completions } from '@/lib/progress/completion';

/**
 * Live view of the completion store. Re-renders when any lesson is
 * marked complete/incomplete, in this tab or another.
 */
export function useCompletions(): {
  completed: Completions;
  set: Set<string>;
  count: number;
} {
  const [completed, setCompleted] = useState<Completions>(() => getCompleted());

  useEffect(() => {
    const refresh = () => setCompleted(getCompleted());
    refresh();
    return subscribeToCompletions(refresh);
  }, []);

  const slugs = Object.keys(completed);
  return { completed, set: new Set(slugs), count: slugs.length };
}
