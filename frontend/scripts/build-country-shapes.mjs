/**
 * Builds public/geo/countries/<CODE>.json: each country's detailed shape (Natural Earth 1:10m), loaded when its map
 * opens.
 * Borders follow Google Maps, like the globe's (see FROM_BRITISH_VIEW).
 *
 * Run by `make geo`. By hand, from frontend/, after build-countries.mjs:
 *   node scripts/build-country-shapes.mjs <ne_10m_admin_0_countries.geojson> \
 *     <ne_10m_admin_0_countries_gbr.geojson>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { boxOf, extent, readFeatures, ringsOf, roundCoordinates, WITHOUT_MAP } from './geo.mjs'

const COUNTRIES = new URL('../public/geo/countries.json', import.meta.url)
const OUTPUT = new URL('../public/geo/countries/', import.meta.url)
// Rounding: about 100 m, or 1 m for a country under a degree wide, which 100 m steps would turn into a blot (Vatican,
// Monaco).
const DECIMALS = 3
const SMALL_COUNTRY_DECIMALS = 5
const SMALL_COUNTRY_DEGREES = 1
// Taken from the British view, which matches Google Maps (Crimea in Ukraine…). Not for all: it puts Kosovo in Serbia.
const FROM_BRITISH_VIEW = new Set(['MA', 'EH', 'UA', 'RU', 'SO', 'CY'])
const [defactoView, britishView] = process.argv.slice(2)
if (defactoView === undefined || britishView === undefined) {
  console.error('usage: node scripts/build-country-shapes.mjs <ne_10m.geojson> <ne_10m_gbr.geojson>')
  process.exit(1)
}

// Shape of the country `code`, its features merged (France and Clipperton, Kazakhstan and Baikonur).
function countryShape(features, code) {
  const parts = features
    .filter((feature) => feature.properties.ISO_A2_EH === code)
    .flatMap(({ geometry }) => (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates))
  if (parts.length === 0) {
    throw new Error(`${code}: no matching feature`)
  }
  return asGeometry(withoutFilledHoles(parts))
}

function asGeometry(parts) {
  return parts.length === 1 ? { type: 'Polygon', coordinates: parts[0] } : { type: 'MultiPolygon', coordinates: parts }
}

// Merges back a part that exactly fills another part's hole (Baikonur, leased to Russia, inside Kazakhstan): the hole
// goes, and the part with it. Left as is, the map's mask cut the country out twice there, and dimmed it.
function withoutFilledHoles(parts) {
  const ringKey = (ring) =>
    ring
      .slice(0, -1)
      .map(([longitude, latitude]) => `${longitude},${latitude}`)
      .sort()
      .join(';')
  const partIndexes = new Map(parts.map(([outerRing], index) => [ringKey(outerRing), index]))
  const filling = new Set()
  const kept = parts.map(([outerRing, ...holes]) => [
    outerRing,
    ...holes.filter((hole) => {
      const index = partIndexes.get(ringKey(hole))
      if (index !== undefined) {
        filling.add(index)
      }
      return index === undefined
    }),
  ])
  return kept.filter((_, index) => !filling.has(index))
}

const views = {
  defacto: readFeatures(defactoView),
  british: readFeatures(britishView),
}
const codes = JSON.parse(readFileSync(COUNTRIES, 'utf8'))
  .features.map((feature) => feature.properties.code)
  .filter((code) => !WITHOUT_MAP.has(code))

mkdirSync(OUTPUT, { recursive: true })
for (const code of codes) {
  const view = FROM_BRITISH_VIEW.has(code) ? views.british : views.defacto
  const geometry = countryShape(view, code)
  const shape = {
    type: geometry.type,
    coordinates: roundCoordinates(
      geometry.coordinates,
      extent(ringsOf(geometry).map(boxOf)) < SMALL_COUNTRY_DEGREES ? SMALL_COUNTRY_DECIMALS : DECIMALS,
    ),
  }
  writeFileSync(new URL(`${code}.json`, OUTPUT), JSON.stringify(shape) + '\n')
}
console.log(`${codes.length} country shapes written to ${OUTPUT.pathname}`)
