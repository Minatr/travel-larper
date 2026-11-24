import type { MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'

import countriesFile from '../../public/geo/countries.json'
import type { Countries } from '../models/country.ts'
import { hasMap } from './countryCode.ts'
import { countryMapData } from './countryMapData.ts'
import { mercatorCamera } from './mercatorCamera.ts'

// Checks every country's real data, as a click on the globe uses it: a bad shape (or a missing one) shows here rather
// than as a map that fails.
const countries = countriesFile as Countries
// Read as text and parsed here, once per file: imported as JSON, Vite turned each of these 24 MB into a module first.
const shapeFiles = import.meta.glob<string>('../../public/geo/countries/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const borderFiles = import.meta.glob<string>('../../public/geo/borders/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const parsed = new Map<string, unknown>()
function shapeOf(code: string) {
  return parse<Polygon | MultiPolygon>(shapeFiles, `../../public/geo/countries/${code}.json`)
}
function bordersOf(code: string) {
  return parse<Polygon | MultiPolygon | null>(borderFiles, `../../public/geo/borders/${code}.json`)
}
// The same object each time, as an import gives. A missing file gives undefined, like a missing key of the glob.
function parse<T>(files: Record<string, string>, path: string): T {
  const text = files[path]
  if (text !== undefined && !parsed.has(path)) {
    parsed.set(path, JSON.parse(text))
  }
  return parsed.get(path) as T
}
const openable = countries.features.filter((country) => hasMap(country.properties.code))

describe('every country of the globe', () => {
  it.each(openable.map((country) => [country.properties.code, country]))('opens %s', (code, country) => {
    const detailed = shapeOf(code)
    const countryBorders = bordersOf(code)
    expect(detailed, 'detailed shape file').toBeDefined()
    expect(countryBorders, 'borders file').toBeDefined()

    const data = countryMapData(code, country.geometry, detailed, countryBorders)

    expect(data, 'parts near the framed area').not.toBeNull()
    expect(data?.labelArea.coordinates.length).toBeGreaterThan(0)
    const camera = mercatorCamera(data?.bounds ?? [0, 0, 0, 0], 390, 844, 48)
    expect(Number.isFinite(camera.zoom)).toBe(true)
  })
})

describe('distant territories', () => {
  function dataOf(code: string) {
    const country = openable.find((feature) => feature.properties.code === code)
    const detailed = shapeOf(code)
    const countryBorders = bordersOf(code)
    return country === undefined ? null : countryMapData(code, country.geometry, detailed, countryBorders)
  }

  it('gives France its four insets, framed apart from the mainland', () => {
    const data = dataOf('FR')

    expect(data?.insets.map(({ inset }) => inset.id)).toEqual(['antilles', 'french-guiana', 'mayotte', 'reunion'])
    const [west, south] = data?.bounds ?? [0, 0]
    expect(west).toBeGreaterThan(-6)
    expect(south).toBeGreaterThan(40)
  })

  it('draws the insets but not the territories left out (Norway: Svalbard yes, Jan Mayen no)', () => {
    const data = dataOf('NO')
    const longitudes = data?.shape.coordinates.flatMap(([ring]) => ring.map(([longitude]) => longitude)) ?? []

    expect(data?.insets.map(({ inset }) => inset.id)).toEqual(['svalbard'])
    // Jan Mayen is the only part of Norway west of the meridian.
    expect(Math.min(...longitudes)).toBeGreaterThan(0)
  })

  it('masks with the borders from OpenStreetMap, or else with the shape (Russia: Crimea in it)', () => {
    expect(dataOf('VA')?.mask).toBe(bordersOf('VA'))
    const russia = dataOf('RU')
    expect(russia?.mask).toBe(russia?.shape)
  })

  it('dims the territories left out, which the borders still hold (Australia: Barrow Island)', () => {
    const barrowIsland = [115.4, -20.78]
    const holds = ([west, south, east, north]: number[]) =>
      barrowIsland[0] > west && barrowIsland[0] < east && barrowIsland[1] > south && barrowIsland[1] < north

    expect(dataOf('AU')?.leftOut.some(holds)).toBe(true)
  })

  it('cuts the enclaves out of the mask: the Vatican and San Marino out of Italy', () => {
    const [mainland] = (dataOf('IT')?.mask as MultiPolygon).coordinates
      .slice()
      .sort((first, second) => second[0].length - first[0].length)

    expect(mainland.length - 1).toBeGreaterThanOrEqual(2)
  })

  it('keeps Alaska in one inset, Aleutians past 180° included', () => {
    const alaska = dataOf('US')?.insets.find(({ inset }) => inset.id === 'alaska')

    expect(alaska?.shape.coordinates.length).toBeGreaterThan(10)
  })
})
