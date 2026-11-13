/** Width of a capital in tag titles, in em; rounded up so no word splits. */
const CAPITAL_WIDTH_EM = 0.6

/**
 * Font size at which the longest word fits on one line, capped at `maxPx`
 * ("République centrafricaine" shrinks until "centrafricaine" fits).
 */
export function fittedTitleSize(
  title: string,
  availablePx: number,
  maxPx: number,
): number {
  const longestWord = Math.max(
    ...title.split(/[\s-]+/).map((word) => word.length),
  )
  if (longestWord === 0) {
    return maxPx
  }
  return Math.min(maxPx, availablePx / (longestWord * CAPITAL_WIDTH_EM))
}
