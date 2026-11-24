import { describe, expect, it } from 'vitest'

import { apparentZoom, returnZoom, zoomForApparent } from './globeFlight.ts'

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

describe('returnZoom', () => {
  const wholeGlobe = 2
  // The globe zoomed in on the map, as when the page shows: it backs away by more than the minimum anyway.
  const farIn = 20

  it.each([
    ['a large country (Canada) a little', 3.2, 0.8],
    ['a medium country (France) two levels', 5, 2],
    ['a small country (Belgium) more', 7, 3.6],
    ['a tiny country (Monaco) the most', 13.7, 6],
  ])('zooms %s out', (_, frame, zoomOut) => {
    expect(frame - returnZoom(frame, wholeGlobe, farIn)).toBeCloseTo(zoomOut, 1)
  })

  it('zooms out more for a smaller country', () => {
    const frames = [3, 4, 6, 8, 10, 12]
    const zoomOuts = frames.map((frame) => frame - returnZoom(frame, wholeGlobe, farIn))
    expect(zoomOuts).toEqual([...zoomOuts].sort((a, b) => a - b))
  })

  it('never leaves a smaller country further out than a larger one', () => {
    const frames = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14]
    const zooms = frames.map((frame) => returnZoom(frame, wholeGlobe, farIn))
    expect(zooms).toEqual([...zooms].sort((a, b) => a - b))
  })

  it('never goes further out than the whole globe (Russia on a phone)', () => {
    expect(returnZoom(2.3, wholeGlobe, farIn)).toBe(wholeGlobe)
    expect(returnZoom(1.5, wholeGlobe, farIn)).toBe(wholeGlobe)
  })

  it('backs away from the globe still far out, rather than zooming in (Escape early in the flight)', () => {
    expect(returnZoom(7, wholeGlobe, 3)).toBe(2.5)
  })
})
