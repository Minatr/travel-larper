/** Shapes and angles shared by the country helpers. */
import type { MultiPolygon, Polygon, Position } from 'geojson'

/**
 * West, south, east and north edges, in degrees. East goes past 180 for a
 * country across the antimeridian (Russia: 27 to 190).
 */
export type Bounds = [number, number, number, number]

/** A full turn and a half turn, in degrees. */
export const FULL_TURN_DEGREES = 360
export const HALF_TURN_DEGREES = 180

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
