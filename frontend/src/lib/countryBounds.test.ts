import type { MultiPolygon, Polygon, Position } from 'geojson'
import { describe, expect, it } from 'vitest'

import { countryBounds, countryFrame } from './countryBounds.ts'
import type { Bounds } from './geo.ts'
import { findInset } from './territories.ts'

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

describe('countryFrame', () => {
  const france = multi([-5, 42, 8, 51], [-54, 2, -51, 6])

  it('frames a country with distant parts on its decided frame, without them', () => {
    const [west, , east] = countryFrame('FR', france)
    expect(west).toBeGreaterThan(-6)
    expect(east).toBeLessThan(10)
  })

  it('frames an inset on its own', () => {
    const guiana = findInset('FR', 'french-guiana')
    const [west, , east] = countryFrame('FR', france, guiana)
    expect(west).toBeLessThan(-54)
    expect(east).toBeGreaterThan(-52)
  })

  it('shows a tiny inset in its surroundings (San Andrés)', () => {
    const [west, south, east, north] = countryFrame('CO', multi([-79, -4, -67, 12]), findInset('CO', 'san-andres'))
    // 0.5° minus floating-point dust.
    expect(east - west).toBeGreaterThan(0.499)
    expect(north - south).toBeGreaterThan(0.499)
  })

  it('frames a microstate close up, its shape being precise (Vatican)', () => {
    const [west, south, east, north] = countryFrame('VA', multi([12.4457, 41.9002, 12.4584, 41.9074]))
    // 0.02° minus floating-point dust: the Vatican with St. Peter's Square, not 20 km around.
    expect(east - west).toBeGreaterThan(0.0199)
    expect(east - west).toBeLessThan(0.021)
    expect(north - south).toBeLessThan(0.021)
  })

  it('keeps a tiny country that is not a microstate in its surroundings (Nauru)', () => {
    const [west, , east] = countryFrame('NR', multi([166.907, -0.551, 166.958, -0.489]))
    expect(east - west).toBeGreaterThan(0.199)
  })

  it('keeps the grouping rule for a country without distant parts', () => {
    expect(countryFrame('DE', multi([6, 47, 15, 55]))).toEqual([6, 47, 15, 55])
  })
})
