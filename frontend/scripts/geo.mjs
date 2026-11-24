/**
 * Helpers shared by the map data scripts (build-countries.mjs, build-country-shapes.mjs, build-country-borders.mjs),
 * and the country lists they share with the app (src/lib/microstates.json, withoutMap.json).
 */
import { readFileSync } from 'node:fs'

/** The microstates, by ISO code (src/lib/microstates.ts). */
export const MICROSTATES = readJson('../src/lib/microstates.json')

/** Countries without a map (src/lib/countryCode.ts): Antarctica. */
export const WITHOUT_MAP = new Set(readJson('../src/lib/withoutMap.json'))

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'))
}

/** Features of the GeoJSON file at `path`. */
export function readFeatures(path) {
  return JSON.parse(readFileSync(path, 'utf8')).features
}

/** Box of a ring: [west, south, east, north]. */
export function boxOf(ring) {
  const longitudes = ring.map(([longitude]) => longitude)
  const latitudes = ring.map(([, latitude]) => latitude)
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)]
}

/** Every ring of a polygon or multipolygon, outer rings and holes alike. */
export function ringsOf({ type, coordinates }) {
  return (type === 'Polygon' ? [coordinates] : coordinates).flat()
}

/** Coordinates at any depth, rounded to `decimals`. */
export function roundCoordinates(coordinates, decimals) {
  return typeof coordinates[0] === 'number'
    ? coordinates.map((value) => Number(value.toFixed(decimals)))
    : coordinates.map((inner) => roundCoordinates(inner, decimals))
}

/** Widest of the longitude and latitude spans of `boxes`, in degrees. */
export function extent(boxes) {
  const west = Math.min(...boxes.map(([west]) => west))
  const south = Math.min(...boxes.map(([, south]) => south))
  const east = Math.max(...boxes.map(([, , east]) => east))
  const north = Math.max(...boxes.map(([, , , north]) => north))
  return Math.max(east - west, north - south)
}
