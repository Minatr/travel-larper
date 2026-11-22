/**
 * Builds public/geo/countries.json from Natural Earth (public domain):
 * https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
 *
 * Run by `make geo`. By hand, from frontend/:
 *   node scripts/build-countries.mjs <ne_110m_admin_0_countries.geojson> \
 *     <ne_50m_admin_0_countries.geojson> <countries-land-10m.geo.json>
 *
 * Base: the 1:110m countries, light enough for phones. Borders follow Google Maps, which the app links to, rather than
 * Natural Earth's de facto ones. The small countries missing at 1:110m come from 1:50m, and so do the islands a
 * country lacks at 1:110m (Guadeloupe, Réunion): its distant territories can then be hovered and clicked. The
 * microstates take their OpenStreetMap shape (github.com/simonepri/geo-maps, land only), as rough as the countries
 * around: the 1:50m one lay up to a kilometer off, and the globe flies close enough to them to show it against their
 * map. Only the
 * shape, ISO code and color group are kept: the browser names a country from its code (Intl.DisplayNames).
 */
import { readFileSync, writeFileSync } from 'node:fs'

import { simplifyByArea } from './simplify.mjs'

const OUTPUT = new URL('../public/geo/countries.json', import.meta.url)
const DECIMALS = 3
// Natural Earth's marker for "no ISO code".
const MISSING = '-99'
// Natural Earth types of the small countries taken from 1:50m: dependencies such as Bermuda are left out, like at
// 1:110m.
const COUNTRY_TYPES = new Set(['Sovereign country', 'Country'])

// De facto entities merged back into the country Google Maps shows them in.
const MERGED = { SOL: 'SOM', CYN: 'CYP' }
// Ends of the Morocco - Western Sahara border (27°40' N) in the 1:110m data, on the coast and at the Algerian border.
// Morocco's outline runs from the second to the first around the part of Western Sahara it holds.
const SAHARA_BORDER_COAST = [-13.121613, 27.654148]
const SAHARA_BORDER_EAST = [-8.66559, 27.656426]
// Bounding box that singles out Crimea among Russia's polygons.
const CRIMEA = { west: 32, east: 37, south: 44, north: 47 }
// Smallest island added from 1:50m, in km² (the same floor as the distant territories, territories.ts).
const MIN_ISLAND_KM2 = 20
const KM_PER_DEGREE = 111.32
// The microstates (src/lib/microstates.ts), by OpenStreetMap code, and the rounding of their shape (about 1 m).
const MICROSTATES = { AD: 'AND', LI: 'LIE', MC: 'MCO', SM: 'SMR', VA: 'VAT' }
const MICROSTATE_DECIMALS = 5
// Their shape drops the points making a triangle smaller than a square of this share of their size: under ten are left,
// a polygon like the 1:110m countries around.
const MICROSTATE_ROUGHNESS = 0.1

const [smallScale, mediumScale, osmLand] = process.argv.slice(2)
if (smallScale === undefined || mediumScale === undefined || osmLand === undefined) {
  console.error(
    'usage: node scripts/build-countries.mjs <ne_110m.geojson> <ne_50m.geojson> <countries-land-10m.geo.json>',
  )
  process.exit(1)
}

function readFeatures(path) {
  return JSON.parse(readFileSync(path, 'utf8')).features
}

