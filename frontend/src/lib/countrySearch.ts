import { hasMap } from './countryCode.ts'

/** A country as the search knows it: its name and other common names. */
export type CountryEntry = { code: string; name: string; aliases?: string[] }

/** A result, with the common name that matched when the name itself did not. */
export type CountryResult = { code: string; name: string; alias?: string }

/** Most results shown at once. */
export const MAX_RESULTS = 6

/**
 * Lower case, without accents, hyphens as spaces, one kind of apostrophe:
 * "États-Unis" becomes "etats unis", "Côte d’Ivoire" "cote d'ivoire".
 */
export function normalizeForSearch(text: string): string {
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
 * Countries whose name, or a common name, holds `query`, those starting
 * with it first ("ma": Madagascar before Guatemala). Countries without a
 * map are left out.
 */
export function searchCountries(
  query: string,
  entries: CountryEntry[],
  language: string,
): CountryResult[] {
  const needle = normalizeForSearch(query)
  if (needle === '') {
    return []
  }
  const starting: CountryResult[] = []
  const containing: CountryResult[] = []
  for (const entry of entries) {
    if (!hasMap(entry.code)) {
      continue
    }
    const match = bestMatch(entry, needle)
    if (match === null) {
      continue
    }
    const result: CountryResult = { code: entry.code, name: entry.name }
    if (match.alias !== undefined) {
      result.alias = match.alias
    }
    if (match.starts) {
      starting.push(result)
    } else {
      containing.push(result)
    }
  }
  const byName = (a: CountryResult, b: CountryResult) =>
    a.name.localeCompare(b.name, language)
  return [...starting.sort(byName), ...containing.sort(byName)].slice(
    0,
    MAX_RESULTS,
  )
}

// How `entry` matches: by its name first, else by a common name.
function bestMatch(
  entry: CountryEntry,
  needle: string,
): { starts: boolean; alias?: string } | null {
  const name = normalizeForSearch(entry.name)
  if (name.startsWith(needle)) {
    return { starts: true }
  }
  const aliases = entry.aliases ?? []
  const startingAlias = aliases.find((alias) =>
    normalizeForSearch(alias).startsWith(needle),
  )
  if (startingAlias !== undefined) {
    return { starts: true, alias: startingAlias }
  }
  if (name.includes(needle)) {
    return { starts: false }
  }
  const containingAlias = aliases.find((alias) =>
    normalizeForSearch(alias).includes(needle),
  )
  return containingAlias === undefined
    ? null
    : { starts: false, alias: containingAlias }
}
