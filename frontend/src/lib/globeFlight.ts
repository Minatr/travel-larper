/**
 * Flights of the globe to a country's map and back. On the way in, the globe
 * zooms onto the country, flattens and takes the map's colors, ending on the
 * map's own camera (mercatorCamera.ts): the map then takes over unseen.
 * Each effect is a zoom-based expression, set once per flight (twice for
 * an arc): no code runs on each frame.
 */
import type {
  ExpressionSpecification,
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
import type { Camera } from './mercatorCamera.ts'

/** Share of the zoom range the globe stays round, before flattening. */
const ROUND_SHARE = 0.4

/**
 * Shortest zoom range a flattening reads well over. A flight that changes
 * the zoom less (a large country, opened from about its own zoom) goes
 * through an arc instead: see ARC_DEPTH_LEVELS.
 */
const MIN_FLATTEN_ZOOM_LEVELS = 0.4

/**
 * How far an arc flight zooms out before coming back in. The globe stays
 * round on the way out and flattens on the way in: the blend is set once,
 * at the arc's lowest zoom, where it still reads as the plain globe.
 */
const ARC_DEPTH_LEVELS = 0.5

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

/**
 * Users' ways of moving the map, off during a flight. Right-click rotation
 * (dragRotate) stays off for good (useGlobe).
 */
const INTERACTIONS = [
  'dragPan',
  'scrollZoom',
  'boxZoom',
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
  const round = Math.max(from + (to - from) * ROUND_SHARE, overflowZoom)
  const roundUntil = to - round >= MIN_FLATTEN_ZOOM_LEVELS ? round : from
  if (Math.abs(to - roundUntil) >= MIN_FLATTEN_ZOOM_LEVELS) {
    flatten(map, code, from, roundUntil, to)
    fly(map, camera, durationMs, done)
    return
  }

  // Too little zoom change to flatten along: an arc, round on the way out.
  const lowest = Math.min(from, to) - ARC_DEPTH_LEVELS
  setGlobe(map, overflowZoom)
  lowerRaised(map, from, lowest)
  fly(map, camera, durationMs, done, {
    lowestZoom: lowest,
    atLowest: (zoom) => {
      flatten(map, code, zoom, zoom, to)
      // Already down at the lowest zoom: kept out of sight on the way in.
      map.setLayoutProperty(RAISED_LAYER, 'visibility', 'none')
    },
  })
}

/**
 * Flies back to `camera`: flyIn's blends, still set, run backwards. Then
 * puts the globe's own projection, glow and colors back. After an arc, the
 * way back is an arc too: the globe rounds out on the way out, and gets its
 * own look back at the lowest zoom, before coming back in.
 */
export function flyBack(
  map: MapLibreMap,
  camera: Camera,
  overflowZoom: number,
  durationMs: number,
  done: () => void,
) {
  const from = map.getZoom()
  const ending = () => {
    setGlobe(map, overflowZoom)
    done()
  }
  if (Math.abs(camera.zoom - from) >= MIN_FLATTEN_ZOOM_LEVELS) {
    fly(map, camera, durationMs, ending)
    return
  }
  fly(map, camera, durationMs, ending, {
    lowestZoom: Math.min(from, camera.zoom) - ARC_DEPTH_LEVELS,
    atLowest: () => setGlobe(map, overflowZoom),
  })
}

// Blends the globe into the flat map, from round at zoom `roundUntil` to
// flat at zoom `to`, on a flight starting at zoom `from`.
function flatten(
  map: MapLibreMap,
  code: string,
  from: number,
  roundUntil: number,
  to: number,
) {
  map.setProjection(flattening(roundUntil, to))
  map.setSky(fadingSky(...glowFade(from, roundUntil, to)))
  setFadingColors(map, code, roundUntil, to)
  lowerRaised(map, from, from + (to - from) * LOWER_SHARE)
}

// The globe's own projection, glow, colors and raised country.
function setGlobe(map: MapLibreMap, overflowZoom: number) {
  map.setProjection(GLOBE)
  map.setSky(globeSky(overflowZoom))
  setGlobeColors(map)
  resetRaised(map)
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
  map.setLayoutProperty(RAISED_LAYER, 'visibility', 'visible')
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

/**
 * An arc flight: out to `lowestZoom` and back in, `atLowest` called once
 * with the zoom where it turns back.
 */
type Arc = { lowestZoom: number; atLowest: (zoom: number) => void }

function fly(
  map: MapLibreMap,
  camera: Camera,
  durationMs: number,
  done: () => void,
  arc?: Arc,
) {
  // Ends a flight still on (back during the way in) first: stopping it fires
  // its "moveend", which this flight would otherwise take for its own end.
  map.stop()
  setInteractive(map, false)
  const stopWatching = arc === undefined ? () => {} : watchLowest(map, arc)
  map.once('moveend', () => {
    stopWatching()
    setInteractive(map, true)
    done()
  })
  if (arc === undefined) {
    map.easeTo({ ...camera, duration: durationMs })
  } else {
    map.flyTo({ ...camera, duration: durationMs, minZoom: arc.lowestZoom })
  }
}

// Calls `arc.atLowest` once the zoom starts rising again. Returns the way
// to stop watching, for a flight that ends first (cut short).
function watchLowest(map: MapLibreMap, { atLowest }: Arc): () => void {
  let previous = map.getZoom()
  function onZoom() {
    const zoom = map.getZoom()
    if (zoom > previous) {
      map.off('zoom', onZoom)
      atLowest(zoom)
    } else {
      previous = zoom
    }
  }
  map.on('zoom', onZoom)
  return () => map.off('zoom', onZoom)
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
