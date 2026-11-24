import { describe, expect, it } from 'vitest'

import { safeRedirect } from './redirect.ts'

describe('safeRedirect', () => {
  it.each([
    ['/countries/FR', '/countries/FR'],
    ['/status?x=1', '/status?x=1'],
  ])('keeps the site path %s', (target, expected) => {
    expect(safeRedirect(target)).toBe(expected)
  })

  it.each([
    ['no target', null],
    ['an absolute URL', 'https://evil.example'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash URL', '/\\evil.example'],
    ['a relative path', 'countries/FR'],
    ['a javascript URL', 'javascript:alert(1)'],
  ])('goes home for %s', (_, target) => {
    expect(safeRedirect(target)).toBe('/')
  })
})
