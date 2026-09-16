import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx,md,mdx}',
    './index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        // `--bg-elevated` is exposed under two names: `surface` (used by
        // newer components) and `bg-elevated` (used by ~27 older files,
        // e.g. `bg-bg-elevated`). Without this alias those classes resolve
        // to nothing, so <input>s fall back to browser-default white and
        // become invisible in dark mode. Keep both names pointing at the token.
        'bg-elevated': 'rgb(var(--bg-elevated) / <alpha-value>)',
        'bg-elevated-hover': 'rgb(var(--bg-elevated-hover) / <alpha-value>)',
        surface: 'rgb(var(--bg-elevated) / <alpha-value>)',
        'surface-2': 'rgb(var(--bg-code) / <alpha-value>)',
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        ink: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--fg-muted) / <alpha-value>)',
        dim: 'rgb(var(--fg-subtle) / <alpha-value>)',
        'fg-subtle': 'rgb(var(--fg-subtle) / <alpha-value>)',
        'fg-muted': 'rgb(var(--fg-muted) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          dim: 'var(--accent-dim)',
          faint: 'var(--accent-faint)',
          soft: 'var(--accent-soft)',
        },
        // Navigation/progress signal — never on sim controls.
        'accent-2': {
          DEFAULT: 'rgb(var(--accent-2) / <alpha-value>)',
          hover: 'rgb(var(--accent-2-hover) / <alpha-value>)',
          fg: 'rgb(var(--accent-2-fg) / <alpha-value>)',
          soft: 'var(--accent-2-soft)',
          faint: 'var(--accent-2-faint)',
        },
        warning: 'rgb(var(--warning) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        // Display serif for the home "lab notebook" editorial voice.
        // Falls back to Georgia if Newsreader hasn't loaded yet.
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        prose: '680px',
        wide: '960px',
        // Slightly wider canvas for the home hero two-column layout.
        lab: '1100px',
      },
      fontSize: {
        'prose-base': ['1.0625rem', { lineHeight: '1.75' }],
        'prose-lg': ['1.1875rem', { lineHeight: '1.75' }],
        // Named display/body/label scale (design-spec Phase 0). Use these
        // instead of arbitrary `text-[1.05rem]`-style one-offs so the
        // near-duplicate sizes flagged in docs/ux-audit.md converge.
        'display-2xl': ['3.4rem', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        'display-xl': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        'display-lg': ['2.15rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'display-md': ['1.85rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7' }],
        'body-md': ['1.0625rem', { lineHeight: '1.7' }],
        'label-sm': ['0.8125rem', { lineHeight: '1.5' }],
        'label-xs': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.12em' }],
      },
      boxShadow: {
        // Elevation system: cards rest on `card`, floating surfaces
        // (popovers, celebration toasts) use `pop`. Both are token-driven
        // so light/dark themes get appropriate weight.
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      // Instrument geometry: sharp corners everywhere. Existing
      // rounded-* classes resolve to these tighter values app-wide.
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '3px',
        md: '3px',
        lg: '5px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '10px',
        full: '9999px',
      },
      transitionTimingFunction: {
        sweep: 'var(--ease-sweep)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
    },
  },
  plugins: [],
};

export default config;
