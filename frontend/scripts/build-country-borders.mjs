/**
 * Builds public/geo/borders/<CODE>.json: each country's borders from OpenStreetMap, territorial waters included
 * (github.com/simonepri/geo-maps, to within 10 m), for the mask of its map. The tiles come from OpenStreetMap too, so
 * the mask meets their borders, and the sea, drawn above the mask, hides its offshore edge: the coast is the tiles'.
 * A file holds `null` where OpenStreetMap's borders differ from the app's (KEEP_NATURAL_EARTH): the map then masks with
 * the country's Natural Earth shape.
 *
 * Run by `make geo`. By hand, from frontend/:
 *   node scripts/build-country-borders.mjs <countries-maritime-10m.geo.json> <ne_10m_admin_0_countries.geojson>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { simplify } from './simplify.mjs'

const COUNTRIES = new URL('../public/geo/countries.json', import.meta.url)
const OUTPUT = new URL('../public/geo/borders/', import.meta.url)
/**
 * Precision kept: the source's 10 m for a country under a degree wide, whose streets one zooms into (the Vatican,
 * Monaco); 40 m elsewhere, about a pixel at zoom 12, and less than half the weight of 10 m (16 MB in all, not 35).
 * Rounding: about 1 m and 10 m.
 */
const SMALL_COUNTRY_DEGREES = 1
const SMALL_COUNTRY_DECIMALS = 5
const DECIMALS = 4
const TOLERANCE_M = 40
// Countries without a map (src/lib/countryCode.ts): Antarctica.
const WITHOUT_MAP = new Set(['AQ'])
/** OpenStreetMap's borders, as of the source (2018), unlike Google Maps': Western Sahara in Morocco, Crimea in Russia. */
const KEEP_NATURAL_EARTH = new Set(['MA', 'RU'])
/** OpenStreetMap's countries in the app's country, besides its own: the parts Natural Earth draws within it. */
const OTHER_PARTS = {
  AU: ['CXR', 'CCK'],
  FR: ['GLP', 'MTQ', 'GUF', 'REU', 'MYT'],
  NL: ['BES'],
  NO: ['SJM', 'BVT'],
  NZ: ['TKL'],
}
/** OpenStreetMap's code where Natural Earth has none (Kosovo: -99). */
const OWN_CODES = { XK: 'XKX' }

const [bordersPath, naturalEarthPath] = process.argv.slice(2)
if (bordersPath === undefined || naturalEarthPath === undefined) {
  console.error('usage: node scripts/build-country-borders.mjs <countries-maritime-10m.geo.json> <ne_10m.geojson>')
  process.exit(1)
}

function readFeatures(path) {
  return JSON.parse(readFileSync(path, 'utf8')).features
}

function ringsOf({ type, coordinates }) {
  return (type === 'Polygon' ? [coordinates] : coordinates).flat()
}

// Area of a ring in square degrees, enough to sort rings by size.
function ringArea(ring) {
  let sum = 0
  for (let index = 1; index < ring.length; index++) {
    sum += ring[index - 1][0] * ring[index][1] - ring[index][0] * ring[index - 1][1]
  }
  return Math.abs(sum / 2)
}

function contains(ring, [x, y]) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index]
    const [xj, yj] = ring[previous]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function boxOf(ring) {
  const longitudes = ring.map(([longitude]) => longitude)
  const latitudes = ring.map(([, latitude]) => latitude)
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)]
}

// Points to test whether a ring lies in another: a few of its vertices, as one may sit on a shared border.
const SAMPLE_POINTS = 5
function holds(outer, ring) {
  const [west, south, east, north] = outer.box
  const sample = ring.points.filter((_, index) => index % Math.ceil(ring.points.length / SAMPLE_POINTS) === 0)
  const inBox = sample.every(([x, y]) => x >= west && x <= east && y >= south && y <= north)
  return inBox && sample.filter((point) => contains(outer.points, point)).length * 2 > sample.length
}

/**
 * Polygons from the source's countries, each a list of rings. The source draws an enclave (the Vatican in Italy, Lesotho
 * in South Africa) as a part of its own, meant to be cut out of the part around it: a ring inside another of the same
 * country becomes its hole. A ring inside a hole (Baarle's enclaves within enclaves, a few hectares) is left out, as the
 * map's mask cannot draw it.
 * Across countries, a ring inside another's is a duplicate: France also holds its overseas regions' land, which their
 * own countries hold with their waters. It goes, or it would cut Guadeloupe out.
 * A hole is kept only where another country lies: the source also draws some islands twice, once inside the waters
 * around them (Phú Quốc, in Vietnam), and as a hole they would be cut out.
 * O(n²) in rings, a few hundred at most.
 */
