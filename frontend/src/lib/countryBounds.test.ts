import type { MultiPolygon, Polygon, Position } from 'geojson'
import { describe, expect, it } from 'vitest'

import { type Bounds, countryBounds } from './countryBounds.ts'

// Closed rectangular ring from west, south, east, north.
function box([west, south, east, north]: Bounds): Position[] {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]
}

function multi(...boxes: Bounds[]): MultiPolygon {
  return { type: 'MultiPolygon', coordinates: boxes.map((b) => [box(b)]) }
}

describe('countryBounds', () => {
  const cases: {
    name: string
    geometry: Polygon | MultiPolygon
    want: Bounds
  }[] = [
    {
      name: 'a single polygon',
      geometry: { type: 'Polygon', coordinates: [box([2, 49, 6, 51])] },
      want: [2, 49, 6, 51],
    },
    {
      name: 'nearby island kept, distant territory left out (France)',
      geometry: multi(
        [-5, 42, 8, 51], // mainland
        [8.5, 41.3, 9.6, 43], // Corsica
        [-54, 2, -51, 6], // French Guiana
      ),
      want: [-5, 41.3, 9.6, 51],
    },
    {
      name: 'the largest group wins, even listed last',
      geometry: multi([-160, 19, -155, 22], [-125, 25, -67, 49]),
      want: [-125, 25, -67, 49],
    },
    {
      name: 'a country across the antimeridian stays in one piece',
      geometry: multi([150, 60, 180, 70], [-180, 62, -170, 68]),
      want: [150, 60, 190, 70],
    },
    {
      name: 'a microstate in its surroundings (Vatican)',
      geometry: {
        type: 'Polygon',
        coordinates: [box([-0.005, -0.005, 0.005, 0.005])],
      },
      want: [-0.1, -0.1, 0.1, 0.1],
    },
  ]

  it.each(cases)('frames $name', ({ geometry, want }) => {
    expect(countryBounds(geometry)).toEqual(want)
  })
})
