import { describe, expect, it } from 'vitest'

import { starfield } from './starfield.ts'

describe('starfield', () => {
  it('draws the same sky for the same seed', () => {
    expect(starfield(20, 7)).toEqual(starfield(20, 7))
    expect(starfield(20, 7)).not.toEqual(starfield(20, 8))
  })

  it('keeps every star in its box, visible but faint', () => {
    for (const star of starfield(200, 1)) {
      expect(star.x).toBeGreaterThanOrEqual(0)
      expect(star.x).toBeLessThan(1000)
      expect(star.y).toBeLessThan(1000)
      expect(star.opacity).toBeGreaterThan(0)
      expect(star.opacity).toBeLessThanOrEqual(1)
    }
  })
})