function polygonsOf(countries, otherRings) {
  const all = countries
    .flatMap((rings, country) =>
      rings.map((points) => ({ country, points, box: boxOf(points), area: ringArea(points) })),
    )
    .sort((first, second) => second.area - first.area)
  const placed = []
  for (const ring of all) {
    const around = placed.findLast((outer) => holds(outer, ring))
    if (around !== undefined && around.country !== ring.country) {
      continue
    }
    ring.depth = around === undefined ? 0 : around.depth + 1
    ring.parent = around
    placed.push(ring)
  }
  const polygons = placed.filter((ring) => ring.depth === 0).map((ring) => ({ ring, holes: [] }))
  const enclaves = placed.filter((ring) => ring.depth === 1 && isEnclave(ring, otherRings))
  for (const ring of enclaves) {
    polygons.find((polygon) => polygon.ring === ring.parent).holes.push(ring.points)
  }
  return polygons.map(({ ring, holes }) => [ring.points, ...holes])
}

// Grid steps to look for a point inside a ring.
const GRID_STEPS = 16

// Whether a ring holds land of another country: a point inside it lies inside one of `otherRings`.
function isEnclave(ring, otherRings) {
  const point = pointInside(ring)
  return (
    point !== null &&
    otherRings.some((other) => {
      const [west, south, east, north] = other.box
      const [x, y] = point
      return x >= west && x <= east && y >= south && y <= north && contains(other.points, point)
    })
  )
}

// A point inside the ring, looked for on a grid over its box; null for a ring too thin to hold one.
function pointInside(ring) {
  const [west, south, east, north] = ring.box
  for (let row = 1; row < GRID_STEPS; row++) {
    for (let column = 1; column < GRID_STEPS; column++) {
      const point = [west + ((east - west) * column) / GRID_STEPS, south + ((north - south) * row) / GRID_STEPS]
      if (contains(ring.points, point)) {
        return point
      }
    }
  }
  return null
}

function round(coordinates, decimals) {
  return typeof coordinates[0] === 'number'
    ? coordinates.map((value) => Number(value.toFixed(decimals)))
    : coordinates.map((inner) => round(inner, decimals))
}

// Widest span of the boxes, in degrees.
function extent(boxes) {
  const west = Math.min(...boxes.map(([west]) => west))
  const south = Math.min(...boxes.map(([, south]) => south))
  const east = Math.max(...boxes.map(([, , east]) => east))
  const north = Math.max(...boxes.map(([, , , north]) => north))
  return Math.max(east - west, north - south)
}

function overlaps([west, south, east, north], [otherWest, otherSouth, otherEast, otherNorth]) {
  return west <= otherEast && otherWest <= east && south <= otherNorth && otherSouth <= north
}

const naturalEarth = readFeatures(naturalEarthPath)
// Boxes of each country's Natural Earth parts: a part of OpenStreetMap's country away from all of them is a territory
// with a map of its own (France's New Caledonia), which the mask does not need.
const partBoxes = new Map()
for (const { properties, geometry } of naturalEarth) {
  const outerRings = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates).map(
    ([outer]) => outer,
  )
  partBoxes.set(properties.ISO_A2_EH, [...(partBoxes.get(properties.ISO_A2_EH) ?? []), ...outerRings.map(boxOf)])
}
const borders = new Map(readFeatures(bordersPath).map(({ properties, geometry }) => [properties.A3, geometry]))
const allRings = [...borders].flatMap(([source, geometry]) =>
  ringsOf(geometry).map((points) => ({ source, points, box: boxOf(points) })),
)
const ownCodes = new Map(naturalEarth.map(({ properties }) => [properties.ISO_A2_EH, properties.ISO_A3_EH]))
const codes = JSON.parse(readFileSync(COUNTRIES, 'utf8'))
  .features.map((feature) => feature.properties.code)
  .filter((code) => !WITHOUT_MAP.has(code))

mkdirSync(OUTPUT, { recursive: true })
for (const code of codes) {
  let shape = null
  if (!KEEP_NATURAL_EARTH.has(code)) {
    const boxes = partBoxes.get(code)
    const small = extent(boxes) < SMALL_COUNTRY_DEGREES
    const sources = [OWN_CODES[code] ?? ownCodes.get(code), ...(OTHER_PARTS[code] ?? [])]
    const countries = sources.map((source) => {
      const geometry = borders.get(source)
      if (geometry === undefined) {
        throw new Error(`${code}: no OpenStreetMap borders for ${source}`)
      }
      return small ? ringsOf(geometry) : ringsOf(geometry).map((ring) => simplify(ring, TOLERANCE_M))
    })
    const polygons = round(
      polygonsOf(
        countries,
        allRings.filter((ring) => !sources.includes(ring.source)),
      ).filter(([outer]) => boxes.some((box) => overlaps(boxOf(outer), box))),
      small ? SMALL_COUNTRY_DECIMALS : DECIMALS,
    )
    shape =
      polygons.length === 1
        ? { type: 'Polygon', coordinates: polygons[0] }
        : { type: 'MultiPolygon', coordinates: polygons }
  }
  writeFileSync(new URL(`${code}.json`, OUTPUT), JSON.stringify(shape) + '\n')
}
console.log(`${codes.length} country borders written to ${OUTPUT.pathname}`)
