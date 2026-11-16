import type { LngLat } from './countryAnchor.ts'

/** Side of the square tile of sky, repeated to fill the screen. */
export const SKY_SIZE = 1000

/** A star of the background, in a {@link SKY_SIZE} square. */
export type Star = { x: number; y: number; radius: number; opacity: number }

/**
 * Faint stars spread at random, the same every time for a given `seed`:
 * the sky does not change from one visit to the next. Almost all are tiny
 * and dim, like distant dust; only a few stand out a little.
 */
export function starfield(count: number, seed: number): Star[] {
  const random = seeded(seed)
  return Array.from({ length: count }, () => {
    const size = random() ** 4
    return {
      x: random() * SKY_SIZE,
      y: random() * SKY_SIZE,
      radius: 0.25 + size * 0.6,
      opacity: 0.12 + size * 0.45 + random() * 0.1,
    }
  })
}

/**
 * Shift of the sky for the globe's center: it follows the globe at about
 * half the speed of its surface, which reads as depth. A full turn shifts it
 * by exactly one tile, so the jump from 180° to -180° does not show.
 */
export function skyOffset([lng, lat]: LngLat): { x: number; y: number } {
  return { x: (-lng / 360) * SKY_SIZE, y: (lat / 360) * SKY_SIZE }
}

// Mulberry32: a tiny pseudo-random generator, repeatable from its seed.
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
