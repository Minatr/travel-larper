import type { MultiPolygon } from 'geojson'
import type { ExpressionSpecification } from 'maplibre-gl'
import { type RefObject, useEffect, useRef } from 'react'

import {
  ABOVE_MASK_BORDER_LAYERS,
  ABOVE_MASK_LAYERS,
  COUNTRY_MAP_COLORS,
  COUNTRY_MAP_HIDDEN_LAYERS,
  COUNTRY_LAND_COLOR,
  LAND_BORDER_LAYERS,
  OUTSIDE_LAND_COLOR,
} from '../lib/countryMapTheme.ts'
import { outsideMask } from '../lib/countryMask.ts'
import { FRAME_PADDING_PX, MAP_STYLE_TIMEOUT_MS } from '../lib/countryTransition.ts'
import { lockRotation, MapLibreMap, mapPixelRatio, UPRIGHT_OPTIONS } from '../lib/maplibre.ts'
import type { CountryMapData } from '../lib/countryMapData.ts'
import { type Bounds, FULL_TURN_DEGREES } from '../lib/geo.ts'
import { type Camera, mercatorCamera, mercatorView } from '../lib/mercatorCamera.ts'

/** OpenFreeMap: free vector tiles from OpenStreetMap, no key needed. */
const COUNTRY_MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

/** Layers naming places: cities, regions, countries. */
const PLACE_PREFIX = 'place_'

const MASK_SOURCE = 'outside-country'
const MASK_LAYER = 'outside-country-land'
/**
 * MapLibre's compact credit (a <details> element), and its classes: MapLibre makes it compact, and opens it, on the
 * first resize once the credits are known, then closes it at the first drag only; open, it covers the territories'
 * drawer on a phone. Its "i" button still opens it.
 */
const ATTRIBUTION_SELECTOR = '.maplibregl-ctrl-attrib'
const ATTRIBUTION_OPEN_CLASS = 'maplibregl-compact-show'

const ISLANDS_SOURCE = 'country-shape'
const ISLANDS_LAYER = 'country-islands'

/**
 * The country's coastline, outlined in its land color while zoomed out: the tiles drop small islands there, and an
 * atoll (Kiribati, Maldives) shows as nothing; outlined, it stays a dot of a few pixels. Only the outline: a fill would
 * hide the roads and borders. Faded out as the tiles' coastline, more precise, takes over.
 */
const ISLANDS_FULL_UNTIL_ZOOM = 6
const ISLANDS_GONE_FROM_ZOOM = 9
const ISLANDS_OUTLINE_PX = 2.5

/**
 * Glide from one area to another: faster than MapLibre's default speed (1.2), and zooming out less over the sea than
 * its default curve (1.42; the lower, the less it zooms out).
 */
const GLIDE_SPEED = 4
const GLIDE_CURVE = 1.15

/**
 * Closest zoom, with streets still readable. MapLibre's default, 22, shows a few meters across the screen, where the
 * mask's borders (to within 40 m, 10 m in a small country) would stray far from the tiles'.
 */
const MAX_ZOOM = 17

/** Room to pan around the framed view, as a share of its size. */
const PAN_MARGIN_SHARE = 0.25
/** Zoom levels the user may zoom out past the framed view. */
const ZOOM_OUT_LEVELS = 0.5

/**
 * Mounts a country's detailed map in `containerRef`, framed on `view` (the mainland or an inset). A mask dims the other
 * countries; the sea, land borders and the country's labels stay above it. The view stays around `view`; when it
 * changes, the map glides there. Calls `onReady` once fully drawn, or `onFailed` when its style cannot load
 * (OpenFreeMap down or unreachable), and `onMove` with its camera once set up and after each move.
 */
