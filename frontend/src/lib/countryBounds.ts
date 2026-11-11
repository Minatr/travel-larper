/**
 * Area to frame for a country: its main land and the land near it, not its
 * distant territories (France with Corsica, without French Guiana).
 * Parts less than GROUP_DISTANCE_KM apart are grouped (union-find), and the
 * largest group wins: O(n²) over a country's parts, a few dozen at most.
 */
import type { MultiPolygon, Polygon, Position } from 'geojson'

/**
 * West, south, east and north edges, in degrees. East goes past 180 for a
 * country across the antimeridian (Russia: 27 to 190).
 */
export type Bounds = [number, number, number, number]

/**
 * Gap under which two parts belong together: Borneo (600 km) stays with
 * Malaysia, Alaska (670 km) leaves the United States.
 */
const GROUP_DISTANCE_KM = 650
const KM_PER_DEGREE = 111.32
/**
 * Smallest area framed, in degrees (about 20 km): a microstate (Vatican) is
 * shown in its surroundings, not at a street's zoom.
 */
const MIN_FRAME_DEGREES = 0.2
const FULL_TURN_DEGREES = 360
const HALF_TURN_DEGREES = 180

type Part = { bounds: Bounds; area: number }

/** Bounds to frame for a country shape. */
export function countryBounds(geometry: Polygon | MultiPolygon): Bounds {
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  // Holes never widen bounds: only outer rings count.
  const parts = polygons.map(([outerRing]) => describe(outerRing))
  const main = largestGroup(parts)
  const reference = center(main[0].bounds)
  const bounds = main
    .map((part) => shiftNear(part.bounds, reference))
    .reduce(union)
  return atLeastMinFrame(bounds)
}

function atLeastMinFrame([west, south, east, north]: Bounds): Bounds {
  const extraX = Math.max(0, MIN_FRAME_DEGREES - (east - west)) / 2
  const extraY = Math.max(0, MIN_FRAME_DEGREES - (north - south)) / 2
  return [west - extraX, south - extraY, east + extraX, north + extraY]
}

function describe(ring: Position[]): Part {
  const longitudes = ring.map(([longitude]) => longitude)
  const latitudes = ring.map(([, latitude]) => latitude)
  const bounds: Bounds = [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ]
  return { bounds, area: ringArea(ring) }
}

// Shoelace formula, longitudes scaled by the latitude's cosine: only used
// to compare parts, so the unit does not matter.
function ringArea(ring: Position[]): number {
  let doubled = 0
  for (let index = 1; index < ring.length; index++) {
    const [x1, y1] = ring[index - 1]
    const [x2, y2] = ring[index]
    doubled += (x2 - x1) * (y2 + y1)
  }
  const latitude = ring.reduce((sum, [, y]) => sum + y, 0) / ring.length
  return (Math.abs(doubled) / 2) * Math.cos(toRadians(latitude))
}

// Parts of the group of largest area, largest part first.
function largestGroup(parts: Part[]): Part[] {
  const leader = parts.map((_, index) => index)
  const find = (index: number): number => {
    while (leader[index] !== index) {
      index = leader[index]
    }
    return index
  }
  parts.forEach((first, i) => {
    parts.slice(i + 1).forEach((second, offset) => {
      if (distanceKm(first.bounds, second.bounds) < GROUP_DISTANCE_KM) {
        leader[find(i + 1 + offset)] = find(i)
      }
    })
  })

  const groups = new Map<number, Part[]>()
  parts.forEach((part, index) => {
    const group = groups.get(find(index)) ?? []
    group.push(part)
    groups.set(find(index), group)
  })
  const totalArea = (group: Part[]) =>
    group.reduce((sum, part) => sum + part.area, 0)
  const largest = [...groups.values()].reduce((best, group) =>
    totalArea(group) > totalArea(best) ? group : best,
  )
  return [...largest].sort((a, b) => b.area - a.area)
}

// Gap between two boxes, 0 when they overlap, measured the short way
// round the antimeridian.
function distanceKm(first: Bounds, second: Bounds): number {
  const [west1, south1, east1, north1] = first
  const [west2, south2, east2, north2] = shiftNear(second, center(first))
  const longitudeGap = Math.max(0, west2 - east1, west1 - east2)
  const latitudeGap = Math.max(0, south2 - north1, south1 - north2)
  const latitude = (south1 + north1 + south2 + north2) / 4
  return (
    Math.hypot(longitudeGap * Math.cos(toRadians(latitude)), latitudeGap) *
    KM_PER_DEGREE
  )
}

// Moves bounds a full turn when that brings them nearer `longitude`.
function shiftNear(bounds: Bounds, longitude: number): Bounds {
  const offset = center(bounds) - longitude
  const shift =
    offset > HALF_TURN_DEGREES
      ? -FULL_TURN_DEGREES
      : offset < -HALF_TURN_DEGREES
        ? FULL_TURN_DEGREES
        : 0
  const [west, south, east, north] = bounds
  return [west + shift, south, east + shift, north]
}

function center([west, , east]: Bounds): number {
  return (west + east) / 2
}

function union(first: Bounds, second: Bounds): Bounds {
  return [
    Math.min(first[0], second[0]),
    Math.min(first[1], second[1]),
    Math.max(first[2], second[2]),
    Math.max(first[3], second[3]),
  ]
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / HALF_TURN_DEGREES
}
