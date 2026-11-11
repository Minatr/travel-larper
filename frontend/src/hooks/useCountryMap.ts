import type { MultiPolygon } from 'geojson'
import { type ExpressionSpecification, LngLatBounds } from 'maplibre-gl'
import { type RefObject, useEffect, useRef } from 'react'

import {
  ABOVE_MASK_LAYERS,
  COUNTRY_MAP_COLORS,
  COUNTRY_MAP_HIDDEN_LAYERS,
  LAND_BORDER_LAYERS,
  OUTSIDE_LAND_COLOR,
} from '../lib/countryMapTheme.ts'
import { outsideMask } from '../lib/countryMask.ts'
import { FRAME_PADDING_PX } from '../lib/countryTransition.ts'
import { MapLibreMap, mapPixelRatio } from '../lib/maplibre.ts'
import { mercatorCamera } from '../lib/mercatorCamera.ts'
import type { CountryMapData } from '../lib/countryMapData.ts'

/** OpenFreeMap: free vector tiles from OpenStreetMap, no key needed. */
const COUNTRY_MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

/** Layers naming places: cities, regions, countries. */
const PLACE_PREFIX = 'place_'

const MASK_SOURCE = 'outside-country'
const MASK_LAYER = 'outside-country-land'

/** Room to pan around the framed view, as a share of its size. */
const PAN_MARGIN_SHARE = 0.25
/** Zoom levels the user may zoom out past the framed view. */
const ZOOM_OUT_LEVELS = 0.5

/**
 * Mounts a country's detailed map in `containerRef`. A mask dims the other
 * countries; the sea, land borders and the country's labels stay above it.
 * The view stays around the country. Calls `onReady` once fully drawn.
 */
export function useCountryMap(
  containerRef: RefObject<HTMLElement | null>,
  { shape, labelArea, bounds }: CountryMapData,
  onReady: () => void,
): void {
  // Latest callback without re-creating the map when it changes.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  })

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: COUNTRY_MAP_STYLE,
      // Same camera as the end of the globe's flight.
      ...mercatorCamera(
        bounds,
        container.clientWidth,
        container.clientHeight,
        FRAME_PADDING_PX,
      ),
      // OpenStreetMap's licence requires the credit, behind an "i" button.
      attributionControl: { compact: true },
      pixelRatio: mapPixelRatio(),
    })

    // Set up as soon as the style is known, before any tile is drawn: "load"
    // would wait for the whole first view, drawn raw (seconds for Russia).
    map.once('style.load', () => {
      recolor(map)
      // Added last, so above all; the sea and borders are then moved above it.
      map.addSource(MASK_SOURCE, { type: 'geojson', data: outsideMask(shape) })
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
      showLabelsWithin(map, labelArea)

      // Limits from the framed view, not the country: on a narrow phone the
      // view is taller, and limits smaller than it force a zoom in.
      const limits = widen(map.getBounds())
      if (limits !== null) {
        map.setMaxBounds(limits)
      }
      map.setMinZoom(map.getZoom() - ZOOM_OUT_LEVELS)
      map.once('idle', () => onReadyRef.current())
    })

    return () => map.remove()
  }, [containerRef, shape, labelArea, bounds])
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

// Place names go above the mask, so a name over the coast is not cut, but
// only inside the country: no Geneva on France's map.
function showLabelsWithin(map: MapLibreMap, area: MultiPolygon) {
  const labelLayers = map
    .getStyle()
    .layers.filter(
      (layer) => layer.type === 'symbol' && layer.id.startsWith(PLACE_PREFIX),
    )
  for (const { id } of labelLayers) {
    addFilter(map, id, ['within', area])
    map.moveLayer(id)
  }
}

// Narrows a style layer down to the features that also pass `extra`.
function addFilter(
  map: MapLibreMap,
  layer: string,
  extra: ExpressionSpecification,
) {
  // The dark style uses expression filters only, which combine with `extra`.
  const filter = map.getFilter(layer) as
    ExpressionSpecification | null | undefined
  map.setFilter(
    layer,
    filter === null || filter === undefined ? extra : ['all', filter, extra],
  )
}

/**
 * Last latitude a flat map shows: MapLibre rejects bounds past the poles,
 * and bounds at the poles break its limits.
 */
const MERCATOR_MAX_LATITUDE = 85.051129
const FULL_TURN_DEGREES = 360

// The view plus a margin, capped at the edge of the map but never inside
// the view (Russia got stuck at sea). Null when the limits would go round
// the world, which MapLibre cannot keep a view within.
function widen(view: LngLatBounds): LngLatBounds | null {
  const marginX = (view.getEast() - view.getWest()) * PAN_MARGIN_SHARE
  if (view.getEast() - view.getWest() + 2 * marginX >= FULL_TURN_DEGREES) {
    return null
  }
  const marginY = (view.getNorth() - view.getSouth()) * PAN_MARGIN_SHARE
  const south = Math.min(
    view.getSouth(),
    Math.max(view.getSouth() - marginY, -MERCATOR_MAX_LATITUDE),
  )
  const north = Math.max(
    view.getNorth(),
    Math.min(view.getNorth() + marginY, MERCATOR_MAX_LATITUDE),
  )
  return new LngLatBounds(
    [view.getWest() - marginX, south],
    [view.getEast() + marginX, north],
  )
}
