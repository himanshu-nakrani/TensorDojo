import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{md,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces — all read from CSS custom properties stored as
        // bare RGB channels in app/globals.css. The `<alpha-value>`
        // placeholder is replaced by Tailwind when the user writes
        // e.g. `bg-bg/40`. See tailwind docs on "Using CSS variables".
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--bg-elevated) / <alpha-value>)',
        'surface-2': 'rgb(var(--bg-code) / <alpha-value>)',
        // Lines
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        // Text
        ink: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--fg-muted) / <alpha-value>)',
        dim: 'rgb(var(--fg-subtle) / <alpha-value>)',
        // Aliases that mirror the CSS var name (--fg, --fg-muted,
        // --fg-subtle). Same colors as ink/muted/dim; the alias lets
        // code that reads the var literally also work as a Tailwind
        // class (text-fg-subtle, fill-fg-subtle, etc.).
        'fg-subtle': 'rgb(var(--fg-subtle) / <alpha-value>)',
        'fg-muted': 'rgb(var(--fg-muted) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        // Accent (manipulable only — design-spec §8). DEFAULT/hover/fg
        // are channel-based so the alpha modifier works; soft/faint/dim
        // are pre-baked rgba because they describe a specific visual
        // rather than a themed color at a particular alpha.
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          dim: 'var(--accent-dim)',
          faint: 'var(--accent-faint)',
          soft: 'var(--accent-soft)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      maxWidth: {
        prose: '720px',
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
