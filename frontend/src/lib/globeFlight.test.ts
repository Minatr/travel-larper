import { describe, expect, it } from 'vitest'

import { apparentZoom, zoomForApparent } from './globeFlight.ts'

describe('apparentZoom', () => {
  it('keeps the zoom at the equator', () => {
    expect(apparentZoom(2, 0)).toBe(2)
  })

  it('adds a level at 60°, where the globe is drawn twice as large', () => {
    expect(apparentZoom(2, 60)).toBeCloseTo(3)
    expect(apparentZoom(2, -60)).toBeCloseTo(3)
  })

  it('is undone by zoomForApparent', () => {
    expect(zoomForApparent(apparentZoom(1.8, 69.6), 69.6)).toBeCloseTo(1.8)
  })
})
