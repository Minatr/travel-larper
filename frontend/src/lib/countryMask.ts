import type { MultiPolygon, Polygon, Position } from 'geojson'

import { polygonsOf } from './geo.ts'

/** The whole world as the flat map shows it (it stops near 85°). */
const WORLD_RING: Position[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
]

/**
 * The world with the country cut out, drawn over the map to dim the other
 * countries. A country's own holes are enclaves (Lesotho in South Africa):
 * they are dimmed too.
 */
export function outsideMask(country: Polygon | MultiPolygon): MultiPolygon {
  const polygons = polygonsOf(country)
  const outerRings = polygons.map(([outerRing]) => outerRing)
  const enclaves = polygons.flatMap(([, ...holes]) =>
    holes.map((hole) => [hole]),
  )
  return {
    type: 'MultiPolygon',
    coordinates: [[WORLD_RING, ...outerRings], ...enclaves],
  }
}
