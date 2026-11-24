/** Shapes and angles shared by the country helpers. */
import type { MultiPolygon, Polygon, Position } from 'geojson'

/**
 * West, south, east and north edges, in degrees. East goes past 180 for a country across the antimeridian (Russia: 27
 * to 190).
 */
export type Bounds = [number, number, number, number]

/** A full turn and a half turn, in degrees. */
export const FULL_TURN_DEGREES = 360
export const HALF_TURN_DEGREES = 180

/** Mean radius of the Earth. */
const EARTH_RADIUS_KM = 6371

/** Distance as the crow flies between two [longitude, latitude] points (haversine formula). */
export function distanceKm([longitude1, latitude1]: Position, [longitude2, latitude2]: Position): number {
  const radians = (degrees: number) => (degrees * Math.PI) / HALF_TURN_DEGREES
  const halfChord =
    Math.sin(radians(latitude2 - latitude1) / 2) ** 2 +
    Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(radians(longitude2 - longitude1) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(halfChord))
}

/** The polygons of a shape: one for a Polygon, each of a MultiPolygon. */
export function polygonsOf(shape: Polygon | MultiPolygon): Position[][][] {
  return shape.type === 'Polygon' ? [shape.coordinates] : shape.coordinates
}

/** Smallest box holding every point of `ring`. */
export function boxOf(ring: Position[]): Bounds {
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [longitude, latitude] of ring) {
    west = Math.min(west, longitude)
    east = Math.max(east, longitude)
    south = Math.min(south, latitude)
    north = Math.max(north, latitude)
  }
  return [west, south, east, north]
}