export function useCountryMap(
  containerRef: RefObject<HTMLElement | null>,
  { shape, mask, labelArea, leftOut }: CountryMapData,
  view: Bounds,
  onReady: () => void,
  onFailed: () => void,
  onMove: (camera: Camera) => void,
): void {
  // Latest callbacks without re-creating the map when they change.
  const onReadyRef = useRef(onReady)
  const onFailedRef = useRef(onFailed)
  const onMoveRef = useRef(onMove)
  useEffect(() => {
    onReadyRef.current = onReady
    onFailedRef.current = onFailed
    onMoveRef.current = onMove
  })
  // The view the map frames, and how to glide to another one: set once the map exists.
  const viewRef = useRef(view)
  const glideRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (viewRef.current !== view) {
      viewRef.current = view
      glideRef.current()
    }
  }, [view])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: COUNTRY_MAP_STYLE,
      // Same camera as the end of the globe's flight.
      ...mercatorCamera(viewRef.current, container.clientWidth, container.clientHeight, FRAME_PADDING_PX),
      // OpenStreetMap's licence requires the credit, behind an "i" button.
      attributionControl: { compact: true },
      maxZoom: MAX_ZOOM,
      pixelRatio: mapPixelRatio(),
      // Only moved and zoomed: turning it is of no use.
      ...UPRIGHT_OPTIONS,
      // Resized by the observer below, which first lifts the limits: with them, a phone turned sideways would be zoomed
      // in by force.
      trackResize: false,
    })
    lockRotation(map)

    // A failure before the style loads leaves the map blank: the style itself failed. Later ones are single tiles,
    // retried by MapLibre.
    let styleLoaded = false
    function failed() {
      if (!styleLoaded) {
        styleLoaded = true
        onFailedRef.current()
      }
    }
    map.on('error', (event) => {
      console.error('country map error', event.error)
      failed()
    })
    const styleTimer = window.setTimeout(failed, MAP_STYLE_TIMEOUT_MS)
    let resizeObserver: ResizeObserver | undefined

    // The framed view of the country at the map's current size, and limits around it that never cut into the view
    // shown.
    function setLimits() {
      const { clientWidth, clientHeight } = map.getContainer()
      // A map hidden or shrunk to nothing (page closing) frames nothing.
      if (clientWidth <= 2 * FRAME_PADDING_PX || clientHeight <= 2 * FRAME_PADDING_PX) {
        return
      }
      const camera = mercatorCamera(viewRef.current, clientWidth, clientHeight, FRAME_PADDING_PX)
      const framed = mercatorView(camera, clientWidth, clientHeight)
      const shown = map.getBounds()
      map.setMaxBounds(
        widen([
          Math.min(framed[0], shown.getWest()),
          Math.min(framed[1], shown.getSouth()),
          Math.max(framed[2], shown.getEast()),
          Math.max(framed[3], shown.getNorth()),
        ]),
      )
      map.setMinZoom(Math.min(camera.zoom - ZOOM_OUT_LEVELS, map.getZoom()))
    }

    // Another view: limits lifted for the glide (it crosses the sea between them), set again on arrival. MapLibre jumps
    // instead of gliding for those who reduce motion.
    glideRef.current = () => {
      const { clientWidth, clientHeight } = map.getContainer()
      map.setMaxBounds(null)
      map.setMinZoom(null)
      map.stop()
      // Before the glide: a jump ends at once.
      map.once('moveend', setLimits)
      map.flyTo({
        ...mercatorCamera(viewRef.current, clientWidth, clientHeight, FRAME_PADDING_PX),
        speed: GLIDE_SPEED,
        curve: GLIDE_CURVE,
      })
    }

    // Set up as soon as the style is known, before any tile is drawn: "load" would wait for the whole first view, drawn
    // raw (seconds for Russia).
    map.once('style.load', () => {
      styleLoaded = true
      window.clearTimeout(styleTimer)
      recolor(map)
      // Added last, so above all; the sea and borders are then moved above it.
      map.addSource(MASK_SOURCE, { type: 'geojson', data: outsideMask(mask, leftOut) })
      map.addLayer({
        id: MASK_LAYER,
        type: 'fill',
        source: MASK_SOURCE,
        paint: { 'fill-color': OUTSIDE_LAND_COLOR },
      })
      for (const layer of ABOVE_MASK_LAYERS) {
        if (map.getLayer(layer) !== undefined) {
          map.moveLayer(layer)
        }
      }
      addIslands(map, shape)
      closeCreditOnceOpened(map)
      showLabelsWithin(map, labelArea)

      // Limits from the framed view, not the country: on a narrow phone the view is taller, and limits smaller than it
      // force a zoom in.
      setLimits()
      resizeObserver = new ResizeObserver(() => {
        map.setMaxBounds(null)
        map.resize()
        setLimits()
      })
      resizeObserver.observe(map.getContainer())
      map.once('idle', () => onReadyRef.current())
      const moved = () => onMoveRef.current({ center: map.getCenter().toArray(), zoom: map.getZoom() })
      moved()
      map.on('moveend', moved)
    })

    return () => {
      window.clearTimeout(styleTimer)
      resizeObserver?.disconnect()
      map.remove()
    }
  }, [containerRef, shape, mask, labelArea, leftOut])
}

