/**
 * Where the hover tag goes on screen, in canvas pixels. Its string points
 * away from the globe's center, so tags spread around the globe.
 */

/** A position on the map's canvas, in pixels. */
export type ScreenPoint = { x: number; y: number }

/** Which side of its eyelet the tag extends to. */
export type TagSide = 'left' | 'right'

/** Where to draw the tag and its string. */
export type TagLayout = {
  /** Point on the country the string starts from. */
  anchor: ScreenPoint
  /** Center of the tag's eyelet, where the string ends. */
  eyelet: ScreenPoint
  /** Side of its eyelet the tag extends to. */
  side: TagSide
  /** Tilt along the string, in degrees, clockwise. */
  tiltDegrees: number
}

/** A country's hover tag, and where it goes (useGlobe lays it out). */
export type CountryHint = {
  /** ISO code of the hovered country. */
  code: string
  /** Where the tag and its string go on the globe. */
  layout: TagLayout
  /** Country found by the search: its tag tells how to open it. */
  searched: boolean
}

/** Width of the tag, in pixels (CountryBubble draws it at this width). */
export const TAG_WIDTH_PX = 256

/** Eyelet center, from the tag's top corner on the eyelet side. */
export const EYELET_OFFSET_PX: ScreenPoint = { x: 21, y: 27 }

/** Length of the string, from the country to the eyelet. */
const STRING_LENGTH_PX = 72

/** Sag of the string at its middle. */
const STRING_SAG_PX = 10

/** Tilt of a tag whose string points straight up or down. */
const MAX_TILT_DEGREES = 8

/** Room kept free along the screen's edges. */
const EDGE_MARGIN_PX = 16

/** Room kept free at the top for the header's labels. */
const HEADER_CLEARANCE_PX = 72

/** Height of the tag below its eyelet, to keep it on screen. */
const TAG_BELOW_EYELET_PX = 96

/** Lays out the tag of the country at `anchor`; flips it if it leaves the screen. */
export function tagLayout(
  anchor: ScreenPoint,
  globeCenter: ScreenPoint,
  width: number,
  height: number,
): TagLayout {
  const away = direction(anchor, globeCenter)
  let side: TagSide = away.x >= 0 ? 'right' : 'left'
  let dx = away.x * STRING_LENGTH_PX
  const fitsRight = anchor.x + dx + TAG_WIDTH_PX <= width - EDGE_MARGIN_PX
  const fitsLeft = anchor.x + dx - TAG_WIDTH_PX >= EDGE_MARGIN_PX
  if ((side === 'right' && !fitsRight) || (side === 'left' && !fitsLeft)) {
    side = side === 'right' ? 'left' : 'right'
    dx = -dx
  }
  const eyelet = {
    x: anchor.x + dx,
    y: clamp(
      anchor.y + away.y * STRING_LENGTH_PX,
      HEADER_CLEARANCE_PX,
      height - TAG_BELOW_EYELET_PX,
    ),
  }
  const mirror = side === 'right' ? 1 : -1
  return {
    anchor,
    eyelet,
    side,
    tiltDegrees: mirror * away.y * MAX_TILT_DEGREES,
  }
}

/** SVG path of the string between its two ends. */
export function stringPath(from: ScreenPoint, to: ScreenPoint): string {
  const middleX = (from.x + to.x) / 2
  const middleY = (from.y + to.y) / 2 + STRING_SAG_PX
  return `M ${from.x} ${from.y} Q ${middleX} ${middleY} ${to.x} ${to.y}`
}

// Unit vector from the globe's center to the anchor; up and right at the center.
function direction(anchor: ScreenPoint, center: ScreenPoint): ScreenPoint {
  const x = anchor.x - center.x
  const y = anchor.y - center.y
  const length = Math.hypot(x, y)
  if (length < 1) {
    return { x: Math.SQRT1_2, y: -Math.SQRT1_2 }
  }
  return { x: x / length, y: y / length }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
