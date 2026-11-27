/**
 * Currencies and languages arrive as codes (EUR, fr): the browser names them in the user's language, so that nothing
 * has to be translated by hand.
 */

/** A language as the API gives it: its BCP 47 code, and its English name for when the browser does not know it. */
export type NamedLanguage = { code: string; name: string }

/** "Euro · €": the currency's name, then its symbol when it is not just the code (CHF). */
export function currencyLabel(code: string, locale: string): string {
  const name = displayName(code, locale, 'currency')
  const symbol = currencySymbol(code, locale)
  return symbol === null || symbol === code ? name : `${name} · ${symbol}`
}

/**
 * "Français, Breton": the languages' names, in the order given. A language the browser cannot name (Chibarwe, bwg)
 * keeps its English name.
 */
export function languagesLabel(languages: NamedLanguage[], locale: string): string {
  return languages.map(({ code, name }) => displayName(code, locale, 'language', name)).join(', ')
}

// Capitalized: a currency or a language heads its line ("euro" in French otherwise). `fallback` (the code by default)
// when the browser does not know it: a currency newer than its data, a rare language.
function displayName(code: string, locale: string, type: 'currency' | 'language', fallback = code): string {
  try {
    const name = new Intl.DisplayNames(locale, { type, fallback: 'none' }).of(code) ?? fallback
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
  } catch {
    return fallback
  }
}

function currencySymbol(code: string, locale: string): string | null {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0)
    return parts.find((part) => part.type === 'currency')?.value ?? null
  } catch {
    return null
  }
}
