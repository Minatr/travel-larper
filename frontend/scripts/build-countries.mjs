/**
 * Builds public/geo/countries.json, the country shapes of the globe, from
 * Natural Earth (public domain), version 5.1:
 * https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
 *
 * Usage, from frontend/:
 *   node scripts/build-countries.mjs \
 *     path/to/ne_110m_admin_0_countries.geojson \
 *     path/to/ne_50m_admin_0_countries.geojson
 *
 * Three steps:
 * 1. The 1:110m countries, light enough for phones, are the base.
 * 2. Natural Earth draws de facto borders (who controls the ground). The
 *    globe shows the borders Google Maps shows, as the app links to it:
 *    Western Sahara whole and apart from Morocco, Crimea in Ukraine,
 *    Somaliland in Somalia, Northern Cyprus in Cyprus.
 * 3. The small countries missing at 1:110m (Singapore, Malta…) come from
 *    the 1:50m countries.
 *
 * Only what the app needs is kept (shape, ISO code, English and French
 * names, color group), and coordinates are rounded to 3 decimals (about
 * 100 m, invisible at globe scale).
 */
import { readFileSync, writeFileSync } from 'node:fs'

const OUTPUT = new URL('../public/geo/countries.json', import.meta.url)
const DECIMALS = 3
// Natural Earth's marker for "no ISO code".
const MISSING = '-99'
// Natural Earth types of the small countries taken from 1:50m: dependencies
// such as Bermuda are left out, like at 1:110m.
const COUNTRY_TYPES = new Set(['Sovereign country', 'Country'])

// De facto entities merged back into the country Google Maps shows them in.
const MERGED = { SOL: 'SOM', CYN: 'CYP' }
// Ends of the Morocco - Western Sahara border (27°40' N) in the 1:110m data,
// on the coast and at the Algerian border. Morocco's outline runs from the
// second to the first around the part of Western Sahara it holds.
const SAHARA_BORDER_COAST = [-13.121613, 27.654148]
const SAHARA_BORDER_EAST = [-8.66559, 27.656426]
// Bounding box that singles out Crimea among Russia's polygons.
const CRIMEA = { west: 32, east: 37, south: 44, north: 47 }

const [smallScale, mediumScale] = process.argv.slice(2)
if (smallScale === undefined || mediumScale === undefined) {
  console.error(
    'usage: node scripts/build-countries.mjs <ne_110m.geojson> <ne_50m.geojson>',
  )
  process.exit(1)
}

function readFeatures(path) {
  return JSON.parse(readFileSync(path, 'utf8')).features
}

// Outer rings of a polygon or multipolygon (the countries used here have
// no holes).
function polygons(geometry) {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.coordinates
}

function setPolygons(feature, list) {
  feature.geometry =
    list.length === 1
      ? { type: 'Polygon', coordinates: list[0] }
      : { type: 'MultiPolygon', coordinates: list }
}

const key = (point) => point.join(',')

/**
 * Union of two rings that share a border: the edges both rings have (run in
 * opposite directions) are dropped, and the remaining ones are chained
 * into one ring. Natural Earth borders are topologically clean (neighbours
 * share their vertices), which is what makes this simple approach work.
 */
function mergeRings(first, second) {
  const edges = [first, second].flatMap((ring) =>
    ring.slice(0, -1).map((point, index) => [point, ring[index + 1]]),
  )
  const edgeKeys = new Set(edges.map(([a, b]) => `${key(a)}>${key(b)}`))
  const outer = edges.filter(([a, b]) => !edgeKeys.has(`${key(b)}>${key(a)}`))
  const next = new Map(outer.map(([a, b]) => [key(a), b]))
  const start = outer[0][0]
  const ring = [start]
  for (let point = next.get(key(start)); ; point = next.get(key(point))) {
    ring.push(point)
    if (key(point) === key(start)) break
    if (ring.length > outer.length + 1) {
      throw new Error('rings do not merge into one')
    }
  }
  if (ring.length !== outer.length + 1) {
    throw new Error('rings do not merge into one')
  }
  return ring
}

// Splits a closed ring into the two closed rings on each side of the
// straight line between two of its vertices.
function splitRing(ring, from, to) {
  const points = ring.slice(0, -1)
  const start = points.findIndex((point) => key(point) === key(from))
  const rotated = [...points.slice(start), ...points.slice(0, start)]
  const end = rotated.findIndex((point) => key(point) === key(to))
  if (start === -1 || end === -1) {
    throw new Error('split points not found on the ring')
  }
  const part = rotated.slice(0, end + 1)
  const rest = [...rotated.slice(end), rotated[0]]
  return [
    [...part, part[0]],
    [...rest, rest[0]],
  ]
}

