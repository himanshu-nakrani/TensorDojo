import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0B0D10',
        surface: '#14181D',
        'surface-2': '#1A1F25',
        border: '#1F242A',
        'border-strong': '#2A323B',
        ink: '#E5E7EB',
        muted: '#9CA3AF',
        dim: '#6B7280',
        'accent-soft': 'rgba(45, 212, 191, 0.16)',
        accent: {
          DEFAULT: '#2DD4BF',
          hover: '#5EEAD4',
          dim: 'rgba(45, 212, 191, 0.28)',
          faint: 'rgba(45, 212, 191, 0.10)',
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
