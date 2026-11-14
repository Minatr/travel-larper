import type { GeoJSONSource } from 'maplibre-gl'

import type { LngLat } from './countryAnchor.ts'
import {
  MARKER_SOURCE,
  PULSE_LAYER,
  RING_RADIUS_PX,
  SPOTLIGHT_LAYER,
  SPOTLIGHT_OPACITY,
} from './globeStyle.ts'
import type { MapLibreMap } from './maplibre.ts'

/** Pulses going out of the ring when a country is found, and their length. */
const PULSES = 3
const PULSE_MS = 1100

/** Radius a pulse grows to, in pixels. */
const PULSE_END_RADIUS_PX = 56

/** One frame of the pulse: its radius and opacity, or null once over. */
export function pulseFrame(
  elapsedMs: number,
): { radius: number; opacity: number } | null {
  if (elapsedMs >= PULSES * PULSE_MS) {
    return null
  }
  const progress = (elapsedMs % PULSE_MS) / PULSE_MS
  return {
    radius: RING_RADIUS_PX + (PULSE_END_RADIUS_PX - RING_RADIUS_PX) * progress,
    opacity: 1 - progress,
  }
}

/**
 * Marks the country `code` found by the search: a ring at `anchor` sending
 * out a few pulses, and the other countries darkened. Returns the unmarking.
 */
export function markCountry(
  map: MapLibreMap,
  code: string,
  anchor: LngLat,
): () => void {
  map.getSource<GeoJSONSource>(MARKER_SOURCE)?.setData({
    type: 'Point',
    coordinates: anchor,
  })
  // A filter, not a feature state: MapLibre fades a plain opacity, but sets
  // one depending on feature states at once.
  map.setFilter(SPOTLIGHT_LAYER, ['!=', ['get', 'code'], code])
  map.setPaintProperty(SPOTLIGHT_LAYER, 'fill-opacity', SPOTLIGHT_OPACITY)

  const start = performance.now()
  let frame = window.requestAnimationFrame(function pulse(now) {
    const state = pulseFrame(now - start)
    map.setPaintProperty(PULSE_LAYER, 'circle-radius', state?.radius ?? 0)
    map.setPaintProperty(
      PULSE_LAYER,
      'circle-stroke-opacity',
      state?.opacity ?? 0,
    )
    if (state !== null) {
      frame = window.requestAnimationFrame(pulse)
    }
  })

  return () => {
    window.cancelAnimationFrame(frame)
    map.setPaintProperty(PULSE_LAYER, 'circle-stroke-opacity', 0)
    map.getSource<GeoJSONSource>(MARKER_SOURCE)?.setData({
      type: 'FeatureCollection',
      features: [],
    })
    // The filter stays: the country stays lit while the darkening fades.
    map.setPaintProperty(SPOTLIGHT_LAYER, 'fill-opacity', 0)
  }
}