// Outer rings of a polygon or multipolygon (the countries used here have no holes).
function polygons(geometry) {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

function setPolygons(feature, list) {
  feature.geometry =
    list.length === 1 ? { type: 'Polygon', coordinates: list[0] } : { type: 'MultiPolygon', coordinates: list }
}

const key = (point) => point.join(',')

/**
 * Union of two rings that share a border: the edges both rings have (run in opposite directions) are dropped, and the
 * remaining ones are chained into one ring. Natural Earth borders are topologically clean (neighbours share their
 * vertices), which is what makes this simple approach work.
 */
function mergeRings(first, second) {
  const edges = [first, second].flatMap((ring) => ring.slice(0, -1).map((point, index) => [point, ring[index + 1]]))
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

// Splits a closed ring into the two closed rings on each side of the straight line between two of its vertices.
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

// The border edits below rebuild a country from a single ring: an island or a hole a newer Natural Earth release adds
// would be silently dropped, so the build stops instead.
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
  const [held, north] = splitRing(onlyRing(morocco), SAHARA_BORDER_EAST, SAHARA_BORDER_COAST)
  setPolygons(morocco, [[north]])
  setPolygons(sahara, [[mergeRings(onlyRing(sahara), held)]])
}

function isCrimea([ring]) {
  return ring.every(
    ([longitude, latitude]) =>
      longitude > CRIMEA.west && longitude < CRIMEA.east && latitude > CRIMEA.south && latitude < CRIMEA.north,
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

function boxOf(ring) {
  const longitudes = ring.map(([longitude]) => longitude)
  const latitudes = ring.map(([, latitude]) => latitude)
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)]
}

function boxesMeet(first, second) {
  return first[0] <= second[2] && first[2] >= second[0] && first[1] <= second[3] && first[3] >= second[1]
}

// Shoelace formula, longitudes narrowed by the latitude's cosine.
function areaKm2(ring) {
  const latitude = ring.reduce((sum, [, y]) => sum + y, 0) / ring.length
  let doubled = 0
  for (let index = 1; index < ring.length; index++) {
    const [x1, y1] = ring[index - 1]
    const [x2, y2] = ring[index]
    doubled += (x2 - x1) * (y2 + y1)
  }
  return (Math.abs(doubled) / 2) * Math.cos((latitude * Math.PI) / 180) * KM_PER_DEGREE ** 2
}

// Adds to each 1:110m country its 1:50m islands of MIN_ISLAND_KM2 or more lying away from its 1:110m parts (their
// boxes do not meet): a coastal island already drawn, or swallowed by the mainland's box, stays out. Islands of its
// dependencies sharing its code count too (Christmas Island, in Australia's Indian Ocean Territories), unless they lie
// against another country (the British bases on Cyprus).
function addMissingIslands(features, mediumFeatures) {
  const partBoxes = new Map(
    features.map((feature) => [feature, polygons(feature.geometry).map(([ring]) => boxOf(ring))]),
  )
  for (const feature of features) {
    const { ADM0_A3: own, ISO_A2_EH: code } = feature.properties
    const boxes = partBoxes.get(feature)
    const otherBoxes = features.filter((other) => other !== feature).flatMap((other) => partBoxes.get(other))
    const away = (box, around) => !around.some((other) => boxesMeet(box, other))
    const islands = mediumFeatures
      .filter((item) => item.properties.ADM0_A3 === own || (code !== MISSING && item.properties.ISO_A2_EH === code))
      .flatMap((item) =>
        polygons(item.geometry).map((polygon) => ({ polygon, dependency: item.properties.ADM0_A3 !== own })),
      )
      .filter(({ polygon: [ring], dependency }) => {
        const box = boxOf(ring)
        return areaKm2(ring) >= MIN_ISLAND_KM2 && away(box, boxes) && (!dependency || away(box, otherBoxes))
      })
      .map(({ polygon }) => polygon)
    if (islands.length > 0) setPolygons(feature, [...polygons(feature.geometry), ...islands])
  }
}

function roundCoordinates(coordinates, decimals) {
  return typeof coordinates[0] === 'number'
    ? coordinates.map((value) => Number(value.toFixed(decimals)))
    : coordinates.map((inner) => roundCoordinates(inner, decimals))
}

// Outer ring of the largest part of each microstate's OpenStreetMap shape, simplified: holes (Andorra's lakes) and
// slivers left out.
function microstateShapes(path) {
  const byCode = new Map(readFeatures(path).map(({ properties, geometry }) => [properties.A3, geometry]))
  return new Map(
    Object.entries(MICROSTATES).map(([code, source]) => {
      const geometry = byCode.get(source)
      if (geometry === undefined) {
        throw new Error(`${code}: no OpenStreetMap shape for ${source}`)
      }
      const [outerRing] = polygons(geometry).reduce((largest, polygon) =>
        areaKm2(polygon[0]) > areaKm2(largest[0]) ? polygon : largest,
      )
      const [west, south, east, north] = boxOf(outerRing)
      const sizeMeters =
        Math.max((east - west) * Math.cos((south * Math.PI) / 180), north - south) * KM_PER_DEGREE * 1000
      const minArea = (sizeMeters * MICROSTATE_ROUGHNESS) ** 2
      return [code, { type: 'Polygon', coordinates: [simplifyByArea(outerRing, minArea)] }]
    }),
  )
}

// ISO_A2 is "-99" for a few countries (France, Norway…) for historical reasons: ISO_A2_EH fixes them.
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
const mediumFeatures = readFeatures(mediumScale)
addMissingIslands(features, mediumFeatures)

// Added last, so that they are drawn above the bigger countries around them (Monaco, Vatican, Hong Kong…).
const small = mediumFeatures.filter(
  (item) => !present.has(item.properties.ADM0_A3) && COUNTRY_TYPES.has(item.properties.TYPE),
)

const microstates = microstateShapes(osmLand)
const countries = {
  type: 'FeatureCollection',
  features: [...features, ...small].map((feature) => {
    const code = countryCode(feature.properties)
    const microstate = microstates.get(code)
    const geometry = microstate ?? feature.geometry
    return {
      type: 'Feature',
      properties: {
        code,
        // 1 to 7, chosen by Natural Earth so that neighbours never share a value: the globe gives each value its own
        // color.
        colorGroup: feature.properties.MAPCOLOR7,
      },
      geometry: {
        type: geometry.type,
        coordinates: roundCoordinates(geometry.coordinates, microstate === undefined ? DECIMALS : MICROSTATE_DECIMALS),
      },
    }
  }),
}

writeFileSync(OUTPUT, JSON.stringify(countries) + '\n')
console.log(`${countries.features.length} countries written to ${OUTPUT.pathname}`)
