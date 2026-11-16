import { describe, expect, it } from 'vitest'

import { pulseFrame } from './searchMarker.ts'

describe('pulseFrame', () => {
  it('starts on the ring, fully visible', () => {
    expect(pulseFrame(0)).toEqual({ radius: 16, opacity: 1 })
  })

  it('grows and fades', () => {
    const middle = pulseFrame(550)

    expect(middle?.radius).toBeCloseTo(36)
    expect(middle?.opacity).toBeCloseTo(0.5)
  })

  it('starts again for the next pulse, then stops', () => {
    expect(pulseFrame(1100)).toEqual({ radius: 16, opacity: 1 })
    expect(pulseFrame(3300)).toBeNull()
  })
})
