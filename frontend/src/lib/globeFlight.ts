/**
 * Flights of the globe to a country's map and back. On the way in, the globe zooms onto the country, flattens and takes
 * the map's colors, ending on the map's own camera (mercatorCamera.ts): the map then takes over unseen. On the way
 * back, the reverse, from wherever the page left the globe (an inset, a country opened from its URL).
 * Each effect is a zoom-based expression, set once per flight (twice for an arc): no code runs on each frame.
 */
import type {
  ExpressionSpecification,
  Map as MapLibreMap,
  ProjectionSpecification,
  SkySpecification,
} from 'maplibre-gl'

import type { LngLat } from './countryAnchor.ts'
import { COUNTRY_LAND_COLOR, OUTSIDE_LAND_COLOR } from './countryMapTheme.ts'
import { HALF_TURN_DEGREES } from './geo.ts'
import { ATMOSPHERE_BLEND, globeSky, MAP_COLORS_LAYER, RAISED_HEIGHT_METERS, RAISED_LAYER } from './globeStyle.ts'
import type { Camera } from './mercatorCamera.ts'

/**
 * Zoom from which the globe overflows the screen: as MapLibre counts it at the initial view (`zoom`, for the glow's
 * zoom expression), and in apparent size (`apparentZoom`, for flights, which cross latitudes).
 */
export type GlobeOverflow = { zoom: number; apparentZoom: number }

/**
 * Zoom matching the globe's apparent size. MapLibre draws the globe at the Mercator scale of the center's latitude: at
 * the same zoom, the globe looks 2.5 times larger over Russia (70°) than over the Sahara (25°). Comparing flights by
 * their raw zoom took Russia's (2 → 1.8, yet a zoom-in) for a standstill.
 */
export function apparentZoom(zoom: number, latitude: number): number {
  return zoom - Math.log2(Math.cos((latitude * Math.PI) / HALF_TURN_DEGREES))
}

/** The zoom MapLibre needs at `latitude` for the apparent size `apparent`, the reverse of apparentZoom. */
export function zoomForApparent(apparent: number, latitude: number): number {
  return apparent + Math.log2(Math.cos((latitude * Math.PI) / HALF_TURN_DEGREES))
}

/** Share of the zoom range the globe stays round, before flattening. */
const ROUND_SHARE = 0.4

/**
 * Shortest zoom range a flattening reads well over. A flight that changes the zoom less (a large country, opened from
 * about its own zoom) goes through an arc instead: see ARC_DEPTH_LEVELS.
 */
const MIN_FLATTEN_ZOOM_LEVELS = 0.4

/**
 * How far an arc flight zooms out before coming back in. The globe stays round on the way out and flattens on the way
 * in (or the reverse, on the way back): the blend changes once, at the arc's lowest zoom, where it reads as the plain
 * globe.
 */
const ARC_DEPTH_LEVELS = 0.5

/**
 * Smallest change of raw zoom a blend can spread over: the zoom expression needs two distinct stops. Russia's flight
 * changes it by only 0.2, but over most of the flight, as the latitude changes.
 */
const MIN_BLEND_ZOOM_GAP = 0.05

/** Share of an arc flight's duration spent zooming out (and moving), the rest zooming back in. */
const ARC_OUT_SHARE = 0.5

/** Zoom gap under which a two-leg flight's first leg counts as finished rather than cut short. */
const LEG_END_TOLERANCE_LEVELS = 0.01

/**
 * Plain globe, as MapLibre's `'globe'` stands for. The short name cannot undo a flight: MapLibre ignores it while
 * another blend is set.
 */
const GLOBE: ProjectionSpecification = {
  type: ['interpolate', ['linear'], ['zoom'], 11, 'vertical-perspective', 12, 'mercator'],
}

/**
 * Share of the zoom range the glow fades over: it does not follow a flattening globe, so it is gone by the time the
 * globe flattens.
 */
const GLOW_FADE_SHARE = 0.25

/**
 * Share of the zoom range the raised country comes down over. Its 3D shape is then hidden: seen through, it drew a
 * second outline.
 */
const LOWER_SHARE = 0.25

/** Last zoom level MapLibre shows a layer at, by default. */
const MAX_LAYER_ZOOM = 24

/**
 * Users' ways of moving the map, off during a flight. Right-click rotation (dragRotate) stays off for good (useGlobe).
 */
const INTERACTIONS = ['dragPan', 'scrollZoom', 'boxZoom', 'keyboard', 'doubleClickZoom', 'touchZoomRotate'] as const

/**
 * Flies the globe onto `camera`, framing the country `code`, controls off. Shares and thresholds are worked out on the
 * apparent zoom, then turned into the raw zooms the blends follow, assuming both move alike along the flight.
 */
