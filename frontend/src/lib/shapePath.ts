import type { MultiPolygon } from 'geojson'

import { simplifyToBudget } from './countryShape.ts'
import { type Bounds, FULL_TURN_DEGREES, HALF_TURN_DEGREES } from './geo.ts'

/** Most points of a thumbnail: enough for a recognisable outline, light in the page (mainland France: 300). */
const MAX_THUMBNAIL_POINTS = 300

/** Starting tolerance, as a share of the framed area's diagonal: about half a pixel on a 72 px thumbnail. */
const THUMBNAIL_PRECISION_SHARE = 1 / 150

/** Room kept around the shape, as a share of the box: its outline never touches the edges. */
const THUMBNAIL_MARGIN_SHARE = 0.1

/**
 * SVG path of `shape` drawn inside a `width` × `height` box, `bounds` centered in it with a margin all round.
 * Longitudes are narrowed by the latitude's cosine, as on a map, so shapes keep their proportions.
 */
export function thumbnailPath(shape: MultiPolygon, bounds: Bounds, width: number, height: number): string {
  const [west, south, east, north] = bounds
  const light = simplifyToBudget(
    shape,
    Math.hypot(east - west, north - south) * THUMBNAIL_PRECISION_SHARE,
    MAX_THUMBNAIL_POINTS,
  )
  const narrowing = Math.cos((((south + north) / 2) * Math.PI) / HALF_TURN_DEGREES)
  const middle = (west + east) / 2
  const room = 1 - 2 * THUMBNAIL_MARGIN_SHARE
  const scale = Math.min((width * room) / ((east - west) * narrowing), (height * room) / (north - south))
  const offsetX = (width - (east - west) * narrowing * scale) / 2
  const offsetY = (height - (north - south) * scale) / 2
  const x = (longitude: number) => offsetX + (nearest(longitude, middle) - west) * narrowing * scale
  const y = (latitude: number) => offsetY + (north - latitude) * scale

  return light.coordinates
    .flatMap((polygon) => polygon)
    .map((ring) => `M${ring.map(([longitude, latitude]) => `${round(x(longitude))} ${round(y(latitude))}`).join('L')}Z`)
    .join('')
}

// The same longitude a turn away when that brings it nearer `middle` (Alaska's Aleutians, past 180°).
function nearest(longitude: number, middle: number): number {
  if (longitude - middle > HALF_TURN_DEGREES) {
    return longitude - FULL_TURN_DEGREES
  }
  return longitude - middle < -HALF_TURN_DEGREES ? longitude + FULL_TURN_DEGREES : longitude
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
