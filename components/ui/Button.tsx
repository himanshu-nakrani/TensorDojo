'use client';

import { forwardRef, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg';

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

type ButtonProps = CommonProps &
  (
    | { href: string; onClick?: () => void }
    | { href?: undefined; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; 'aria-label'?: string }
  );

const BASE =
  'focus-ring inline-flex items-center gap-2 rounded-md font-mono font-semibold text-body transition-colors';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary:
    'border border-border-strong text-ink hover:border-accent hover:text-accent',
  ghost: 'text-accent hover:text-accent-hover hover:bg-accent-soft',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-[44px] px-4 py-2',
  lg: 'min-h-[48px] px-5 py-3',
};

/**
 * The one button. Primary = signal-filled action; secondary =
 * hairline-outline action; ghost = quiet inline action. Pass
 * `href` to render a Next Link, otherwise a native button.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { children, variant = 'primary', size = 'md', className, ...rest },
    ref,
  ) {
    const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);
    if (rest.href !== undefined) {
      const { href, onClick } = rest;
      return (
        <Link href={href} onClick={onClick} className={classes}>
          {children}
        </Link>
      );
    }
    const { onClick, type = 'button', disabled, 'aria-label': ariaLabel } = rest;
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(classes, disabled && 'opacity-50 pointer-events-none')}
      >
        {children}
      </button>
    );
  },
);
