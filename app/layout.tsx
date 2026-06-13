import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Learning Lab',
  description:
    'Learn AI engineering by manipulating, implementing, and deploying every concept.',
};

/**
 * Synchronous, blocking, < 200 bytes. Runs before React hydrates
 * so the page never paints in the wrong theme. Reads localStorage
 * first (explicit user choice), then prefers-color-scheme, then
 * falls back to dark (the existing default). The matching read in
 * the useTheme hook uses the same precedence.
 */
const themeBootstrapScript = `
(function() {
  try {
    var ls = localStorage.getItem('tld-theme');
    var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = ls ? ls === 'dark' : (sysDark || true);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      // The inline no-flash script above mutates the html className
      // before React hydrates. The DOM may end up with `dark` that
      // the server-rendered tree didn't carry. Suppress the
      // hydration warning on this single element so React keeps
      // the script-set value instead of resetting it on hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-screen bg-bg text-ink antialiased font-sans">
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