function byCode(features, code) {
  const feature = features.find((item) => item.properties.ADM0_A3 === code)
  if (feature === undefined) throw new Error(`${code} not found`)
  return feature
}

// The border edits below rebuild a country from a single ring: an island or
// a hole a newer Natural Earth release adds would be silently dropped, so
// the build stops instead.
function onlyRing(feature) {
  const parts = polygons(feature.geometry)
  if (parts.length !== 1 || parts[0].length !== 1) {
    throw new Error(`${feature.properties.ADM0_A3} is not a single ring`)
  }
  return parts[0][0]
}

function mergeCountry(features, part, into) {
  const target = byCode(features, into)
  const partRing = onlyRing(byCode(features, part))
  setPolygons(target, [[mergeRings(onlyRing(target), partRing)]])
  return features.filter((item) => item.properties.ADM0_A3 !== part)
}

function separateWesternSahara(features) {
  const morocco = byCode(features, 'MAR')
  const sahara = byCode(features, 'SAH')
  const [held, north] = splitRing(
    onlyRing(morocco),
    SAHARA_BORDER_EAST,
    SAHARA_BORDER_COAST,
  )
  setPolygons(morocco, [[north]])
  setPolygons(sahara, [[mergeRings(onlyRing(sahara), held)]])
}

function isCrimea([ring]) {
  return ring.every(
    ([longitude, latitude]) =>
      longitude > CRIMEA.west &&
      longitude < CRIMEA.east &&
      latitude > CRIMEA.south &&
      latitude < CRIMEA.north,
  )
}

function moveCrimeaToUkraine(features) {
  const russia = byCode(features, 'RUS')
  const ukraine = byCode(features, 'UKR')
  const parts = polygons(russia.geometry)
  const crimea = parts.find(isCrimea)
  if (crimea === undefined) throw new Error('Crimea not found')
  setPolygons(
    russia,
    parts.filter((part) => part !== crimea),
  )
  if (crimea.length !== 1) throw new Error('Crimea is not a single ring')
  setPolygons(ukraine, [[mergeRings(onlyRing(ukraine), crimea[0])]])
}

function round(value) {
  return Number(value.toFixed(DECIMALS))
}

function roundCoordinates(coordinates) {
  return typeof coordinates[0] === 'number'
    ? coordinates.map(round)
    : coordinates.map(roundCoordinates)
}

// ISO_A2 is "-99" for a few countries (France, Norway…) for historical
// reasons: ISO_A2_EH fixes them.
function countryCode(properties) {
  if (properties.ISO_A2_EH === MISSING) {
    throw new Error(`${properties.NAME_EN} has no ISO code`)
  }
  return properties.ISO_A2_EH
}

let features = readFeatures(smallScale)
// Before merging, so that the merged entities are not added back below.
const present = new Set(features.map((item) => item.properties.ADM0_A3))
for (const [part, into] of Object.entries(MERGED)) {
  features = mergeCountry(features, part, into)
}
separateWesternSahara(features)
moveCrimeaToUkraine(features)

// Added last, so that they are drawn above the bigger countries around
// them (Monaco, Vatican, Hong Kong…).
const small = readFeatures(mediumScale).filter(
  (item) =>
    !present.has(item.properties.ADM0_A3) &&
    COUNTRY_TYPES.has(item.properties.TYPE),
)

const countries = {
  type: 'FeatureCollection',
  features: [...features, ...small].map((feature) => ({
    type: 'Feature',
    properties: {
      code: countryCode(feature.properties),
      nameEn: feature.properties.NAME_EN,
      nameFr: feature.properties.NAME_FR,
      // 1 to 7, chosen by Natural Earth so that neighbours never share a
      // value: the globe gives each value its own color.
      colorGroup: feature.properties.MAPCOLOR7,
    },
    geometry: {
      type: feature.geometry.type,
      coordinates: roundCoordinates(feature.geometry.coordinates),
    },
  })),
}

writeFileSync(OUTPUT, JSON.stringify(countries) + '\n')
console.log(
  `${countries.features.length} countries written to ${OUTPUT.pathname}`,
)
