import type { Position } from 'geojson'
import { describe, expect, it } from 'vitest'

import { countryAnchor, facesViewer } from './countryAnchor.ts'

// Closed square ring of side `size` from its south-west corner.
function square(west: number, south: number, size: number): Position[] {
  return [
    [west, south],
    [west + size, south],
    [west + size, south + size],
    [west, south + size],
    [west, south],
  ]
}

describe('countryAnchor', () => {
  it('takes the centroid of a polygon', () => {
    expect(
      countryAnchor({ type: 'Polygon', coordinates: [square(0, 40, 10)] }),
    ).toEqual([5, 45])
  })

  it('hangs from the largest polygon, not from the overseas ones', () => {
    const anchor = countryAnchor({
      type: 'MultiPolygon',
      coordinates: [[square(-60, 3, 2)], [square(-4, 42, 10)]],
    })

    expect(anchor).toEqual([1, 47])
  })
})

describe('facesViewer', () => {
  it.each([
    { name: 'the center itself', point: [10, 25], want: true },
    { name: 'a point 60° away', point: [70, 25], want: true },
    { name: 'a point on the far side', point: [-170, -25], want: false },
  ] as const)('$name', ({ point, want }) => {
    expect(facesViewer([10, 25], [point[0], point[1]])).toBe(want)
  })
})
