import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export const alt = 'TensorDojo — learn how LLMs work by manipulating them';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG = 'rgb(251, 250, 248)';
const INK = 'rgb(26, 24, 21)';
const MUTED = 'rgb(74, 71, 66)';
const SUBTLE = 'rgb(111, 108, 104)';
const ACCENT = 'rgb(15, 118, 110)';

async function loadInter(weight: 400 | 600 | 700): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`;
  const css = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  }).then((r) => r.text());
  const match = css.match(/url\(([^)]+\.woff2?)\)/);
  if (!match) throw new Error('Inter font URL not found in CSS');
  const fontRes = await fetch(match[1]!);
  return fontRes.arrayBuffer();
}

export default async function Image() {
  const [regular, semibold, bold] = await Promise.all([
    loadInter(400),
    loadInter(600),
    loadInter(700),
  ]);

  const PAD = 56;
  const TICK = 28;
  const SW = 2;
  const inset = PAD / 2;
  const corner = {
    position: 'absolute' as const,
    width: TICK,
    height: TICK,
    display: 'flex',
    opacity: 0.55,
  };

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
        {/* Corner ticks — wrapped in an absolute container Satori can size. */}
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
              ...corner,
              top: inset,
              left: inset,
              borderTop: `${SW}px solid ${ACCENT}`,
              borderLeft: `${SW}px solid ${ACCENT}`,
            }}
          />
          <div
            style={{
              ...corner,
              top: inset,
              right: inset,
              borderTop: `${SW}px solid ${ACCENT}`,
              borderRight: `${SW}px solid ${ACCENT}`,
            }}
          />
          <div
            style={{
              ...corner,
              bottom: inset,
              left: inset,
              borderBottom: `${SW}px solid ${ACCENT}`,
              borderLeft: `${SW}px solid ${ACCENT}`,
            }}
          />
          <div
            style={{
              ...corner,
              bottom: inset,
              right: inset,
              borderBottom: `${SW}px solid ${ACCENT}`,
              borderRight: `${SW}px solid ${ACCENT}`,
            }}
          />
        </div>

        {/* Eyebrow */}
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
          <span>INTERACTIVE LLM CURRICULUM</span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            fontSize: 86,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: -2,
            marginBottom: 32,
            maxWidth: 1000,
          }}
        >
          Learn how LLMs work by manipulating them.
        </div>

        {/* Subhead */}
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
          58 lessons across 8 tracks. Every concept is a sim you can drag, with the math underneath you can read.
        </div>

        {/* Footer */}
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
