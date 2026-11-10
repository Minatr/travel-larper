/**
 * Look of the globe: a MapLibre style with only the ocean and the countries,
 * no map tiles, so it stays light on phones.
 *
 * Countries are flat (a `fill` layer), recolored through their "raised"
 * feature state, set by useGlobe. Only the raised countries (one or two at a
 * time) are also drawn in 3D, from their own tiny source that useGlobe fills
 * with just their shapes: updating it is near instant, whereas filtering a
 * 3D layer over all countries rebuilt it each time (laggy hover), and
 * extruding all countries at height 0 caused shading artifacts.
 */
import type { MapOptions } from 'maplibre-gl'

// MapLibre's style types, reached through MapOptions: maplibre-gl does not
// export them under their own names.
type GlobeStyle = Exclude<MapOptions['style'], string | undefined>
type Layer = GlobeStyle['layers'][number]
type FillPaint = NonNullable<Extract<Layer, { type: 'fill' }>['paint']>

/** Id of the source of all countries, filled by useGlobe. */
export const COUNTRIES_SOURCE = 'countries'
/** Id of the source holding only the raised countries, filled by useGlobe. */
export const RAISED_SOURCE = 'raised-countries'
/** Id of the flat countries layer, the one queried under the pointer. */
export const COUNTRIES_LAYER = 'countries-fill'
const RAISED_LAYER = 'countries-raised'
const BORDERS_LAYER = 'countries-borders'
const BACKGROUND_LAYER = 'background'

/** Prepared by scripts/build-countries.mjs, served from public/. */
export const COUNTRIES_URL = '/geo/countries.json'

/**
 * Height of a raised country, in meters. It has to be huge to be seen from
 * globe distance: 120 km lifts it visibly without hiding its neighbours.
 */
const RAISED_HEIGHT_METERS = 120_000

/** Glow of the atmosphere around the globe, from 0 (none) to 1. */
const ATMOSPHERE_BLEND = 0.8

const BORDER_WIDTH = 0.6

/** The 7 tones of the countries, one per Natural Earth color group. */
type Tones = [string, string, string, string, string, string, string]

/**
 * "Night blue" palette. MapLibre needs plain colors. Countries take 7 close
 * shades of blue, one per Natural Earth color group (neighbours always
 * differ): the land reads as one surface, with just enough variation to
 * tell countries apart. The raised country glows in the app's turquoise
 * accent (index.css), which stands out from all the blues. Space behind
 * the globe is graphite (--globe-space in index.css): no blue there, so
 * the ocean does not blend into it.
 */
const COLORS: { ocean: string; land: Tones; border: string; raised: string } = {
  ocean: '#0a1a33',
  land: [
    '#2b5080',
    '#2f5788',
    '#284b78',
    '#335d8f',
    '#2d5384',
    '#264872',
    '#376396',
  ],
  border: '#0a1a33',
  raised: '#2dd4bf',
}

// Raised country in the accent color, the others in the tone of their color
// group (1 to 7).
function countryColor(
  raised: string,
  [one, two, three, four, five, six, seven]: Tones,
): FillPaint['fill-color'] {
  return [
    'case',
    ['boolean', ['feature-state', 'raised'], false],
    raised,
    [
      'match',
      ['get', 'colorGroup'],
      1,
      one,
      2,
      two,
      3,
      three,
      4,
      four,
      5,
      five,
      6,
      six,
      7,
      seven,
      one,
    ],
  ]
}

/** Full style of the globe. */
export function globeStyle(): GlobeStyle {
  return {
    version: 8,
    projection: { type: 'globe' },
    sky: { 'atmosphere-blend': ATMOSPHERE_BLEND },
    sources: {
      [COUNTRIES_SOURCE]: {
        type: 'geojson',
        // Empty at first: useGlobe loads the countries and fills it.
        data: { type: 'FeatureCollection', features: [] },
        // Feature ids are the ISO codes, so feature states are set by code.
        promoteId: 'code',
      },
      [RAISED_SOURCE]: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
    },
    layers: [
      {
        id: BACKGROUND_LAYER,
        type: 'background',
        paint: { 'background-color': COLORS.ocean },
      },
      {
        id: COUNTRIES_LAYER,
        type: 'fill',
        source: COUNTRIES_SOURCE,
        paint: { 'fill-color': countryColor(COLORS.raised, COLORS.land) },
      },
      {
        id: BORDERS_LAYER,
        type: 'line',
        source: COUNTRIES_SOURCE,
        paint: { 'line-color': COLORS.border, 'line-width': BORDER_WIDTH },
      },
      {
        id: RAISED_LAYER,
        type: 'fill-extrusion',
        source: RAISED_SOURCE,
        paint: {
          'fill-extrusion-color': COLORS.raised,
          'fill-extrusion-height': RAISED_HEIGHT_METERS,
        },
      },
    ],
  }
}
