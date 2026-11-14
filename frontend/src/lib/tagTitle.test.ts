import { describe, expect, it } from 'vitest'

import { fittedTitleSize } from './tagTitle.ts'

describe('fittedTitleSize', () => {
  it('keeps the largest size when every word fits', () => {
    expect(fittedTitleSize('France', 200, 30)).toBe(30)
  })

  it('shrinks until the longest word fits on one line', () => {
    const size = fittedTitleSize('République centrafricaine', 200, 30)

    expect(size).toBeLessThan(30)
    expect('centrafricaine'.length * 0.6 * size).toBeLessThanOrEqual(200)
  })

  it('wraps after hyphens rather than shrinking for the whole name', () => {
    expect(fittedTitleSize('Saint-Vincent-et-les-Grenadines', 200, 30)).toBe(
      fittedTitleSize('Grenadines', 200, 30),
    )
  })
})
