import { hasMap } from './countryCode.ts'
import type { InsetId } from './territories.ts'

/**
 * A country as the search knows it: its name and other common names. A distant territory (French Guiana) is one too,
 * with its country's code and name.
 */
export type CountryEntry = { code: string; name: string; aliases?: string[]; territory?: InsetId; country?: string }

/** A country ready to search: its names already normalized, once per language. */
export type SearchableCountry = CountryEntry & {
  searchName: string
  searchAliases: string[]
}

/**
 * A result, with the common name that matched when the name itself did not; for a territory, its country's name.
 */
export type CountryResult = { code: string; name: string; alias?: string; territory?: InsetId; country?: string }

/** Most results shown at once. */
const MAX_RESULTS = 6

/**
 * Lower case, without accents, hyphens as spaces, one kind of apostrophe: "États-Unis" becomes "etats unis", "Côte
 * d’Ivoire" "cote d'ivoire".
 */
function normalizeForSearch(text: string): string {
  return foldCase(text).trim()
}

// Character by character (splitOnMatch relies on it): one in, one out.
function foldCase(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/-/g, ' ')
}

/** A name cut around the part matching the query, to show it in bold. */
export type NameParts = { before: string; match: string; after: string }

/** Splits `name` around `query`, accents aside ("eta" in "États-Unis": "Éta"). */
export function splitOnMatch(name: string, query: string): NameParts {
  const needle = normalizeForSearch(query)
  // Folded name, and the index in `name` of each of its characters.
  let folded = ''
  const origins: number[] = []
  for (let index = 0; index < name.length; index++) {
    const piece = foldCase(name[index])
    folded += piece
    origins.push(...Array.from(piece, () => index))
  }
  const start = needle === '' ? -1 : folded.indexOf(needle)
  if (start === -1) {
    return { before: name, match: '', after: '' }
  }
  const from = origins[start]
  const to = origins[start + needle.length - 1] + 1
  return {
    before: name.slice(0, from),
    match: name.slice(from, to),
    after: name.slice(to),
  }
}

/**
 * Prepares `entries` for {@link searchCountries}, leaving out countries without a map. To redo only when the names
 * change (language).
 */
export function prepareCountries(entries: CountryEntry[]): SearchableCountry[] {
  return entries
    .filter((entry) => hasMap(entry.code))
    .map((entry) => ({
      ...entry,
      searchName: normalizeForSearch(entry.name),
      searchAliases: (entry.aliases ?? []).map(normalizeForSearch),
    }))
}

/**
 * Countries whose name, or a common name, holds `query`, those starting with it first ("ma": Madagascar before
 * Guatemala).
 */
export function searchCountries(query: string, countries: SearchableCountry[], language: string): CountryResult[] {
  const needle = normalizeForSearch(query)
  if (needle === '') {
    return []
  }
  const starting: CountryResult[] = []
  const containing: CountryResult[] = []
  for (const entry of countries) {
    const match = bestMatch(entry, needle)
    if (match === null) {
      continue
    }
    const result: CountryResult = { code: entry.code, name: entry.name }
    if (match.alias !== undefined) {
      result.alias = match.alias
    }
    if (entry.territory !== undefined) {
      result.territory = entry.territory
      result.country = entry.country
    }
    if (match.starts) {
      starting.push(result)
    } else {
      containing.push(result)
    }
  }
  const byName = (a: CountryResult, b: CountryResult) => a.name.localeCompare(b.name, language)
  return [...starting.sort(byName), ...containing.sort(byName)].slice(0, MAX_RESULTS)
}

// How `entry` matches: by its name first, else by a common name.
function bestMatch(entry: SearchableCountry, needle: string): { starts: boolean; alias?: string } | null {
  if (entry.searchName.startsWith(needle)) {
    return { starts: true }
  }
  const starting = entry.searchAliases.findIndex((alias) => alias.startsWith(needle))
  if (starting !== -1) {
    return { starts: true, alias: entry.aliases?.[starting] }
  }
  if (entry.searchName.includes(needle)) {
    return { starts: false }
  }
  const containing = entry.searchAliases.findIndex((alias) => alias.includes(needle))
  return containing === -1 ? null : { starts: false, alias: entry.aliases?.[containing] }
}
