import { describe, expect, it } from 'vitest'

import { countryName } from './countryName.ts'

describe('countryName', () => {
  it.each([
    { code: 'FR', language: 'en', want: 'France' },
    { code: 'DE', language: 'fr', want: 'Allemagne' },
    { code: 'eh', language: 'fr', want: 'Sahara occidental' },
  ])('names $code in $language', ({ code, language, want }) => {
    expect(countryName(code, language)).toBe(want)
  })

  it('falls back to the text itself when it is not a code', () => {
    expect(countryName('../FR', 'en')).toBe('../FR')
  })
})
