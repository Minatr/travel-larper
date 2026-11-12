import { useEffect, useState } from 'react'

import { hasMap } from '../lib/countryCode.ts'
import { type CountryMapData, countryMapData } from '../lib/countryMapData.ts'
import type { Countries } from '../models/country.ts'
import { fetchCountries, fetchCountryShape } from '../services/countries.ts'

/** State of a country looked up by code: loading, found, unknown or failed. */
export type CountryState =
  | { kind: 'loading' }
  | { kind: 'found'; map: CountryMapData }
  | { kind: 'notFound' }
  | { kind: 'unavailable' }

/** Finds the country `code` (ISO, any case) and what its map needs. */
export function useCountry(code: string): CountryState {
  const [state, setState] = useState<CountryState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    loadCountry(code.toUpperCase(), controller.signal)
      .then((state) => {
        if (!controller.signal.aborted) {
          setState(state)
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('country failed to load', error)
          setState({ kind: 'unavailable' })
        }
      })
    return () => controller.abort()
  }, [code])

  return state
}

async function loadCountry(
  code: string,
  signal: AbortSignal,
): Promise<CountryState> {
  if (!hasMap(code)) {
    return { kind: 'notFound' }
  }
  // Both downloads start together; a failed shape only matters once the code
  // is known to exist.
  const shapeRequest = fetchCountryShape(code, signal).then(
    (shape) => ({ shape }),
    (error: unknown) => ({ error }),
  )
  const countries: Countries = await fetchCountries()
  const country = countries.features.find(
    (feature) => feature.properties.code === code,
  )
  if (country === undefined) {
    return { kind: 'notFound' }
  }
  const shapeResult = await shapeRequest
  if ('error' in shapeResult) {
    throw shapeResult.error
  }
  const map = countryMapData(country.geometry, shapeResult.shape)
  return map === null ? { kind: 'unavailable' } : { kind: 'found', map }
}