export function flyIn(
  map: MapLibreMap,
  camera: Camera,
  code: string,
  overflow: GlobeOverflow,
  durationMs: number,
  done: () => void,
) {
  const from = map.getZoom()
  const to = camera.zoom
  const start = apparentZoom(from, map.getCenter().lat)
  const end = apparentZoom(to, camera.center[1])
  if (Math.abs(end - start) >= MIN_FLATTEN_ZOOM_LEVELS && Math.abs(to - from) >= MIN_BLEND_ZOOM_GAP) {
    flatten(map, code, from, from + (to - from) * roundShare(start, end, overflow), to)
    fly(map, camera, durationMs, done)
    return
  }

  // Too little zoom change to flatten along: an arc, round on the way out.
  const lowest = zoomForApparent(Math.min(start, end) - ARC_DEPTH_LEVELS, camera.center[1])
  setGlobe(map, overflow.zoom)
  lowerRaised(map, from, lowest)
  fly(map, camera, durationMs, done, {
    camera: { center: camera.center, zoom: lowest },
    share: ARC_OUT_SHARE,
    between: () => {
      flatten(map, code, lowest, lowest, to)
      // Already down at the lowest zoom: kept out of sight on the way in.
      map.setLayoutProperty(RAISED_LAYER, 'visibility', 'none')
    },
  })
}

// Share of the way the globe stays round, from apparent zoom `start` to `end`: until it overflows the screen, or
// flattening all along when that leaves too little. Zooming out (from a small country to a larger one, after coming
// back close to it), the globe overflows the screen all along: flattening all along too, rather than an arc zooming out
// past the country before coming back in.
function roundShare(start: number, end: number, overflow: GlobeOverflow): number {
  if (end < start) {
    return 0
  }
  const round = Math.max(start + (end - start) * ROUND_SHARE, overflow.apparentZoom)
  return end - round >= MIN_FLATTEN_ZOOM_LEVELS ? (round - start) / (end - start) : 0
}

/**
 * Flies back from the map of `code` to `camera`, then puts the globe's own projection, glow and colors back. Two legs:
 * backing away on the spot while the globe rounds out, then the turn to `camera` on the plain globe. In one go, the
 * blends, which follow the zoom, went astray: crossing latitudes, MapLibre's zoom wanders (Canada's rose from 1.7 to
 * 2.9 on its way to 2), or hardly moves (Greenland's, which the globe shrinks by the latitude alone). The first leg
 * speeds up and the second slows down, so the speed carries over the joint. Without `code` (the globe never flew), a
 * plain flight.
 */
export function flyBack(
  map: MapLibreMap,
  camera: Camera,
  code: string | null,
  overflow: GlobeOverflow,
  durationMs: number,
  done: () => void,
) {
  const ending = () => {
    setGlobe(map, overflow.zoom)
    done()
  }
  if (code === null) {
    fly(map, camera, durationMs, ending)
    return
  }
  const from = map.getZoom()
  const latitude = map.getCenter().lat
  const start = apparentZoom(from, latitude)
  const end = apparentZoom(camera.zoom, camera.center[1])
  // Round once the globe fits the screen again, or after ROUND_SHARE of the way out, whichever comes later.
  const round = Math.max(end + (start - end) * ROUND_SHARE, overflow.apparentZoom)
  const backing = start - round
  if (backing < MIN_BLEND_ZOOM_GAP) {
    setGlobe(map, overflow.zoom)
    fly(map, camera, durationMs, ending)
    return
  }
  const roundZoom = zoomForApparent(round, latitude)
  roundOut(map, code, roundZoom, from)
  fly(map, camera, durationMs, ending, {
    camera: { zoom: roundZoom },
    share: backing / (backing + Math.abs(round - end)),
    between: () => setGlobe(map, overflow.zoom),
    smooth: true,
  })
}

// Blends the globe into the flat map, from round at zoom `roundUntil` to flat at zoom `to`, on a flight starting at
// zoom `from`.
function flatten(map: MapLibreMap, code: string, from: number, roundUntil: number, to: number) {
  map.setProjection(flattening(roundUntil, to))
  map.setSky(fadingSky(...glowFade(from, roundUntil, to)))
  setFadingColors(map, code, roundUntil, to)
  lowerRaised(map, from, from + (to - from) * LOWER_SHARE)
}

// Rounds the flat map of `code` back into the globe: flat at zoom `flat`, where the flight starts, round from zoom
// `round`. The glow comes back over the last quarter, when the globe is nearly round.
function roundOut(map: MapLibreMap, code: string, round: number, flat: number) {
  map.setProjection(flattening(round, flat))
  map.setSky(fadingSky(round, round + (flat - round) * GLOW_FADE_SHARE))
  setFadingColors(map, code, round, flat)
}

// The globe's own projection, glow, colors and raised country.
function setGlobe(map: MapLibreMap, overflowZoom: number) {
  map.setProjection(GLOBE)
  map.setSky(globeSky(overflowZoom))
  setGlobeColors(map)
  resetRaised(map)
}

