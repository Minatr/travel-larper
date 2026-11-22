import type { MultiPolygon, Polygon } from 'geojson'

import type { Countries } from '../models/country.ts'

/** Served from public/, prepared by scripts/build-countries.mjs. */
const COUNTRIES_URL = '/geo/countries.json'

// One download for the whole app: the globe and the country page both ask for it, at the same time when a country's URL
// is opened directly.
let countriesRequest: Promise<Countries> | undefined

/**
 * The countries of the globe, downloaded once. Not cancellable, as another caller may be waiting for it; a failed
 * download is tried again next call.
 */
export function fetchCountries(): Promise<Countries> {
  countriesRequest ??= downloadCountries().catch((error: unknown) => {
    countriesRequest = undefined
    throw error
  })
  return countriesRequest
}

async function downloadCountries(): Promise<Countries> {
  const response = await fetch(COUNTRIES_URL)
  if (!response.ok) {
    throw new Error(`countries failed to load (HTTP ${response.status})`)
  }
  return (await response.json()) as Countries
}

/**
 * Downloads the detailed shape of the country `code` (upper case), prepared by scripts/build-country-shapes.mjs.
 */
export async function fetchCountryShape(code: string, signal?: AbortSignal): Promise<Polygon | MultiPolygon> {
  const response = await fetch(`/geo/countries/${code}.json`, { signal })
  if (!response.ok) {
    throw new Error(`${code} shape failed to load (HTTP ${response.status})`)
  }
  return (await response.json()) as Polygon | MultiPolygon
}

/**
 * Downloads the borders of the country `code` (upper case) from OpenStreetMap, for its map's mask, prepared by
 * scripts/build-country-borders.mjs: null where they differ from the app's (the shape then masks).
 */
export async function fetchCountryBorders(code: string, signal?: AbortSignal): Promise<Polygon | MultiPolygon | null> {
  const response = await fetch(`/geo/borders/${code}.json`, { signal })
  if (!response.ok) {
    throw new Error(`${code} borders failed to load (HTTP ${response.status})`)
  }
  return (await response.json()) as Polygon | MultiPolygon | null
}
