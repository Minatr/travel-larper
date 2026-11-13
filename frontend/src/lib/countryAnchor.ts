import type { MultiPolygon, Polygon, Position } from 'geojson'

import { boxOf, polygonsOf } from './geo.ts'

/** A longitude and a latitude, in degrees. */
export type LngLat = [number, number]

/**
 * Point the hover tag hangs from: the centroid of the largest polygon
 * (France: the mainland, not its overseas territories).
 */
export function countryAnchor(shape: Polygon | MultiPolygon): LngLat {
  let best: { area: number; center: LngLat } | null = null
  for (const [outer] of polygonsOf(shape)) {
    const candidate = ringCentroid(outer)
    if (best === null || candidate.area > best.area) {
      best = candidate
    }
  }
  if (best === null) {
    throw new Error('country shape without any polygon')
  }
  return best.center
}

// Shoelace formula; a flat ring falls back to the center of its box.
function ringCentroid(ring: Position[]): { area: number; center: LngLat } {
  let twiceArea = 0
  let x = 0
  let y = 0
  for (let index = 0; index < ring.length - 1; index++) {
    const [x0, y0] = ring[index]
    const [x1, y1] = ring[index + 1]
    const cross = x0 * y1 - x1 * y0
    twiceArea += cross
    x += (x0 + x1) * cross
    y += (y0 + y1) * cross
  }
  if (twiceArea === 0) {
    const [west, south, east, north] = boxOf(ring)
    return { area: 0, center: [(west + east) / 2, (south + north) / 2] }
  }
  return {
    area: Math.abs(twiceArea) / 2,
    center: [x / (3 * twiceArea), y / (3 * twiceArea)],
  }
}

/** Past this angle from the globe's center, a point is too close to the horizon. */
const FACING_MAX_DEGREES = 70

const DEGREES_TO_RADIANS = Math.PI / 180

function toRadians(degrees: number): number {
  return degrees * DEGREES_TO_RADIANS
}

/** Whether `point` is on the visible side of a globe centered on `center`. */
export function facesViewer(center: LngLat, point: LngLat): boolean {
  const [lng0, lat0] = [center[0], center[1]].map(toRadians)
  const [lng1, lat1] = [point[0], point[1]].map(toRadians)
  const cosine =
    Math.sin(lat0) * Math.sin(lat1) +
    Math.cos(lat0) * Math.cos(lat1) * Math.cos(lng1 - lng0)
  return cosine >= Math.cos(FACING_MAX_DEGREES * DEGREES_TO_RADIANS)
}
