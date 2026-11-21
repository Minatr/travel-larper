import { describe, expect, it } from 'vitest'

import {
  ALL_INSETS,
  distanceBetweenKm,
  findInset,
  ignoredAreasOf,
  insetAt,
  insetsOf,
  mainFrameOf,
} from './territories.ts'

describe('territories', () => {
  it('lists the insets of a country, none for another', () => {
    expect(insetsOf('FR').map((inset) => inset.id)).toEqual(['antilles', 'french-guiana', 'mayotte', 'reunion'])
    expect(insetsOf('DE')).toEqual([])
  })

  it.each([
    { name: 'a known inset', code: 'FR', id: 'reunion', want: 'reunion' },
    { name: 'no territory asked', code: 'FR', id: null, want: undefined },
    { name: 'an unknown one', code: 'FR', id: 'nowhere', want: undefined },
    { name: "another country's", code: 'DE', id: 'reunion', want: undefined },
  ])('finds $name from the URL', ({ code, id, want }) => {
    expect(findInset(code, id)?.id).toBe(want)
  })

  it.each([
    { name: 'French Guiana', code: 'FR', point: [-52.3, 4.9] as const, want: 'french-guiana' },
    { name: 'the mainland', code: 'FR', point: [2.35, 48.85] as const, want: undefined },
    { name: 'the Aleutians, past 180°', code: 'US', point: [-178, 51.8] as const, want: 'alaska' },
    { name: 'the coast, just outside the frame', code: 'FR', point: [55.2, -21.5] as const, want: 'reunion' },
  ])('tells the inset under $name', ({ code, point, want }) => {
    expect(insetAt(code, [...point])?.id).toBe(want)
  })

  it('anchors an inset on its largest part, not on a neighbour in its frame (Antilles: not Dominica)', () => {
    const antilles = findInset('FR', 'antilles')
    expect(antilles === null ? null : insetAt('FR', antilles.anchor)?.id).toBe('antilles')
    const [, latitude] = antilles?.anchor ?? [0, 0]
    // Dominica lies between 15.2° and 15.65° N.
    expect(latitude < 15.2 || latitude > 15.65).toBe(true)
  })

  it('has a frame for the countries with distant parts only', () => {
    expect(mainFrameOf('NO')).toBeDefined()
    expect(mainFrameOf('DE')).toBeUndefined()
    expect(ignoredAreasOf('NO')).toHaveLength(2)
    expect(ignoredAreasOf('FR')).toHaveLength(1)
    expect(ignoredAreasOf('DE')).toEqual([])
  })

  it('knows the capital of every country with an inset, for its distance', () => {
    expect(ALL_INSETS.filter((inset) => distanceBetweenKm(inset.country, null, inset) === null)).toEqual([])
  })

  it.each([
    { name: 'from the capital (Paris to Martinique: 6,848 km)', from: null, to: 'antilles', want: 6850 },
    { name: 'back to the capital', from: 'antilles', to: null, want: 6850 },
    { name: 'between two insets (Martinique to French Guiana)', from: 'antilles', to: 'french-guiana', want: 1470 },
  ])('measures the distance $name, rounded to 10 km', ({ from, to, want }) => {
    expect(distanceBetweenKm('FR', findInset('FR', from), findInset('FR', to))).toBe(want)
  })
})
