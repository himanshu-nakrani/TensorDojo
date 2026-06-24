import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { TopNav } from '@/components/theme/TopNav';
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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tensordojo.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TensorDojo — learn how LLMs work by manipulating them',
    template: '%s · TensorDojo',
  },
  description:
    '58 interactive lessons across 8 tracks. Every concept is a sim you can drag, with the math underneath you can read.',
  openGraph: {
    type: 'website',
    siteName: 'TensorDojo',
    title: 'TensorDojo — learn how LLMs work by manipulating them',
    description:
      '58 interactive lessons across 8 tracks. Every concept is a sim you can drag, with the math underneath you can read.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TensorDojo — learn how LLMs work by manipulating them',
    description:
      '58 interactive lessons across 8 tracks. Every concept is a sim you can drag, with the math underneath you can read.',
  },
};

/**
 * Synchronous, blocking, < 200 bytes. Runs before React hydrates
 * so the page never paints in the wrong theme. Reads localStorage
 * first (explicit user choice), then prefers-color-scheme. If
 * neither is available, falls back to dark — but the OS preference
 * is honored when present. The useTheme hook uses the same
 * precedence.
 */
const themeBootstrapScript = `
(function() {
  try {
    var ls = localStorage.getItem('tld-theme');
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    var sysKnown = !!(mq && (mq.media === '(prefers-color-scheme: dark)'));
    var dark = ls ? ls === 'dark' : (sysKnown ? mq.matches : true);
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
        <a
          href="#main"
          className="focus-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-bg-elevated focus:px-3 focus:py-1.5 focus:text-sm focus:text-ink"
        >
          Skip to content
        </a>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
