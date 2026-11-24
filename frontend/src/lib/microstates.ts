import microstates from './microstates.json'

/**
 * Codes of the microstates. Their shapes, on the globe and on their map, come from OpenStreetMap and are precise
 * (scripts/build-countries.mjs, build-country-borders.mjs): they open close up, the Vatican at a street's zoom. The globe
 * draws them above the borders of the countries around, which, at 1:110m, run across them. In a JSON file, shared with
 * the map data scripts (scripts/geo.mjs).
 */
export const MICROSTATES: readonly string[] = microstates
