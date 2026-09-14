import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names, then dedupe conflicting Tailwind
 * utilities (later wins). Use everywhere a component composes
 * classes from props + internals so callers can override styles
 * without fighting specificity.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
