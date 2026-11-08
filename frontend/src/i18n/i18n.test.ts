import { describe, expect, it } from 'vitest'

import {
  detectLanguage,
  readStoredLanguage,
  storeLanguage,
} from './languages.ts'
import en from './locales/en.json'
import fr from './locales/fr.json'

/** Lists every key of a nested translation object, as `a.b.c`. */
function flattenKeys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`
    return typeof child === 'object' && child !== null
      ? flattenKeys(child, path)
      : [path]
  })
}

describe('translations', () => {
  it('have the same keys in English and French', () => {
    expect(flattenKeys(fr).sort()).toEqual(flattenKeys(en).sort())
  })
})

describe('detectLanguage', () => {
  const tests = [
    { name: 'English with a region', browser: ['en-US'], want: 'en' },
    { name: 'French with a region', browser: ['fr-CA'], want: 'fr' },
    { name: 'first supported one wins', browser: ['de-DE', 'fr'], want: 'fr' },
    { name: 'unsupported language', browser: ['de'], want: 'en' },
    { name: 'no language at all', browser: [], want: 'en' },
  ]

  it.each(tests)('$name', ({ browser, want }) => {
    expect(detectLanguage(browser)).toBe(want)
  })
})

describe('stored language', () => {
  it('reads back the language stored by the switcher', () => {
    storeLanguage('fr')
    expect(readStoredLanguage()).toBe('fr')
  })

  it('ignores an unknown stored value', () => {
    window.localStorage.setItem('language', 'klingon')
    expect(readStoredLanguage()).toBeNull()
  })

  it('returns null when nothing was chosen', () => {
    expect(readStoredLanguage()).toBeNull()
  })
})
