import type { MultiPolygon, Position } from 'geojson'
import { describe, expect, it } from 'vitest'

import { partsWithin, simplifyShape, simplifyToBudget } from './countryShape.ts'

function square(west: number, south: number, size: number): Position[] {
  return [
    [west, south],
    [west + size, south],
    [west + size, south + size],
    [west, south + size],
    [west, south],
  ]
}

describe('partsWithin', () => {
  const shape: MultiPolygon = {
    type: 'MultiPolygon',
    coordinates: [
      [square(-100, 30, 20)], // mainland
      [square(-160, 60, 10)], // far away
      [square(170, 50, 5)], // across the antimeridian
    ],
  }

  it.each([
    {
      name: 'keeps the parts meeting the area',
      area: [-110, 25, -75, 55] as const,
      want: [[square(-100, 30, 20)]],
    },
    {
      name: 'finds a part across the antimeridian',
      area: [165, 45, 200, 70] as const,
      want: [[square(-160, 60, 10)], [square(170, 50, 5)]],
    },
  ])('$name', ({ area, want }) => {
    expect(partsWithin(shape, [...area])?.coordinates).toEqual(want)
  })

  it('returns null when no part meets the area', () => {
    expect(partsWithin(shape, [0, 0, 10, 10])).toBeNull()
  })
})

describe('simplifyShape', () => {
  it('drops the points close to a straight line', () => {
    const ring: Position[] = [
      [0, 0],
      [5, 0.001],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ]
    const shape: MultiPolygon = { type: 'MultiPolygon', coordinates: [[ring]] }

    expect(simplifyShape(shape, 0.01).coordinates).toEqual([
      [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    ])
  })

  it('drops a ring too small to keep', () => {
    const tiny: Position[] = [
      [0, 0],
      [0.001, 0],
      [0.001, 0.001],
      [0, 0],
    ]
    const shape: MultiPolygon = { type: 'MultiPolygon', coordinates: [[tiny]] }

    expect(simplifyShape(shape, 0.01).coordinates).toEqual([])
  })
})

describe('simplifyToBudget', () => {
  it('raises the tolerance until the shape fits the budget', () => {
    // A circle of 360 points: only a coarse tolerance brings it under 20.
    const circle: Position[] = Array.from({ length: 361 }, (_, index) => {
      const angle = (index * Math.PI) / 180
      return [Math.cos(angle), Math.sin(angle)]
    })
    const shape: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [[circle]],
    }

    const simplified = simplifyToBudget(shape, 0.0001, 20)

    const points = simplified.coordinates[0][0].length
    expect(points).toBeLessThanOrEqual(20)
    expect(points).toBeGreaterThanOrEqual(4)
  })

  it('keeps a shape the tolerance would make vanish', () => {
    const tiny: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [[square(0, 0, 0.001)]],
    }

    expect(simplifyToBudget(tiny, 0.005, 300)).toEqual(tiny)
  })
})
