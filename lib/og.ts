/**
 * Shared helpers for the Satori OG-image routes. Palette mirrors the
 * Instrument Panel dark tokens from app/globals.css (raster images
 * can't read CSS variables, so literals it is).
 */
export const OG = {
  BG: 'rgb(7, 11, 16)', // #070B10 canvas
  PANEL: 'rgb(16, 22, 28)', // #10161C panel
  INK: 'rgb(220, 231, 238)', // #DCE7EE
  MUTED: 'rgb(140, 163, 176)', // #8CA3B0
  SUBTLE: 'rgb(110, 132, 146)', // #6E8492
  ACCENT: 'rgb(94, 196, 212)', // #5EC4D4 scope cyan
  BORDER: 'rgb(48, 64, 78)', // #30404E hairline
} as const;

/**
 * Fetch a Google Font as an ArrayBuffer for Satori. The CSS API is
 * queried with a browser User-Agent so it returns woff2 URLs.
 */
export async function loadGoogleFont(
  family: string,
  weight: number,
): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    },
  ).then((r) => r.text());
  const match = css.match(/url\(([^)]+\.woff2?)\)/);
  if (!match) throw new Error(`font URL not found for ${family} ${weight}`);
  return fetch(match[1]!).then((r) => r.arrayBuffer());
}
