import type { GeoJSONSource, PointLike } from 'maplibre-gl'
import { type RefObject, useEffect, useRef } from 'react'

import { countryBounds } from '../lib/countryBounds.ts'
import { hasMap } from '../lib/countryCode.ts'
import {
  FRAME_PADDING_PX,
  GLOBE_RETURN_MS,
  GLOBE_TRANSITION_MS,
} from '../lib/countryTransition.ts'
import { type Camera, flyBack, flyIn } from '../lib/globeFlight.ts'
import { mercatorCamera } from '../lib/mercatorCamera.ts'
import {
  EMPTY_SELECTION,
  type GlobeEvent,
  raisedCountries,
  reduceSelection,
} from '../lib/globeSelection.ts'
import {
  COUNTRIES_LAYER,
  COUNTRIES_SOURCE,
  globeStyle,
  RAISED_SOURCE,
} from '../lib/globeStyle.ts'
import { MapLibreMap, mapPixelRatio } from '../lib/maplibre.ts'
import type { Countries, Country } from '../models/country.ts'
import { fetchCountries } from '../services/countries.ts'

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
 * Zoom levels past filling the screen at which the globe's edges are off
 * screen: it may flatten from there.
 */
const GLOBE_OVERFLOW_ZOOM_LEVELS = 0.4

function overflowZoom(container: HTMLElement): number {
  return initialZoom(container) + GLOBE_OVERFLOW_ZOOM_LEVELS
}

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
 * How long the pointer must rest on a country before it rises, so that
 * sweeping across the globe recolors countries without making each of them
 * jump. Going back down is immediate.
 */
const LIFT_DELAY_MS = 80

// Touch screens have no hover: without this check, a tap would leave the
// country "hovered" forever, as no mouseleave ever comes.
const HOVER_QUERY = '(hover: hover)'

function countryCodeAt(map: MapLibreMap, point: PointLike): string | null {
  const [feature] = map.queryRenderedFeatures(point, {
    layers: [COUNTRIES_LAYER],
  })
  return typeof feature?.id === 'string' ? feature.id : null
}

// Pointer over a country: a hand where it opens, a "no" sign where it does
// not (Antarctica).
function cursorFor(code: string | null): string {
  if (code === null) {
    return ''
  }
  return hasMap(code) ? 'pointer' : 'not-allowed'
}

/**
 * Mounts the interactive globe in `containerRef`: hovering raises a country,
 * a click calls `onOpenCountry` and flies to it while its page loads on top.
 * Once that page covers the globe (`countryShown`), the country is lowered;
 * when `countryOpen` turns false, the globe flies back to where it was.
 *
 * The selection lives in plain variables, not React state: it changes on
 * every mouse move, and only the map needs to know.
 */
export function useGlobe(
  containerRef: RefObject<HTMLElement | null>,
  onOpenCountry: (code: string) => void,
  countryOpen: boolean,
  countryShown: boolean,
): void {
  // Latest callback without re-creating the map when it changes.
  const onOpenRef = useRef(onOpenCountry)
  useEffect(() => {
    onOpenRef.current = onOpenCountry
  })
  // Set once the map exists.
  const lowerRef = useRef<() => void>(() => {})
  const zoomOutRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (countryShown) {
      lowerRef.current()
    }
  }, [countryShown])
  const wasOpenRef = useRef(countryOpen)
  useEffect(() => {
    if (wasOpenRef.current && !countryOpen) {
      zoomOutRef.current()
    }
    wasOpenRef.current = countryOpen
  }, [countryOpen])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: globeStyle(overflowZoom(container)),
      center: INITIAL_CENTER,
      zoom: initialZoom(container),
      // No map tiles: Natural Earth is public domain, nothing to credit.
      attributionControl: false,
      pixelRatio: mapPixelRatio(),
    })

    // Loaded once here rather than by MapLibre, to keep each country's shape
    // at hand for the raised layer.
    const download = new AbortController()
    const countriesLoaded: Promise<Countries | null> = fetchCountries(
      download.signal,
    ).catch((error: unknown) => {
      if (!download.signal.aborted) {
        console.error('countries failed to load', error)
      }
      return null
    })
    const shapes = new Map<string, Country>()

    let selection = EMPTY_SELECTION
    // Where the globe was when a country opened, to fly back to.
    let viewBeforeOpening: Camera = {
      center: INITIAL_CENTER,
      zoom: initialZoom(container),
    }
    let shown = new Set<string>()
    let liftTimer: number | undefined
    let pendingPoint: PointLike | null = null
    let frame: number | undefined
    // While the globe flies, the pointer neither raises nor opens countries.
    let flying = false
    // Hovered country that cannot open, dimmed so the hover visibly lands.
    let dimmed: string | null = null

    function dim(code: string | null) {
      if (code === dimmed) {
        return
      }
      if (dimmed !== null) {
        map.setFeatureState(
          { source: COUNTRIES_SOURCE, id: dimmed },
          { dimmed: false },
        )
      }
      if (code !== null) {
        map.setFeatureState(
          { source: COUNTRIES_SOURCE, id: code },
          { dimmed: true },
        )
      }
      dimmed = code
    }

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

    // Opens the country page at once, so its map loads during the flight: the
    // page stays invisible until both are done.
    function open(code: string) {
      const shape = shapes.get(code)
      if (shape === undefined) {
        return
      }
      onOpenRef.current(code)
      viewBeforeOpening = { center: map.getCenter(), zoom: map.getZoom() }
      // The map's own camera, so it takes over exactly where the globe stops.
      const { clientWidth, clientHeight } = map.getContainer()
      const camera = mercatorCamera(
        countryBounds(shape.geometry),
        clientWidth,
        clientHeight,
        FRAME_PADDING_PX,
      )
      flying = true
      flyIn(
        map,
        camera,
        code,
        overflowZoom(map.getContainer()),
        GLOBE_TRANSITION_MS,
        landed,
      )
    }

    function landed() {
      flying = false
    }

    // Lowered while hidden under the country page, so it does not flash raised
    // on the way back.
    lowerRef.current = () => apply({ type: 'click', code: null })

    zoomOutRef.current = () => {
      flying = true
      flyBack(
        map,
        viewBeforeOpening,
        overflowZoom(map.getContainer()),
        GLOBE_RETURN_MS,
        landed,
      )
    }

    // Mouse moves come faster than the screen refreshes: only the last one
    // of each frame is looked up.
    function onHoverFrame() {
      frame = undefined
      if (pendingPoint === null || flying) {
        return
      }
      const code = countryCodeAt(map, pendingPoint)
      map.getCanvas().style.cursor = cursorFor(code)
      const opens = code !== null && hasMap(code)
      dim(opens ? null : code)
      const hovered = opens ? code : null
      if (hovered !== selection.hovered) {
        apply({ type: 'hover', code: hovered })
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
          dim(null)
          apply({ type: 'hover', code: null })
        })
      }

      map.on('click', (event) => {
        if (flying) {
          return
        }
        const found = countryCodeAt(map, event.point)
        const code = found !== null && hasMap(found) ? found : null
        apply({ type: 'click', code })
        if (code !== null) {
          open(code)
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
