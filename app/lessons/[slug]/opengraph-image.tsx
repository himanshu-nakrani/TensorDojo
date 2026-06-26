import { ImageResponse } from 'next/og';
import { getLessonMeta } from '@/lib/lesson-manifest';
import { listSlugs } from '@/lib/lessons';
import { trackForSlug } from '@/lib/lessons-meta';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = false;

export const alt = 'TensorDojo lesson preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

// Brand tokens, kept in literal form so Satori can use them.
// (These mirror app/globals.css light-mode tokens.)
const BG = 'rgb(251, 250, 248)';
const BG_PANEL = 'rgb(255, 255, 255)';
const INK = 'rgb(26, 24, 21)';
const MUTED = 'rgb(74, 71, 66)';
const SUBTLE = 'rgb(111, 108, 104)';
const ACCENT = 'rgb(21, 128, 61)';
const BORDER = 'rgb(207, 201, 191)';

async function loadInter(weight: 400 | 600 | 700): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`;
  const css = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  }).then((r) => r.text());
  // Google may return woff or woff2, single or double quotes.
  // Match the first url(...) in any @font-face block.
  const match = css.match(/url\(([^)]+\.woff2?)\)/);
  if (!match) throw new Error('Inter font URL not found in CSS');
  const fontRes = await fetch(match[1]!);
  return fontRes.arrayBuffer();
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: PageProps) {
  const { slug } = await params;
  const meta = getLessonMeta(slug);
  const track = trackForSlug(slug);

  if (!meta) {
    return new ImageResponse(<div style={{ background: BG }} />, { ...size });
  }

  const [regular, semibold, bold] = await Promise.all([
    loadInter(400),
    loadInter(600),
    loadInter(700),
  ]);

  const trackLabel = (track?.label ?? 'lesson').toUpperCase();
  const PAD = 56;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: BG,
          fontFamily: 'Inter',
          color: INK,
          padding: PAD,
          position: 'relative',
        }}
      >
        {/* Corner ticks — registration marks, mirroring HeroInteractive */}
        <CornerTicks pad={PAD} />

        {/* Eyebrow: ◆ TRACK · LESSON */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            color: ACCENT,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 2,
            marginBottom: 36,
          }}
        >
          <span style={{ marginRight: 14 }}>◆</span>
          <span>{trackLabel}</span>
          <span style={{ color: SUBTLE, margin: '0 12px' }}>·</span>
          <span style={{ color: SUBTLE }}>{meta.minutes} MIN LESSON</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: meta.title.length > 60 ? 64 : 76,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            marginBottom: 32,
            maxWidth: 1000,
          }}
        >
          {meta.title}
        </div>

        {/* Summary — first ~180 chars, no abrupt cut */}
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1.45,
            color: MUTED,
            maxWidth: 1000,
          }}
        >
          {clipSummary(meta.summary, 200)}
        </div>

        {/* Footer wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            bottom: PAD,
            left: PAD,
            right: PAD,
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 3,
              color: INK,
            }}
          >
            <span style={{ color: ACCENT, marginRight: 10 }}>◆</span>
            <span>TENSORDOJO</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              color: SUBTLE,
              fontWeight: 400,
            }}
          >
            tensordojo.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: regular, weight: 400, style: 'normal' },
        { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
        { name: 'Inter', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );
}

function clipSummary(s: string, max: number): string {
  if (s.length <= max) return s;
  const sub = s.slice(0, max);
  const lastSpace = sub.lastIndexOf(' ');
  return (lastSpace > 0 ? sub.slice(0, lastSpace) : sub).trimEnd() + '…';
}

function CornerTicks({ pad }: { pad: number }) {
  const TICK = 28;
  const SW = 2;
  const inset = pad / 2;
  const common = {
    position: 'absolute' as const,
    width: TICK,
    height: TICK,
    display: 'flex',
    opacity: 0.55,
  };
  // Satori's positioning works most reliably when absolute children
  // live inside an explicitly-sized absolute container. The outer
  // div spans the full card and serves as the positioning root.
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 1200,
        height: 630,
        display: 'flex',
      }}
    >
      <div
        style={{
          ...common,
          top: inset,
          left: inset,
          borderTop: `${SW}px solid ${ACCENT}`,
          borderLeft: `${SW}px solid ${ACCENT}`,
        }}
      />
      <div
        style={{
          ...common,
          top: inset,
          right: inset,
          borderTop: `${SW}px solid ${ACCENT}`,
          borderRight: `${SW}px solid ${ACCENT}`,
        }}
      />
      <div
        style={{
          ...common,
          bottom: inset,
          left: inset,
          borderBottom: `${SW}px solid ${ACCENT}`,
          borderLeft: `${SW}px solid ${ACCENT}`,
        }}
      />
      <div
        style={{
          ...common,
          bottom: inset,
          right: inset,
          borderBottom: `${SW}px solid ${ACCENT}`,
          borderRight: `${SW}px solid ${ACCENT}`,
        }}
      />
    </div>
  );
}
