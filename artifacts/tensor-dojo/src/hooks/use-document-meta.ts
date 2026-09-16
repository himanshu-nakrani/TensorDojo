import { useEffect } from 'react';

interface DocumentMeta {
  title: string;
  description?: string;
  /** Path (without origin) used for og:url / canonical. Defaults to location.pathname. */
  path?: string;
  /** Override the shared og:image (e.g. a per-lesson card). */
  image?: string;
}

function upsertMeta(selector: string, attrs: Record<string, string>): void {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
}

/**
 * Per-route document metadata: <title>, description, canonical URL,
 * and Open Graph / Twitter tags. The SPA ships one static index.html,
 * so every route updates the head on mount — crawlers that execute JS
 * (and every link-unfurler) see route-correct cards.
 */
export function useDocumentMeta({ title, description, path, image }: DocumentMeta): void {
  useEffect(() => {
    document.title = title;

    const url = `${window.location.origin}${path ?? window.location.pathname}`;
    const img = image ?? `${window.location.origin}/og.png`;

    upsertMeta('meta[name="description"]', { name: 'description', content: description ?? '' });
    upsertMeta('link[rel="canonical"]', { rel: 'canonical', href: url });

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    if (description) {
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    }
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: img });

    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    if (description) {
      upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    }
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: img });
  }, [title, description, path, image]);
}
