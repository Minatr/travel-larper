import { describe, expect, it } from 'vitest'

import { SKY_SIZE, skyOffset, starfield } from './starfield.ts'

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

  it('moves the sky with the globe, one tile per full turn', () => {
    const still = skyOffset([0, 0])
    expect(still.x).toBeCloseTo(0)
    expect(still.y).toBeCloseTo(0)
    // Dragging the globe east shows lands further west: the sky follows.
    expect(skyOffset([-90, 0]).x).toBe(SKY_SIZE / 4)
    expect(skyOffset([0, 45]).y).toBe(SKY_SIZE / 8)
    expect(skyOffset([180, 0]).x - skyOffset([-180, 0]).x).toBe(-SKY_SIZE)
  })
})
