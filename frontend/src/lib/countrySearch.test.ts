import { describe, expect, it } from 'vitest'

import {
  type CountryEntry,
  searchCountries,
  splitOnMatch,
} from './countrySearch.ts'

const ENTRIES: CountryEntry[] = [
  { code: 'GT', name: 'Guatemala' },
  { code: 'ML', name: 'Mali' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'US', name: 'États-Unis' },
  { code: 'AQ', name: 'Antarctique' },
  { code: 'FR', name: 'France' },
  { code: 'CI', name: 'Côte d’Ivoire' },
  { code: 'GB', name: 'Royaume-Uni', aliases: ['UK', 'Angleterre'] },
]

describe('searchCountries', () => {
  const cases: { name: string; query: string; want: string[] }[] = [
    { name: 'nothing for an empty query', query: '  ', want: [] },
    { name: 'ignores case', query: 'FRA', want: ['FR'] },
    { name: 'ignores accents', query: 'etats', want: ['US'] },
    {
      name: 'puts names starting with the query first',
      query: 'ma',
      want: ['MG', 'ML', 'GT'],
    },
    { name: 'leaves out countries without a map', query: 'antar', want: [] },
    { name: 'takes a space for a hyphen', query: 'etats unis', want: ['US'] },
    { name: 'takes any apostrophe', query: "cote d'iv", want: ['CI'] },
    { name: 'finds a common name', query: 'angle', want: ['GB'] },
    { name: 'finds nothing for an unknown name', query: 'xyz', want: [] },
  ]

  it.each(cases)('$name', ({ query, want }) => {
    expect(
      searchCountries(query, ENTRIES, 'fr').map((entry) => entry.code),
    ).toEqual(want)
  })

  it('tells which common name matched', () => {
    expect(searchCountries('uk', ENTRIES, 'fr')).toEqual([
      { code: 'GB', name: 'Royaume-Uni', alias: 'UK' },
    ])
  })

  it('shows six results at most', () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      code: `A${String.fromCharCode(65 + index)}`,
      name: `Aland ${index}`,
    }))

    expect(searchCountries('aland', many, 'fr')).toHaveLength(6)
  })
})

describe('splitOnMatch', () => {
  it.each([
    {
      name: 'the start of a name',
      query: 'fra',
      want: { before: '', match: 'Fra', after: 'nce' },
    },
    {
      name: 'the middle of a name',
      query: 'tema',
      want: { before: 'Gua', match: 'tema', after: 'la' },
    },
    {
      name: 'accents aside',
      query: 'eta',
      want: { before: '', match: 'Éta', after: 'ts-Unis' },
    },
  ])('$name', ({ query, want }) => {
    const name = `${want.before}${want.match}${want.after}`
    expect(splitOnMatch(name, query)).toEqual(want)
  })

  it('keeps the whole name when nothing matches', () => {
    expect(splitOnMatch('France', 'xyz')).toEqual({
      before: 'France',
      match: '',
      after: '',
    })
  })
})
