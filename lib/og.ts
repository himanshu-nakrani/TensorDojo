/**
 * Shared helpers for the Satori OG-image routes. Palette mirrors the
 * Instrument Panel dark tokens from app/globals.css (raster images
 * can't read CSS variables, so literals it is).
 */
export const OG = {
  BG: 'rgb(11, 14, 19)', // #0B0E13 canvas
  PANEL: 'rgb(18, 22, 29)', // #12161D panel
  INK: 'rgb(223, 230, 239)', // #DFE6EF
  MUTED: 'rgb(151, 163, 178)', // #97A3B2
  SUBTLE: 'rgb(116, 128, 143)', // #74808F
  ACCENT: 'rgb(61, 214, 140)', // #3DD68C signal green
  BORDER: 'rgb(57, 67, 79)', // #39434F hairline
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
