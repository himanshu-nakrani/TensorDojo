/**
 * Toy RAG retrieval over a small fixed corpus.
 *
 * Each document has a hand-authored embedding so the demo can run
 * without shipping a real embedding model. Queries are matched to
 * pre-computed query embeddings (with a generic "out-of-corpus"
 * embedding for anything unknown).
 *
 * The math is the dot-product lesson at scale: cosine similarity
 * between the query and every document, sort, take top-k.
 */

export interface Doc {
  id: string;
  title: string;
  text: string;
  /** Hand-placed embedding in a small semantic space. */
  embedding: number[];
}

/** Six semantic axes the toy embeddings span (one component each).
 * 0: auth, 1: billing, 2: api, 3: pricing, 4: docs, 5: general. */
export const CORPUS: Doc[] = [
  {
    id: 'auth-reset',
    title: 'Resetting your password',
    text: 'To reset your password, go to the login page and click "Forgot password." You will receive an email with a reset link valid for one hour.',
    embedding: [0.95, 0.05, 0.05, 0.05, 0.20, 0.05],
  },
  {
    id: 'auth-2fa',
    title: 'Enabling two-factor authentication',
    text: 'Two-factor authentication adds a second login step using an authenticator app. Enable it from the Security tab in your account settings.',
    embedding: [0.90, 0.05, 0.10, 0.05, 0.20, 0.05],
  },
  {
    id: 'auth-sso',
    title: 'Signing in with SSO',
    text: 'Enterprise accounts support single sign-on via SAML and OIDC. Your admin configures the identity provider; you sign in with your work email.',
    embedding: [0.85, 0.10, 0.15, 0.10, 0.25, 0.05],
  },
  {
    id: 'billing-invoice',
    title: 'Downloading invoices',
    text: 'Invoices for paid subscriptions appear in the Billing tab. Download a PDF for any month, or set up automatic email delivery.',
    embedding: [0.05, 0.95, 0.05, 0.50, 0.20, 0.05],
  },
  {
    id: 'billing-refund',
    title: 'Refund policy',
    text: 'Refunds are available within 14 days of purchase for unused subscription time. Contact support with your invoice number to request one.',
    embedding: [0.05, 0.90, 0.05, 0.45, 0.20, 0.05],
  },
  {
    id: 'api-keys',
    title: 'Creating API keys',
    text: 'Generate API keys from the Developer Settings page. Each key has a configurable scope and expiration date. Keys cannot be viewed after creation; store them securely.',
    embedding: [0.15, 0.05, 0.95, 0.10, 0.30, 0.05],
  },
  {
    id: 'api-rate',
    title: 'Rate limits',
    text: 'The free tier allows 60 API requests per minute; paid tiers raise this to 600 or 6,000 per minute. Rate-limit errors return HTTP 429 with a Retry-After header.',
    embedding: [0.10, 0.20, 0.85, 0.30, 0.25, 0.05],
  },
  {
    id: 'pricing-plans',
    title: 'Pricing plans',
    text: 'The Free plan includes basic features for personal use. Pro is $20/month for power users. Team is $40/seat/month for collaboration features.',
    embedding: [0.05, 0.60, 0.10, 0.95, 0.30, 0.05],
  },
  {
    id: 'docs-quickstart',
    title: 'Quickstart guide',
    text: 'Install the CLI with one command, run "init" to set up a project, and run "build" to see your first output. The full guide takes about 10 minutes.',
    embedding: [0.05, 0.05, 0.40, 0.05, 0.95, 0.05],
  },
  {
    id: 'docs-troubleshoot',
    title: 'Troubleshooting common errors',
    text: 'If the CLI fails to start, check Node.js version (18+ required) and re-install dependencies with "pnpm install". Logs are written to .tensordojo/logs.',
    embedding: [0.05, 0.05, 0.40, 0.05, 0.85, 0.05],
  },
];

export interface QueryPreset {
  id: string;
  text: string;
  embedding: number[];
}

export const QUERIES: QueryPreset[] = [
  {
    id: 'pw',
    text: 'How do I reset my password?',
    embedding: [0.95, 0.05, 0.05, 0.05, 0.25, 0.05],
  },
  {
    id: 'invoice',
    text: 'Where can I download last month\'s invoice?',
    embedding: [0.05, 0.95, 0.05, 0.30, 0.20, 0.05],
  },
  {
    id: 'rate',
    text: 'Why am I getting HTTP 429 errors?',
    embedding: [0.10, 0.15, 0.95, 0.20, 0.20, 0.05],
  },
  {
    id: 'pricing',
    text: 'What does the Pro plan cost?',
    embedding: [0.05, 0.55, 0.05, 0.95, 0.20, 0.05],
  },
  {
    id: 'install',
    text: 'How do I get started with the CLI?',
    embedding: [0.05, 0.05, 0.45, 0.05, 0.95, 0.05],
  },
  {
    id: 'weather',
    text: 'What is the weather today?',
    embedding: [0.05, 0.05, 0.05, 0.05, 0.05, 0.95],
  },
];

export function cosineSim(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error('cosineSim: vector length mismatch');
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const ai = a[i] as number;
    const bi = b[i] as number;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface Ranked {
  doc: Doc;
  score: number;
}

export function rankDocs(query: number[], corpus: readonly Doc[]): Ranked[] {
  return corpus
    .map((doc) => ({ doc, score: cosineSim(query, doc.embedding) }))
    .sort((a, b) => b.score - a.score);
}

export function topK(ranked: readonly Ranked[], k: number): Ranked[] {
  return ranked.slice(0, Math.max(0, Math.min(k, ranked.length)));
}
