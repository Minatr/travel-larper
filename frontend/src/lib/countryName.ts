/**
 * Name of the country `code` in `language`, from the browser ("DE" in French:
 * "Allemagne"). Falls back to `code` for an unknown or malformed code.
 */
export function countryName(code: string, language: string): string {
  const names = displayNamesFor(language)
  try {
    return names.of(code.toUpperCase()) ?? code
  } catch {
    // Intl.DisplayNames throws a RangeError on a malformed code ("../FR").
    return code
  }
}

// Costly to build, and the search asks for ~250 names at once: one per language.
const displayNames = new Map<string, Intl.DisplayNames>()

function displayNamesFor(language: string): Intl.DisplayNames {
  let names = displayNames.get(language)
  if (names === undefined) {
    names = new Intl.DisplayNames([language], { type: 'region' })
    displayNames.set(language, names)
  }
  return names
}