function recolor(map: MapLibreMap) {
  for (const [layer, property, color] of COUNTRY_MAP_COLORS) {
    if (map.getLayer(layer) !== undefined) {
      map.setPaintProperty(layer, property, color)
    }
  }
  for (const layer of COUNTRY_MAP_HIDDEN_LAYERS) {
    if (map.getLayer(layer) !== undefined) {
      map.setLayoutProperty(layer, 'visibility', 'none')
    }
  }
  for (const layer of LAND_BORDER_LAYERS) {
    if (map.getLayer(layer) !== undefined) {
      addFilter(map, layer, ['!=', ['get', 'maritime'], 1])
    }
  }
}

// Place names go above the mask, so a name over the coast is not cut, but only inside the country: no Geneva on
// France's map.
function showLabelsWithin(map: MapLibreMap, area: MultiPolygon) {
  const labelLayers = map
    .getStyle()
    .layers.filter((layer) => layer.type === 'symbol' && layer.id.startsWith(PLACE_PREFIX))
  for (const { id } of labelLayers) {
    addFilter(map, id, ['within', area])
    map.moveLayer(id)
  }
}

// Narrows a style layer down to the features that also pass `extra`.
function addFilter(map: MapLibreMap, layer: string, extra: ExpressionSpecification) {
  // The dark style uses expression filters only, which combine with `extra`.
  const filter = map.getFilter(layer) as ExpressionSpecification | null | undefined
  map.setFilter(layer, filter === null || filter === undefined ? extra : ['all', filter, extra])
}

/**
 * Last latitude a flat map shows: MapLibre rejects bounds past the poles, and bounds at the poles break its limits.
 */
const MERCATOR_MAX_LATITUDE = 85.051129
// The view plus a margin, capped at the edge of the map but never inside the view (Russia got stuck at sea). Null when
// the limits would go round the world, which MapLibre cannot keep a view within.
function widen([west, south, east, north]: Bounds): Bounds | null {
  const marginX = (east - west) * PAN_MARGIN_SHARE
  if (east - west + 2 * marginX >= FULL_TURN_DEGREES) {
    return null
  }
  const marginY = (north - south) * PAN_MARGIN_SHARE
  return [
    west - marginX,
    Math.min(south, Math.max(south - marginY, -MERCATOR_MAX_LATITUDE)),
    east + marginX,
    Math.max(north, Math.min(north + marginY, MERCATOR_MAX_LATITUDE)),
  ]
}

// The country's coastline outlined while zoomed out, so that a tiny island stays visible (ISLANDS_* above).
function addIslands(map: MapLibreMap, shape: MultiPolygon) {
  const fading: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['zoom'],
    ISLANDS_FULL_UNTIL_ZOOM,
    1,
    ISLANDS_GONE_FROM_ZOOM,
    0,
  ]
  map.addSource(ISLANDS_SOURCE, { type: 'geojson', data: shape })
  // Over the sea, under the borders (above it, it would cover them) and the names.
  const firstBorder = ABOVE_MASK_BORDER_LAYERS.find((layer) => map.getLayer(layer) !== undefined)
  map.addLayer(
    {
      id: ISLANDS_LAYER,
      type: 'line',
      source: ISLANDS_SOURCE,
      maxzoom: ISLANDS_GONE_FROM_ZOOM,
      paint: { 'line-color': COUNTRY_LAND_COLOR, 'line-width': ISLANDS_OUTLINE_PX, 'line-opacity': fading },
    },
    firstBorder,
  )
  for (const layer of map.getStyle().layers) {
    if (layer.type === 'symbol') {
      map.moveLayer(layer.id)
    }
  }
}

// Closes MapLibre's credit the first time it opens on its own (ATTRIBUTION_* above), whatever triggers it: watched
// rather than tied to an event, as MapLibre opens it on a resize whose timing varies.
function closeCreditOnceOpened(map: MapLibreMap) {
  const credit = map.getContainer().querySelector(ATTRIBUTION_SELECTOR)
  if (credit === null) {
    return
  }
  const close = () => {
    if (!credit.classList.contains(ATTRIBUTION_OPEN_CLASS)) {
      return
    }
    credit.classList.remove(ATTRIBUTION_OPEN_CLASS)
    credit.removeAttribute('open')
    observer.disconnect()
  }
  const observer = new MutationObserver(close)
  observer.observe(credit, { attributes: true, attributeFilter: ['class', 'open'] })
  close()
}
