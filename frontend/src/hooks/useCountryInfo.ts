import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { hasMap } from '../lib/countryCode.ts'
import type { CountryInfo, CountryInfoLanguage } from '../models/country.ts'
import { fetchCountryInfo } from '../services/countries.ts'

/** State of a country's fact sheet: loading, loaded, or failed (the API could not answer). */
export type CountryInfoState = { kind: 'loading' } | { kind: 'loaded'; info: CountryInfo } | { kind: 'failed' }

/**
 * Loads the fact sheet of the country `code` (any case) in the app's language, again when either changes. It starts
 * alongside the map, which never waits for it.
 */
export function useCountryInfo(code: string): CountryInfoState {
  const { i18n } = useTranslation()
  const language: CountryInfoLanguage = i18n.language.startsWith('fr') ? 'fr' : 'en'
  const upperCode = code.toUpperCase()
  const [state, setState] = useState<{ key: string; value: CountryInfoState }>({
    key: '',
    value: { kind: 'loading' },
  })
  const key = `${upperCode}:${language}`

  useEffect(() => {
    // An unknown code shows the not found page: nothing to ask.
    if (!hasMap(upperCode)) {
      return
    }
    const controller = new AbortController()
    fetchCountryInfo(upperCode, language, controller.signal)
      .then((info) => setState({ key, value: { kind: 'loaded', info } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('country info failed to load', error)
          setState({ key, value: { kind: 'failed' } })
        }
      })
    return () => controller.abort()
  }, [upperCode, language, key])

  // An answer for another country or language is not this one's: loading until its own comes.
  return state.key === key ? state.value : { kind: 'loading' }
}
