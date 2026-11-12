import { describe, expect, it } from 'vitest'

import { hasMap } from './countryCode.ts'

describe('hasMap', () => {
  it.each([
    { code: 'FR', want: true },
    { code: 'AQ', want: false },
    { code: 'fr', want: false },
    { code: 'FRA', want: false },
    { code: '../FR', want: false },
  ])('answers $want for $code', ({ code, want }) => {
    expect(hasMap(code)).toBe(want)
  })
})
