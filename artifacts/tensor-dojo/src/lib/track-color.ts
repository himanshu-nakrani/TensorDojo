/**
 * One hue per track, in TRACKS order, from the themed --track-N
 * tokens so every surface that colour-codes tracks (concept map,
 * lesson directory) matches whichever face of the instrument
 * (manual / bench) is showing.
 */
export function trackColor(idx: number): string {
  return `rgb(var(--track-${(idx % 10) + 1}))`;
}
