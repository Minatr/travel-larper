import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

import type { components } from './api.gen.ts'

/** Properties kept for each country by scripts/build-countries.mjs. */
export type CountryProperties = {
  /** ISO 3166-1 alpha-2 code, e.g. "FR". */
  code: string
  /** 1 to 7, chosen by Natural Earth so that neighbours never share one. */
  colorGroup: number
}

/** One country of public/geo/countries.json. */
export type Country = Feature<Polygon | MultiPolygon, CountryProperties>

/** The countries file: every country of the globe. */
export type Countries = FeatureCollection<Polygon | MultiPolygon, CountryProperties>

/** A country's fact sheet, from GET /api/countries/{code}: currencies and languages as codes, Wikivoyage summary. */
export type CountryInfo = components['schemas']['CountryInfo']

/** Languages the fact sheet can be asked in: those of the app, which have a Wikivoyage edition. */
export type CountryInfoLanguage = 'en' | 'fr'
