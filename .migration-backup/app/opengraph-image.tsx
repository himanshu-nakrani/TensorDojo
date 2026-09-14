import { ImageResponse } from 'next/og';
import { OG, loadGoogleFont } from '@/lib/og';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export const alt = 'TensorDojo — learn how LLMs work by manipulating them';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const [groteskRegular, groteskBold, monoSemibold] = await Promise.all([
    loadGoogleFont('Space+Grotesk', 400),
    loadGoogleFont('Space+Grotesk', 700),
    loadGoogleFont('JetBrains+Mono', 600),
  ]);

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

        {/* Spec row: LED + label, unit id on the right */}
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
            <span>INTERACTIVE LLM CURRICULUM</span>
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
            58 LESSONS / 8 TRACKS
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            marginBottom: 30,
            maxWidth: 1020,
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
            color: OG.MUTED,
            maxWidth: 980,
          }}
        >
          Every concept is a sim you can drag, with the math underneath
          you can read.
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
            tensordojo.vercel.app
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
