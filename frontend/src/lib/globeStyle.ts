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
import type {
  ExpressionSpecification,
  MapOptions,
  SkySpecification,
} from 'maplibre-gl'

// MapLibre's style type, reached through MapOptions: maplibre-gl does not
// export it under its own name.
type GlobeStyle = Exclude<MapOptions['style'], string | undefined>

/** Id of the source of all countries, filled by useGlobe. */
export const COUNTRIES_SOURCE = 'countries'
/** Id of the source holding only the raised countries, filled by useGlobe. */
export const RAISED_SOURCE = 'raised-countries'
/** Id of the flat countries layer, the one queried under the pointer. */
export const COUNTRIES_LAYER = 'countries-fill'
/** Countries in the country map's colors, shown during flights only. */
export const MAP_COLORS_LAYER = 'countries-map-colors'
/** Id of the 3D layer of the raised countries. */
export const RAISED_LAYER = 'countries-raised'
const BORDERS_LAYER = 'countries-borders'
const BACKGROUND_LAYER = 'background'

/**
 * Height of a raised country, in meters. It has to be huge to be seen from
 * globe distance: 120 km lifts it visibly without hiding its neighbours.
 */
export const RAISED_HEIGHT_METERS = 120_000

/** Glow of the atmosphere around the globe, from 0 (none) to 1. */
export const ATMOSPHERE_BLEND = 0.8

/**
 * The glow fades out from this many zoom levels past the globe overflowing
 * the screen, over as many again: that close, MapLibre draws it off the edge.
 */
const ATMOSPHERE_FADE_START_LEVELS = 0.4
const ATMOSPHERE_FADE_LEVELS = 0.6

/** Glow of a globe that overflows the screen from zoom `overflowZoom`. */
export function globeSky(overflowZoom: number): SkySpecification {
  const fadeStart = overflowZoom + ATMOSPHERE_FADE_START_LEVELS
  return {
    'atmosphere-blend': [
      'interpolate',
      ['linear'],
      ['zoom'],
      fadeStart,
      ATMOSPHERE_BLEND,
      fadeStart + ATMOSPHERE_FADE_LEVELS,
      0,
    ],
  }
}

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
const COLORS: {
  ocean: string
  land: Tones
  border: string
  raised: string
  dimmed: string
} = {
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
  dimmed: '#1a3354',
}

// Raised country in the accent color, a hovered country that cannot open
// dimmed, the others in the tone of their color group (1 to 7).
function countryColor(
  raised: string,
  dimmed: string,
  [one, two, three, four, five, six, seven]: Tones,
): ExpressionSpecification {
  return [
    'case',
    ['boolean', ['feature-state', 'raised'], false],
    raised,
    ['boolean', ['feature-state', 'dimmed'], false],
    dimmed,
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

/** Style of the globe, which overflows the screen from zoom `overflowZoom`. */
export function globeStyle(overflowZoom: number): GlobeStyle {
  return {
    version: 8,
    projection: { type: 'globe' },
    sky: globeSky(overflowZoom),
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
        paint: {
          'fill-color': countryColor(COLORS.raised, COLORS.dimmed, COLORS.land),
        },
      },
      {
        id: MAP_COLORS_LAYER,
        type: 'fill',
        source: COUNTRIES_SOURCE,
        layout: { visibility: 'none' },
        paint: { 'fill-opacity': 0 },
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
