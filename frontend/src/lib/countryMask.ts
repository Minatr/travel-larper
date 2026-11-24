import type { MultiPolygon, Polygon, Position } from 'geojson'

import { type Bounds, polygonsOf } from './geo.ts'

/** The whole world as the flat map shows it (it stops near 85°). */
const WORLD_RING: Position[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
]

/**
 * The world with the country cut out, drawn over the map to dim the other countries. A country's own holes are enclaves
 * (Lesotho in South Africa): they are dimmed too, and so are the `leftOut` areas (territories left out of the map).
 */
export function outsideMask(country: Polygon | MultiPolygon, leftOut: Bounds[] = []): MultiPolygon {
  const polygons = polygonsOf(country)
  const outerRings = polygons.map(([outerRing]) => outerRing)
  const enclaves = polygons.flatMap(([, ...holes]) => holes.map((hole) => [hole]))
  return {
    type: 'MultiPolygon',
    coordinates: [[WORLD_RING, ...outerRings], ...enclaves, ...leftOut.map((area) => [boxRing(area)])],
  }
}

function boxRing([west, south, east, north]: Bounds): Position[] {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]
}
