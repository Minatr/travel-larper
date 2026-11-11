/**
 * Flights of the globe to a country's map and back. On the way in, the globe
 * zooms onto the country, flattens and takes the map's colors, ending on the
 * map's own camera (mercatorCamera.ts): the map then takes over unseen.
 * Each effect is a zoom-based expression, set once per flight: no code runs
 * on each frame.
 */
import type {
  ExpressionSpecification,
  LngLatLike,
  Map as MapLibreMap,
  ProjectionSpecification,
  SkySpecification,
} from 'maplibre-gl'

import { COUNTRY_LAND_COLOR, OUTSIDE_LAND_COLOR } from './countryMapTheme.ts'
import {
  ATMOSPHERE_BLEND,
  globeSky,
  MAP_COLORS_LAYER,
  RAISED_HEIGHT_METERS,
  RAISED_LAYER,
} from './globeStyle.ts'

/** Where a flight ends. */
export type Camera = { center: LngLatLike; zoom: number }

/** Share of the zoom range the globe stays round, before flattening. */
const ROUND_SHARE = 0.4

/** Shortest zoom range a flattening reads well over, once zoomed in. */
const MIN_FLATTEN_ZOOM_LEVELS = 0.4

/** Below this zoom change, the globe only flies: no blend to set. */
const MIN_ZOOM_CHANGE = 0.02

/**
 * Plain globe, as MapLibre's `'globe'` stands for. The short name cannot
 * undo a flight: MapLibre ignores it while another blend is set.
 */
const GLOBE: ProjectionSpecification = {
  type: [
    'interpolate',
    ['linear'],
    ['zoom'],
    11,
    'vertical-perspective',
    12,
    'mercator',
  ],
}

/**
 * Share of the zoom range the glow fades over: it does not follow a
 * flattening globe, so it is gone by the time the globe flattens.
 */
const GLOW_FADE_SHARE = 0.25

/**
 * Share of the zoom range the raised country comes down over. Its 3D shape
 * is then hidden: seen through, it drew a second outline.
 */
const LOWER_SHARE = 0.25

/** Last zoom level MapLibre shows a layer at, by default. */
const MAX_LAYER_ZOOM = 24

/** Users' ways of moving the map, off during a flight. */
const INTERACTIONS = [
  'dragPan',
  'scrollZoom',
  'boxZoom',
  'dragRotate',
  'keyboard',
  'doubleClickZoom',
  'touchZoomRotate',
] as const

/**
 * Flies the globe onto `camera`, framing the country `code`, controls off.
 * The globe overflows the screen from zoom `overflowZoom`.
 */
export function flyIn(
  map: MapLibreMap,
  camera: Camera,
  code: string,
  overflowZoom: number,
  durationMs: number,
  done: () => void,
) {
  const from = map.getZoom()
  const to = camera.zoom
  if (Math.abs(to - from) < MIN_ZOOM_CHANGE) {
    // Clears a blend a flight cut short may have left.
    map.setProjection(GLOBE)
    map.setSky(globeSky(overflowZoom))
    setGlobeColors(map)
    resetRaised(map)
  } else {
    const round = Math.max(from + (to - from) * ROUND_SHARE, overflowZoom)
    const roundUntil = to - round >= MIN_FLATTEN_ZOOM_LEVELS ? round : from
    map.setProjection(flattening(roundUntil, to))
    map.setSky(fadingSky(...glowFade(from, roundUntil, to)))
    setFadingColors(map, code, roundUntil, to)
    lowerRaised(map, from, from + (to - from) * LOWER_SHARE)
  }
  fly(map, camera, durationMs, done)
}

/**
 * Flies back to `camera`: flyIn's blends, still set, run backwards. Then
 * puts the globe's own projection, glow and colors back.
 */
export function flyBack(
  map: MapLibreMap,
  camera: Camera,
  overflowZoom: number,
  durationMs: number,
  done: () => void,
) {
  fly(map, camera, durationMs, () => {
    map.setProjection(GLOBE)
    map.setSky(globeSky(overflowZoom))
    setGlobeColors(map)
    resetRaised(map)
    done()
  })
}

