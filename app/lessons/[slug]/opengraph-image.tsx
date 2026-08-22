import { ImageResponse } from 'next/og';
import { getLessonMeta } from '@/lib/lesson-manifest';
import { listSlugs } from '@/lib/lessons';
import { getTrackContext } from '@/lib/lessons-meta';
import { OG, loadGoogleFont } from '@/lib/og';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = false;

export const alt = 'TensorDojo lesson preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: PageProps) {
  const { slug } = await params;
  const meta = getLessonMeta(slug);
  const track = getTrackContext(slug);

  if (!meta) {
    return new ImageResponse(
      <div style={{ background: OG.BG }} />,
      { ...size },
    );
  }

  const [groteskRegular, groteskBold, monoSemibold] = await Promise.all([
    loadGoogleFont('Space+Grotesk', 400),
    loadGoogleFont('Space+Grotesk', 700),
    loadGoogleFont('JetBrains+Mono', 600),
  ]);

  const trackLabel = (track?.trackLabel ?? 'lesson').toUpperCase();
  const unitId = track
    ? `T${String(track.trackNumber).padStart(2, '0')} · ${String(
        track.lessonNumber,
      ).padStart(2, '0')}/${String(track.trackTotal).padStart(2, '0')}`
    : 'LESSON';
  const PAD = 56;
  const FRAME = 32;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: OG.BG,
          fontFamily: 'Space Grotesk',
          color: OG.INK,
          padding: PAD,
          position: 'relative',
        }}
      >
        {/* Hairline instrument frame */}
        <div
          style={{
            position: 'absolute',
            top: FRAME,
            left: FRAME,
            right: FRAME,
            bottom: FRAME,
            width: 1200 - FRAME * 2,
            height: 630 - FRAME * 2,
            display: 'flex',
            border: `1px solid ${OG.BORDER}`,
            borderRadius: 8,
          }}
        />

        {/* Spec row: LED + track label, unit id on the right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 18,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontFamily: 'JetBrains Mono',
              color: OG.ACCENT,
              fontSize: 21,
              fontWeight: 600,
              letterSpacing: 3,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: OG.ACCENT,
                marginRight: 16,
              }}
            />
            <span>{trackLabel}</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'JetBrains Mono',
              color: OG.SUBTLE,
              fontSize: 19,
              letterSpacing: 2,
            }}
          >
            {unitId}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: meta.title.length > 60 ? 62 : 74,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            marginBottom: 28,
            maxWidth: 1020,
          }}
        >
          {meta.title}
        </div>

        {/* Summary */}
        <div
          style={{
            display: 'flex',
            fontSize: 25,
            fontWeight: 400,
            lineHeight: 1.45,
            color: OG.MUTED,
            maxWidth: 980,
          }}
        >
          {clipSummary(meta.summary, 200)}
        </div>

        {/* Status bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            bottom: PAD + 14,
            left: PAD + 14,
            right: PAD + 14,
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontFamily: 'JetBrains Mono',
              fontWeight: 600,
              fontSize: 21,
              letterSpacing: 3,
              color: OG.INK,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: OG.ACCENT,
                marginRight: 12,
              }}
            />
            <span>TENSOR DOJO</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'JetBrains Mono',
              fontSize: 17,
              color: OG.SUBTLE,
            }}
          >
            {meta.minutes} MIN · tensordojo.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Space Grotesk', data: groteskRegular, weight: 400, style: 'normal' },
        { name: 'Space Grotesk', data: groteskBold, weight: 700, style: 'normal' },
        { name: 'JetBrains Mono', data: monoSemibold, weight: 600, style: 'normal' },
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
