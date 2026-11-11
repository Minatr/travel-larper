import type { MultiPolygon, Polygon } from 'geojson'

import type { Countries } from '../models/country.ts'

/** Served from public/, prepared by scripts/build-countries.mjs. */
const COUNTRIES_URL = '/geo/countries.json'

/**
 * Downloads the countries of the globe. The globe and the country page
 * both call it: the browser cache serves the second call.
 */
export async function fetchCountries(signal?: AbortSignal): Promise<Countries> {
  const response = await fetch(COUNTRIES_URL, { signal })
  if (!response.ok) {
    throw new Error(`countries failed to load (HTTP ${response.status})`)
  }
  return (await response.json()) as Countries
}

/**
 * Downloads the detailed shape of the country `code` (upper case),
 * prepared by scripts/build-country-shapes.mjs.
 */
export async function fetchCountryShape(
  code: string,
  signal?: AbortSignal,
): Promise<Polygon | MultiPolygon> {
  const response = await fetch(`/geo/countries/${code}.json`, { signal })
  if (!response.ok) {
    throw new Error(`${code} shape failed to load (HTTP ${response.status})`)
  }
  return (await response.json()) as Polygon | MultiPolygon
}