/**
 * Fades the map's colors in over the globe's, from `globeZoom` to `mapZoom`:
 * `code` in the country's color, the rest dimmed. A layer of its own, as
 * MapLibre computes colors depending on zoom and data at whole zooms only.
 */
function setFadingColors(
  map: MapLibreMap,
  code: string,
  globeZoom: number,
  mapZoom: number,
) {
  map.setPaintProperty(MAP_COLORS_LAYER, 'fill-color', [
    'case',
    ['==', ['get', 'code'], code],
    COUNTRY_LAND_COLOR,
    OUTSIDE_LAND_COLOR,
  ])
  map.setPaintProperty(
    MAP_COLORS_LAYER,
    'fill-opacity',
    byZoom(globeZoom, 0, mapZoom, 1),
  )
  map.setLayoutProperty(MAP_COLORS_LAYER, 'visibility', 'visible')
}

function setGlobeColors(map: MapLibreMap) {
  map.setLayoutProperty(MAP_COLORS_LAYER, 'visibility', 'none')
}

/** Lowers the raised country from zoom `from` to `flat`, then hides it. */
function lowerRaised(map: MapLibreMap, from: number, flat: number) {
  map.setPaintProperty(
    RAISED_LAYER,
    'fill-extrusion-height',
    byZoom(from, RAISED_HEIGHT_METERS, flat, 0),
  )
  if (flat > from) {
    map.setLayerZoomRange(RAISED_LAYER, 0, flat)
  } else {
    map.setLayerZoomRange(RAISED_LAYER, flat, MAX_LAYER_ZOOM)
  }
}

function resetRaised(map: MapLibreMap) {
  map.setPaintProperty(
    RAISED_LAYER,
    'fill-extrusion-height',
    RAISED_HEIGHT_METERS,
  )
  map.setLayerZoomRange(RAISED_LAYER, 0, MAX_LAYER_ZOOM)
}

/** `atA` at `zoomA`, `atB` at `zoomB`, stops in increasing order. */
function byZoom(
  zoomA: number,
  atA: number,
  zoomB: number,
  atB: number,
): ExpressionSpecification {
  return zoomA < zoomB
    ? ['interpolate', ['linear'], ['zoom'], zoomA, atA, zoomB, atB]
    : ['interpolate', ['linear'], ['zoom'], zoomB, atB, zoomA, atA]
}

function fly(
  map: MapLibreMap,
  camera: Camera,
  durationMs: number,
  done: () => void,
) {
  setInteractive(map, false)
  map.once('moveend', () => {
    setInteractive(map, true)
    done()
  })
  map.easeTo({ ...camera, duration: durationMs })
}

/** Globe at zoom `round`, flat at zoom `flat`, stops in increasing order. */
function flattening(round: number, flat: number): ProjectionSpecification {
  return round < flat
    ? {
        type: [
          'interpolate',
          ['linear'],
          ['zoom'],
          round,
          'vertical-perspective',
          flat,
          'mercator',
        ],
      }
    : {
        type: [
          'interpolate',
          ['linear'],
          ['zoom'],
          flat,
          'mercator',
          round,
          'vertical-perspective',
        ],
      }
}

/**
 * Zooms the glow fades between: the end of the round part, or the start of
 * the flight when it all flattens (Russia).
 */
function glowFade(
  from: number,
  roundUntil: number,
  to: number,
): [number, number] {
  if (roundUntil === from) {
    return [from, from + (to - from) * GLOW_FADE_SHARE]
  }
  return [roundUntil - (roundUntil - from) * GLOW_FADE_SHARE, roundUntil]
}

/** The glow, full at zoom `round`, gone at zoom `flat`. */
function fadingSky(round: number, flat: number): SkySpecification {
  return {
    'atmosphere-blend':
      round < flat
        ? [
            'interpolate',
            ['linear'],
            ['zoom'],
            round,
            ATMOSPHERE_BLEND,
            flat,
            0,
          ]
        : [
            'interpolate',
            ['linear'],
            ['zoom'],
            flat,
            0,
            round,
            ATMOSPHERE_BLEND,
          ],
  }
}

function setInteractive(map: MapLibreMap, interactive: boolean) {
  for (const name of INTERACTIONS) {
    if (interactive) {
      map[name].enable()
    } else {
      map[name].disable()
    }
  }
}
