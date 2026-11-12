import { describe, expect, it } from 'vitest'

import { mercatorCamera, mercatorView } from './mercatorCamera.ts'

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

const EPSILON = 1e-6

describe('mercatorView', () => {
  it('shows the framed bounds plus the padding', () => {
    const camera = mercatorCamera([-5, 41, 10, 51], 1000, 800, 0)

    const [west, south, east, north] = mercatorView(camera, 1000, 800)

    // The view holds the bounds, edge to edge in one direction.
    expect(west).toBeLessThanOrEqual(-5 + EPSILON)
    expect(east).toBeGreaterThanOrEqual(10 - EPSILON)
    expect(south).toBeLessThanOrEqual(41 + EPSILON)
    expect(north).toBeGreaterThanOrEqual(51 - EPSILON)
    const fitsWidth =
      Math.abs(west + 5) < EPSILON && Math.abs(east - 10) < EPSILON
    const fitsHeight =
      Math.abs(south - 41) < EPSILON && Math.abs(north - 51) < EPSILON
    expect(fitsWidth || fitsHeight).toBe(true)
  })
})
