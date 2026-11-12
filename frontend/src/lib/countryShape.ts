/**
 * Prepares a country's detailed shape for its map: keeps the parts around
 * the framed area (no Alaska on the United States' map), and makes a light
 * copy to tell which labels belong to the country.
 */
import type { MultiPolygon, Polygon, Position } from 'geojson'

import { type Bounds, boxOf, FULL_TURN_DEGREES, polygonsOf } from './geo.ts'

/** Parts of `shape` whose box meets `area`, or null if none. */
export function partsWithin(
  shape: Polygon | MultiPolygon,
  area: Bounds,
): MultiPolygon | null {
  const kept = polygonsOf(shape).filter(([outerRing]) =>
    meets(boxOf(outerRing), area),
  )
  return kept.length === 0 ? null : { type: 'MultiPolygon', coordinates: kept }
}

/**
 * Light copy of `shape`: each ring keeps the points straying more than
 * `toleranceDegrees` from a straight line (Douglas-Peucker, O(n log n) on
 * average). Rings left too small are dropped.
 */
export function simplifyShape(
  shape: MultiPolygon,
  toleranceDegrees: number,
): MultiPolygon {
  const polygons = shape.coordinates.flatMap((rings) => {
    const [outerRing, ...holes] = rings.map((ring) =>
      simplifyRing(ring, toleranceDegrees),
    )
    return isRing(outerRing) ? [[outerRing, ...holes.filter(isRing)]] : []
  })
  return { type: 'MultiPolygon', coordinates: polygons }
}

/**
 * Copy of `shape` with at most `maxPoints` points: the tolerance doubles
 * until it fits (Russia: 36,000 points down to 300). Never empty: a shape
 * that would vanish is kept as it was (Vatican).
 */
export function simplifyToBudget(
  shape: MultiPolygon,
  startTolerance: number,
  maxPoints: number,
): MultiPolygon {
  let tolerance = startTolerance
  let simplified = shape
  while (pointsOf(simplified) > maxPoints || tolerance === startTolerance) {
    const lighter = simplifyShape(simplified, tolerance)
    if (lighter.coordinates.length === 0) {
      return simplified
    }
    simplified = lighter
    tolerance *= 2
  }
  return simplified
}

function pointsOf(shape: MultiPolygon): number {
  return shape.coordinates.reduce(
    (sum, polygon) =>
      sum + polygon.reduce((ringSum, ring) => ringSum + ring.length, 0),
    0,
  )
}

// Also tried a turn east, for an area past 180° (Russia).
function meets(box: Bounds, area: Bounds): boolean {
  return [0, FULL_TURN_DEGREES].some(
    (shift) =>
      box[0] + shift <= area[2] &&
      box[2] + shift >= area[0] &&
      box[1] <= area[3] &&
      box[3] >= area[1],
  )
}

// A closed ring has at least 4 points: a triangle and its first again.
function isRing(ring: Position[] | undefined): ring is Position[] {
  return ring !== undefined && ring.length >= 4
}

function simplifyRing(ring: Position[], tolerance: number): Position[] {
  const keep = new Array<boolean>(ring.length).fill(false)
  keep[0] = true
  keep[ring.length - 1] = true
  const stack: [number, number][] = [[0, ring.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop() ?? [0, 0]
    let farthest = -1
    let farthestDistance = tolerance
    for (let index = first + 1; index < last; index++) {
      const distance = distanceToSegment(ring[index], ring[first], ring[last])
      if (distance > farthestDistance) {
        farthest = index
        farthestDistance = distance
      }
    }
    if (farthest !== -1) {
      keep[farthest] = true
      stack.push([first, farthest], [farthest, last])
    }
  }
  return ring.filter((_, index) => keep[index])
}

function distanceToSegment(
  [x, y]: Position,
  [x1, y1]: Position,
  [x2, y2]: Position,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy
  const share =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared),
        )
  return Math.hypot(x - (x1 + share * dx), y - (y1 + share * dy))
}
