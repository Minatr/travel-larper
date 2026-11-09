import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import {
  type GeoJSONSource,
  MapLibreMap,
  type PointLike,
  setWorkerUrl,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { type RefObject, useEffect, useRef } from 'react'

import {
  EMPTY_SELECTION,
  type GlobeEvent,
  raisedCountries,
  reduceSelection,
} from '../lib/globeSelection.ts'
import {
  COUNTRIES_LAYER,
  COUNTRIES_SOURCE,
  COUNTRIES_URL,
  globeStyle,
  RAISED_SOURCE,
} from '../lib/globeStyle.ts'

// MapLibre finds its worker (the background thread that parses the country
// shapes) next to its own file. Vite moves that file while bundling, so the
// worker is not found: we give MapLibre its URL, which Vite resolves both in
// dev and in the production build.
setWorkerUrl(workerUrl)

/** Initial view: centered on Europe and Africa. */
const INITIAL_CENTER: [number, number] = [10, 25]

/**
 * Initial zoom for a 800 px screen side: the globe then fills about 90 % of
 * it. Measured on the rendered globe; the zoom is scaled from it so that
 * the globe fills the screen whatever its size (see initialZoom).
 */
const REFERENCE_SIDE_PX = 800
const REFERENCE_ZOOM = 2.4

/**
 * Zoom at which the globe fills the smaller side of the container: its
 * height on a computer, its width on a phone. Each zoom level doubles the
 * size of the map, hence the log2.
 */
function initialZoom(container: HTMLElement): number {
  const side = Math.min(container.clientWidth, container.clientHeight)
  return side > 0
    ? REFERENCE_ZOOM + Math.log2(side / REFERENCE_SIDE_PX)
    : REFERENCE_ZOOM
}

/**
 * High-density phone screens can be 3x or more: capping the pixel ratio
 * keeps the globe smooth for a difference hard to see.
 */
const MAX_PIXEL_RATIO = 2

/**
 * How long the pointer must rest on a country before it rises, so that
 * sweeping across the globe recolors countries without making each of them
 * jump. Going back down is immediate.
 */
const LIFT_DELAY_MS = 80

// Touch screens have no hover: without this check, a tap would leave the
// country "hovered" forever, as no mouseleave ever comes.
const HOVER_QUERY = '(hover: hover)'

/** Countries file (public/geo/countries.json), features keyed by ISO code. */
type Countries = FeatureCollection<Polygon | MultiPolygon, { code: string }>

function countryCodeAt(map: MapLibreMap, point: PointLike): string | null {
  const [feature] = map.queryRenderedFeatures(point, {
    layers: [COUNTRIES_LAYER],
  })
  return typeof feature?.id === 'string' ? feature.id : null
}

/**
 * Mounts the interactive globe in `containerRef` and keeps it in sync with
 * the pointer (raised countries). Calls `onSelectCountry` when a country is
 * clicked or tapped.
 *
 * The selection lives in plain variables, not in React state: hovering
 * changes it on every mouse move, and only the map needs to know.
 */
export function useGlobe(
  containerRef: RefObject<HTMLElement | null>,
  onSelectCountry: (code: string) => void,
): void {
  // Latest callback without re-creating the map when it changes.
  const onSelectRef = useRef(onSelectCountry)
  useEffect(() => {
    onSelectRef.current = onSelectCountry
  })

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: globeStyle(),
      center: INITIAL_CENTER,
      zoom: initialZoom(container),
      // No map tiles: Natural Earth is public domain, nothing to credit.
      attributionControl: false,
      pixelRatio: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
    })

    // Loaded once here rather than by MapLibre, to keep each country's shape
    // at hand for the raised layer.
    const download = new AbortController()
    const countriesLoaded = fetch(COUNTRIES_URL, { signal: download.signal })
      .then((response) => response.json() as Promise<Countries>)
      .catch((error: unknown) => {
        if (!download.signal.aborted) {
          console.error('countries failed to load', error)
        }
        return null
      })
    const shapes = new Map<
      string,
      Feature<Polygon | MultiPolygon, { code: string }>
    >()

    let selection = EMPTY_SELECTION
    let shown = new Set<string>()
    let liftTimer: number | undefined
    let pendingPoint: PointLike | null = null
    let frame: number | undefined

    // Puts exactly the raised countries in the small 3D source.
    function show(codes: Set<string>) {
      shown = codes
      const features = [...shown].flatMap((code) => shapes.get(code) ?? [])
      map
        .getSource<GeoJSONSource>(RAISED_SOURCE)
        ?.setData({ type: 'FeatureCollection', features })
    }

    // Lifts every raised country, the hovered one included.
    function showRaised() {
      window.clearTimeout(liftTimer)
      show(raisedCountries(selection))
    }

    // Recolors at once the countries whose state changes. A country going
    // down, or picked with a click, updates the 3D layer right away; one
    // merely hovered rises after a short rest.
    function apply(event: GlobeEvent) {
      const before = raisedCountries(selection)
      selection = reduceSelection(selection, event)
      const after = raisedCountries(selection)
      for (const code of before) {
        if (!after.has(code)) {
          map.setFeatureState(
            { source: COUNTRIES_SOURCE, id: code },
            { raised: false },
          )
        }
      }
      for (const code of after) {
        if (!before.has(code)) {
          map.setFeatureState(
            { source: COUNTRIES_SOURCE, id: code },
            { raised: true },
          )
        }
      }

      if (event.type === 'click') {
        showRaised()
        return
      }
      // Lowers at once the countries left behind, but keeps the newly
      // hovered one flat until the timer: lifting it here too would make
      // every country crossed jump when sweeping from one to the next.
      if ([...shown].some((code) => !after.has(code))) {
        show(new Set([...shown].filter((code) => after.has(code))))
      }
      if ([...after].some((code) => !shown.has(code))) {
        window.clearTimeout(liftTimer)
        liftTimer = window.setTimeout(showRaised, LIFT_DELAY_MS)
      }
    }

    // Mouse moves come faster than the screen refreshes: only the last one
    // of each frame is looked up.
    function onHoverFrame() {
      frame = undefined
      if (pendingPoint === null) {
        return
      }
      const code = countryCodeAt(map, pendingPoint)
      map.getCanvas().style.cursor = code === null ? '' : 'pointer'
      if (code !== selection.hovered) {
        apply({ type: 'hover', code })
      }
    }

    // Sources exist once the style is loaded: countries and pointer
    // handlers are added then.
    map.once('load', () => {
      void countriesLoaded.then((countries) => {
        if (countries === null) {
          return
        }
        for (const feature of countries.features) {
          shapes.set(feature.properties.code, feature)
        }
        map.getSource<GeoJSONSource>(COUNTRIES_SOURCE)?.setData(countries)
      })

      if (window.matchMedia(HOVER_QUERY).matches) {
        map.on('mousemove', (event) => {
          pendingPoint = event.point
          frame ??= window.requestAnimationFrame(onHoverFrame)
        })
        map.on('mouseout', () => {
          pendingPoint = null
          apply({ type: 'hover', code: null })
        })
      }

      map.on('click', (event) => {
        const code = countryCodeAt(map, event.point)
        apply({ type: 'click', code })
        if (code !== null) {
          onSelectRef.current(code)
        }
      })
    })

    return () => {
      download.abort()
      window.clearTimeout(liftTimer)
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame)
      }
      map.remove()
    }
  }, [containerRef])
}
