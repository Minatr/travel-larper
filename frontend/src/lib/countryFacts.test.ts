import { describe, expect, it } from 'vitest'

import { currencyLabel, languagesLabel } from './countryFacts.ts'

describe('currencyLabel', () => {
  it('names the currency in the language asked for, with its symbol', () => {
    expect(currencyLabel('EUR', 'fr')).toBe('Euro · €')
    expect(currencyLabel('JPY', 'en')).toBe('Japanese Yen · ¥')
  })

  it('leaves out a symbol that is only the code', () => {
    expect(currencyLabel('CHF', 'en')).toBe('Swiss Franc')
  })

  it('keeps the code of a currency the browser does not know', () => {
    expect(currencyLabel('ZZZ', 'en')).toMatch(/^ZZZ/)
  })
})

describe('languagesLabel', () => {
  it('names the languages, capitalized, in the order given', () => {
    expect(
      languagesLabel(
        [
          { code: 'fr', name: 'French' },
          { code: 'br', name: 'Breton' },
        ],
        'fr',
      ),
    ).toBe('Français, Breton')
    expect(languagesLabel([{ code: 'pt-BR', name: 'Portuguese' }], 'en')).toBe('Brazilian Portuguese')
  })

  it('keeps the English name of a language the browser cannot name', () => {
    expect(languagesLabel([{ code: 'qaa', name: 'Barwe' }], 'fr')).toBe('Barwe')
  })
})