/**
 * Fades the map's colors in over the globe's, from `globeZoom` to `mapZoom`: `code` in the country's color, the rest
 * dimmed. A layer of its own, as MapLibre computes colors depending on zoom and data at whole zooms only.
 */
function setFadingColors(map: MapLibreMap, code: string, globeZoom: number, mapZoom: number) {
  map.setPaintProperty(MAP_COLORS_LAYER, 'fill-color', [
    'case',
    ['==', ['get', 'code'], code],
    COUNTRY_LAND_COLOR,
    OUTSIDE_LAND_COLOR,
  ])
  map.setPaintProperty(MAP_COLORS_LAYER, 'fill-opacity', byZoom(globeZoom, 0, mapZoom, 1))
  map.setLayoutProperty(MAP_COLORS_LAYER, 'visibility', 'visible')
}

function setGlobeColors(map: MapLibreMap) {
  map.setLayoutProperty(MAP_COLORS_LAYER, 'visibility', 'none')
}

/** Lowers the raised country from zoom `from` to `flat`, then hides it. */
function lowerRaised(map: MapLibreMap, from: number, flat: number) {
  map.setPaintProperty(RAISED_LAYER, 'fill-extrusion-height', byZoom(from, RAISED_HEIGHT_METERS, flat, 0))
  if (flat > from) {
    map.setLayerZoomRange(RAISED_LAYER, 0, flat)
  } else {
    map.setLayerZoomRange(RAISED_LAYER, flat, MAX_LAYER_ZOOM)
  }
}

function resetRaised(map: MapLibreMap) {
  map.setLayoutProperty(RAISED_LAYER, 'visibility', 'visible')
  map.setPaintProperty(RAISED_LAYER, 'fill-extrusion-height', RAISED_HEIGHT_METERS)
  map.setLayerZoomRange(RAISED_LAYER, 0, MAX_LAYER_ZOOM)
}

/** `atA` at `zoomA`, `atB` at `zoomB`, stops in increasing order. */
function byZoom(zoomA: number, atA: number, zoomB: number, atB: number): ExpressionSpecification {
  return zoomA < zoomB
    ? ['interpolate', ['linear'], ['zoom'], zoomA, atA, zoomB, atB]
    : ['interpolate', ['linear'], ['zoom'], zoomB, atB, zoomA, atA]
}

/**
 * The first leg of a two-leg flight: to `camera` (the center kept when left out) over `share` of the duration, then
 * `between` called once. `smooth`: speeding up, then slowing down, so the speed carries over the joint; otherwise each
 * leg starts and ends slowly (an arc, which turns back there anyway).
 */
type FirstLeg = { camera: { center?: LngLat; zoom: number }; share: number; between: () => void; smooth?: boolean }

function fly(map: MapLibreMap, camera: Camera, durationMs: number, done: () => void, first?: FirstLeg) {
  // Ends a flight still on (back during the way in) first: stopping it fires its "moveend", which this flight would
  // otherwise take for its own end.
  map.stop()
  setInteractive(map, false)
  const land = () => {
    setInteractive(map, true)
    done()
  }
  if (first === undefined) {
    map.once('moveend', land)
    map.easeTo({ ...camera, duration: durationMs })
    return
  }

  // Two easeTo rather than one flyTo: the turning point of a flyTo can only be guessed from its zoom events, which the
  // globe's own zoom changes with latitude throw off (Russia's flight never flattened).
  const firstMs = durationMs * first.share
  map.once('moveend', () => {
    // Cut short during the first leg: the flight ends there.
    if (Math.abs(map.getZoom() - first.camera.zoom) > LEG_END_TOLERANCE_LEVELS) {
      land()
      return
    }
    first.between()
    map.once('moveend', land)
    map.easeTo({ ...camera, duration: durationMs - firstMs, ...(first.smooth === true ? { easing: easeOut } : {}) })
  })
  map.easeTo({ ...first.camera, duration: firstMs, ...(first.smooth === true ? { easing: easeIn } : {}) })
}

function easeIn(progress: number): number {
  return progress * progress
}

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 2
}

/** Globe at zoom `round`, flat at zoom `flat`, stops in increasing order. */
function flattening(round: number, flat: number): ProjectionSpecification {
  return round < flat
    ? {
        type: ['interpolate', ['linear'], ['zoom'], round, 'vertical-perspective', flat, 'mercator'],
      }
    : {
        type: ['interpolate', ['linear'], ['zoom'], flat, 'mercator', round, 'vertical-perspective'],
      }
}

/**
 * Zooms the glow fades between: the end of the round part, or the start of the flight when it all flattens (Russia).
 */
function glowFade(from: number, roundUntil: number, to: number): [number, number] {
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
        ? ['interpolate', ['linear'], ['zoom'], round, ATMOSPHERE_BLEND, flat, 0]
        : ['interpolate', ['linear'], ['zoom'], flat, 0, round, ATMOSPHERE_BLEND],
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
