/**
 * Which languages the interface speaks, and which one a visitor gets. Kept apart from index.ts, which configures
 * i18next as soon as it is imported, so that this logic can be tested on its own.
 */

/** Languages the interface is translated into. */
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const

/** One of the supported languages. */
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/** Used when the browser asks for no supported language. */
export const DEFAULT_LANGUAGE: Language = 'en'

/**
 * localStorage key holding the language chosen with the former switcher: still read, so that a choice made before keeps
 * applying until the profile holds the language.
 */
const STORAGE_KEY = 'language'

function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

/**
 * Picks the first browser language we support, ignoring the region (`fr-CA` counts as `fr`), and falls back to English.
 * The browser gives its languages in order of preference (`navigator.languages`).
 */
export function detectLanguage(browserLanguages: readonly string[]): Language {
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLanguage(base)) {
      return base
    }
  }
  return DEFAULT_LANGUAGE
}

// TODO(TL-25): the profile's language, which wins at login; this browser's former choice can go then.
/**
 * Language picked earlier on this browser, or null if none. localStorage can be unavailable (some private modes) or
 * hold a stale value: both count as "no choice".
 */
export function readStoredLanguage(): Language | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value !== null && isLanguage(value) ? value : null
  } catch {
    return null
  }
}
