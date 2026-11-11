import { describe, expect, it } from 'vitest'

import { mercatorCamera } from './mercatorCamera.ts'

describe('mercatorCamera', () => {
  it('frames the whole width of the world at zoom 0 in 512 pixels', () => {
    const camera = mercatorCamera([-180, -60, 180, 60], 512, 10_000, 0)

    expect(camera.zoom).toBeCloseTo(0)
    expect(camera.center[0]).toBeCloseTo(0)
    expect(camera.center[1]).toBeCloseTo(0)
  })

  it('doubles the zoom level for half the width', () => {
    const camera = mercatorCamera([0, -10, 180, 10], 512, 10_000, 0)

    expect(camera.zoom).toBeCloseTo(1)
    expect(camera.center[0]).toBeCloseTo(90)
  })

  it('centers on the middle as drawn, north of the middle latitude', () => {
    // The flat map stretches the north: halfway down the drawing lies north
    // of 50°, the average of 20° and 80°.
    const camera = mercatorCamera([0, 20, 10, 80], 1000, 1000, 0)

    expect(camera.center[1]).toBeGreaterThan(50)
  })

  it('wraps the center of a country across the antimeridian', () => {
    const camera = mercatorCamera([170, 50, 200, 70], 1000, 1000, 0)

    expect(camera.center[0]).toBeCloseTo(-175)
  })
})
