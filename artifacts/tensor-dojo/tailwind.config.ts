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
        warning: 'rgb(var(--warning) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      maxWidth: {
        prose: '680px',
        wide: '960px',
      },
      fontSize: {
        'prose-base': ['1.0625rem', { lineHeight: '1.75' }],
        'prose-lg': ['1.1875rem', { lineHeight: '1.75' }],
      },
    },
  },
  plugins: [],
};

export default config;
