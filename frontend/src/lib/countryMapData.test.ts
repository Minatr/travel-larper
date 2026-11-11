import type { MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'

import countriesFile from '../../public/geo/countries.json'
import type { Countries } from '../models/country.ts'
import { hasMap } from './countryCode.ts'
import { countryMapData } from './countryMapData.ts'
import { mercatorCamera } from './mercatorCamera.ts'

// Checks every country's real data, as a click on the globe uses it: a bad
// shape (or a missing one) shows here rather than as a map that fails.
const countries = countriesFile as Countries
const shapes = import.meta.glob<Polygon | MultiPolygon>(
  '../../public/geo/countries/*.json',
  { eager: true, import: 'default' },
)
const openable = countries.features.filter((country) =>
  hasMap(country.properties.code),
)

describe('every country of the globe', () => {
  it.each(openable.map((country) => [country.properties.code, country]))(
    'opens %s',
    (code, country) => {
      const detailed = shapes[`../../public/geo/countries/${code}.json`]
      expect(detailed, 'detailed shape file').toBeDefined()

      const data = countryMapData(country.geometry, detailed)

      expect(data, 'parts near the framed area').not.toBeNull()
      expect(data?.labelArea.coordinates.length).toBeGreaterThan(0)
      const camera = mercatorCamera(data?.bounds ?? [0, 0, 0, 0], 390, 844, 48)
      expect(Number.isFinite(camera.zoom)).toBe(true)
    },
  )
})
