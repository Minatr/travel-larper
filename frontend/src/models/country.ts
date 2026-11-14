import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

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
export type Countries = FeatureCollection<
  Polygon | MultiPolygon,
  CountryProperties
>
