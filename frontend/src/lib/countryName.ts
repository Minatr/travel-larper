/**
 * Name of the country `code` in `language`, from the browser ("DE" in French:
 * "Allemagne"). Falls back to `code` for an unknown or malformed code.
 */
export function countryName(code: string, language: string): string {
  const names = new Intl.DisplayNames([language], { type: 'region' })
  try {
    return names.of(code.toUpperCase()) ?? code
  } catch {
    // Intl.DisplayNames throws a RangeError on a malformed code ("../FR").
    return code
  }
}
