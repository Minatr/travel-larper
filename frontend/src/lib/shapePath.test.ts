import type { MultiPolygon, Position } from 'geojson'
import { describe, expect, it } from 'vitest'

import { thumbnailPath } from './shapePath.ts'

function square(west: number, south: number, size: number): Position[][] {
  return [
    [
      [west, south],
      [west + size, south],
      [west + size, south + size],
      [west, south + size],
      [west, south],
    ],
  ]
}

// Every x, y pair of a path.
function pointsOf(path: string): number[][] {
  return [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)])
}

describe('thumbnailPath', () => {
  it('fits the shape in the box, centered, clear of its edges', () => {
    const shape: MultiPolygon = { type: 'MultiPolygon', coordinates: [square(0, 0, 10)] }

    const points = pointsOf(thumbnailPath(shape, [0, 0, 10, 10], 64, 48))

    expect(points.every(([x, y]) => x > 0 && x < 64 && y > 0 && y < 48)).toBe(true)
    const top = Math.min(...points.map(([, y]) => y))
    const bottom = Math.max(...points.map(([, y]) => y))
    expect(top).toBeGreaterThan(2)
    expect(top + bottom).toBeCloseTo(48)
  })

  it('keeps a shape across 180° in one piece (Aleutians)', () => {
    const shape: MultiPolygon = { type: 'MultiPolygon', coordinates: [square(178, 51, 1), square(-179, 51, 1)] }

    const points = pointsOf(thumbnailPath(shape, [178, 51, 182, 52], 64, 48))

    expect(points.every(([x]) => x >= 0 && x <= 64)).toBe(true)
  })
})
