import { describe, expect, it } from 'vitest'

import { stringPath, TAG_WIDTH_PX, tagLayout } from './countryTag.ts'

const CENTER = { x: 500, y: 400 }
const WIDTH = 1000
const HEIGHT = 800

describe('tagLayout', () => {
  it('hangs the tag away from the globe, on the anchor side', () => {
    const right = tagLayout({ x: 600, y: 400 }, CENTER, WIDTH, HEIGHT)
    const left = tagLayout({ x: 400, y: 400 }, CENTER, WIDTH, HEIGHT)

    expect(right.side).toBe('right')
    expect(right.eyelet.x).toBeGreaterThan(600)
    expect(left.side).toBe('left')
    expect(left.eyelet.x).toBeLessThan(400)
  })

  it('flips to the other side rather than leave the screen', () => {
    const layout = tagLayout(
      { x: WIDTH - TAG_WIDTH_PX / 2, y: 400 },
      CENTER,
      WIDTH,
      HEIGHT,
    )

    expect(layout.side).toBe('left')
  })

  it('keeps the tag below the header', () => {
    const layout = tagLayout({ x: 500, y: 20 }, CENTER, WIDTH, HEIGHT)

    expect(layout.eyelet.y).toBeGreaterThanOrEqual(72)
  })

  it('tilts the tag along its string, mirrored on the left', () => {
    const lowRight = tagLayout({ x: 600, y: 500 }, CENTER, WIDTH, HEIGHT)
    const lowLeft = tagLayout({ x: 400, y: 500 }, CENTER, WIDTH, HEIGHT)

    expect(lowRight.tiltDegrees).toBeGreaterThan(0)
    expect(lowLeft.tiltDegrees).toBeLessThan(0)
  })
})

describe('stringPath', () => {
  it('sags between its two ends', () => {
    expect(stringPath({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(
      'M 0 0 Q 50 10 100 0',
    )
  })
})
