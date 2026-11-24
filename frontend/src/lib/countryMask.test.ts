import type { MultiPolygon, Position } from 'geojson'
import { describe, expect, it } from 'vitest'

import { outsideMask } from './countryMask.ts'

const mainland: Position[] = [
  [0, 45],
  [5, 45],
  [5, 50],
  [0, 45],
]
const island: Position[] = [
  [8, 41],
  [9, 41],
  [9, 43],
  [8, 41],
]
const enclave: Position[] = [
  [1, 46],
  [2, 46],
  [2, 47],
  [1, 46],
]

describe('outsideMask', () => {
  it('cuts the country out of the world and dims its enclaves', () => {
    const country: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [[mainland, enclave], [island]],
    }

    const [[world, ...cutOut], ...dimmed] = outsideMask(country).coordinates

    expect(world).toHaveLength(5)
    expect(cutOut).toEqual([mainland, island])
    expect(dimmed).toEqual([[enclave]])
  })

  it('dims the territories left out, which the borders still hold (Barrow Island)', () => {
    const [, ...dimmed] = outsideMask({ type: 'Polygon', coordinates: [mainland] }, [[3, 46, 4, 47]]).coordinates

    expect(dimmed).toEqual([
      [
        [
          [3, 46],
          [4, 46],
          [4, 47],
          [3, 47],
          [3, 46],
        ],
      ],
    ])
  })
})
