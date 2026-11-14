import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import {
  countryAnchor,
  facesViewer,
  type LngLat,
} from '../lib/countryAnchor.ts'
import { countryBounds } from '../lib/countryBounds.ts'
import { hasMap } from '../lib/countryCode.ts'
import { type CountryHint, tagLayout } from '../lib/countryTag.ts'
import { markCountry } from '../lib/searchMarker.ts'
import {
  FRAME_PADDING_PX,
  GLOBE_RETURN_MS,
  GLOBE_TRANSITION_MS,
} from '../lib/countryTransition.ts'
import { flyBack, flyIn } from '../lib/globeFlight.ts'
import { type Camera, mercatorCamera } from '../lib/mercatorCamera.ts'
import {
  clickOutcome,
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
import {
  lockRotation,
  MapLibreMap,
  mapPixelRatio,
  UPRIGHT_OPTIONS,
} from '../lib/maplibre.ts'
import type { Countries, Country } from '../models/country.ts'
import { fetchCountries } from '../services/countries.ts'

/** A position on the map's canvas, in pixels, as MapLibre gives it. */
type Point = MapMouseEvent['point']

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

/** Turn of the globe towards a country chosen in the search. */
const SELECT_TURN_MS = 800

/**
 * Gap, in pixels, past which a point does not come back where it was once
 * turned into a place and back: it lies off the globe, in space.
 */
const OFF_GLOBE_PX = 2

// Country under `point`, null over the ocean or in space. MapLibre maps a
// point in space to the globe's edge, which picked the country there.
function countryCodeAt(map: MapLibreMap, point: Point): string | null {
  const back = map.project(map.unproject(point))
  if (Math.hypot(back.x - point.x, back.y - point.y) > OFF_GLOBE_PX) {
    return null
  }
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

/** What the globe shows over the map, for the Globe component to draw. */
export type GlobePointer = {
  /** Country under the mouse, once it rose, and where its tag hangs. */
  hint: CountryHint | null
  /** Mouse: tag of the country found by the search, shown while it lasts. */
  searchedHint: CountryHint | null
  /** Country tapped, or found by the search (panel on a touch screen). */
  picked: string | null
  /** Mouse (hover) rather than touch screen. */
  canHover: boolean
  /**
   * Turns the globe to `code`, centered above `bottomInsetPx`, and pins it:
   * its tag shows with a mouse, its panel on a touch screen.
   */
  selectCountry: (code: string, bottomInsetPx: number) => void
  /** Drops the picked country. */
  closePicked: () => void
  /** Opens the picked country (panel's button, Enter in the search). */
  openPicked: () => void
}

/**
 * Mounts the interactive globe in `containerRef`. With a mouse, hovering
 * raises a country and shows its name, a click flies to it; on a touch
 * screen, a tap picks it and the panel's button flies to it. The country
 * page then loads on top (`onOpenCountry`), and `onLanded` is called when
 * the flight ends. Once the page covers the globe (`countryShown`), the
 * country is lowered; when `countryOpen` turns false, the globe flies back
 * to where it was.
 *
 * The selection lives in plain variables, not React state: it changes on
 * every mouse move, and only the map needs to know. Only the tag shown
 * changes state, once per country.
 */
export function useGlobe(
  containerRef: RefObject<HTMLElement | null>,
  onOpenCountry: (code: string) => void,
  onLanded: () => void,
  countryOpen: boolean,
  countryShown: boolean,
): GlobePointer {
  const [hint, setHint] = useState<CountryHint | null>(null)
  const [searchedHint, setSearchedHint] = useState<CountryHint | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [canHover] = useState(() => window.matchMedia(HOVER_QUERY).matches)
  const selectCountryRef = useRef<GlobePointer['selectCountry']>(() => {})
  const selectCountry = useCallback<GlobePointer['selectCountry']>(
    (code, bottomInsetPx) => selectCountryRef.current(code, bottomInsetPx),
    [],
  )
  const closePickedRef = useRef<() => void>(() => {})
  const closePicked = useCallback(() => closePickedRef.current(), [])
  const openPickedRef = useRef<() => void>(() => {})
  const openPicked = useCallback(() => openPickedRef.current(), [])

  // Latest callback without re-creating the map when it changes.
  const onOpenRef = useRef(onOpenCountry)
  const onLandedRef = useRef(onLanded)
  useEffect(() => {
    onOpenRef.current = onOpenCountry
    onLandedRef.current = onLanded
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
      // Only moved and zoomed: turning it off its axis is of no use.
      ...UPRIGHT_OPTIONS,
    })
    lockRotation(map)

    // Loaded once here rather than by MapLibre, to keep each country's shape
    // at hand for the raised layer.
    let disposed = false
    const countriesLoaded: Promise<Countries | null> = fetchCountries().catch(
      (error: unknown) => {
        console.error('countries failed to load', error)
        return null
      },
    )
    const shapes = new Map<string, Country>()

    let selection = EMPTY_SELECTION
    // Where the globe was when a country opened, to fly back to.
    let viewBeforeOpening: Camera = {
      center: INITIAL_CENTER,
      zoom: initialZoom(container),
    }
    let shown = new Set<string>()
    let liftTimer: number | undefined
    let pendingPoint: Point | null = null
    let frame: number | undefined
    // Country whose tag shows (or is about to), and the timer that shows it
    // with the lift.
    let hint: string | null = null
    let hintTimer: number | undefined
    // Country tapped on a touch screen, shown in the panel.
    let pickedCode: string | null = null
    // Country found by the search, and the point its ring is centered on.
    let searchedCode: string | null = null
    let searchedAnchor: LngLat | null = null
    // Removes the search's ring and spotlight.
    let unmark = () => {}
    // While the globe flies, the pointer neither raises nor opens countries.
    let flying = false
    // While the globe moves (drag, inertia, zoom), no tag shows: it would
    // be laid out mid-move and stay there, off its country.
    let moving = false
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

    // Shows the tag of `code` after the lift delay, or hides it at once. The
    // searched country already has its own tag.
    function showHint(hovered: string | null) {
      const code = hovered === searchedCode ? null : hovered
      if (code === hint) {
        return
      }
      hint = code
      window.clearTimeout(hintTimer)
      setHint(null)
      if (code !== null) {
        hintTimer = window.setTimeout(() => {
          if (moving) {
            hint = null
          } else {
            setHint(hintFor(code))
          }
        }, LIFT_DELAY_MS)
      }
    }

    // Tag hanging from the country's centroid, or from the mouse when the
    // centroid is behind the horizon (Russia seen from the side).
    function hintFor(code: string): CountryHint | null {
      if (pendingPoint === null) {
        return null
      }
      const center = map.getCenter()
      const shape = shapes.get(code)
      const centroid =
        shape === undefined ? null : countryAnchor(shape.geometry)
      const anchor =
        centroid !== null && facesViewer(center.toArray(), centroid)
          ? map.project(centroid)
          : pendingPoint
      return { ...layoutFor(code, anchor), searched: code === searchedCode }
    }

    function layoutFor(code: string, anchor: Point) {
      const { clientWidth, clientHeight } = map.getContainer()
      return {
        code,
        layout: tagLayout(
          anchor,
          map.project(map.getCenter()),
          clientWidth,
          clientHeight,
        ),
      }
    }

    // Marks the searched country, or removes the mark (null).
    function setSearched(code: string | null) {
      const shape = code === null ? undefined : shapes.get(code)
      searchedCode = shape === undefined ? null : code
      searchedAnchor =
        shape === undefined ? null : countryAnchor(shape.geometry)
      unmark()
      unmark =
        searchedCode === null || searchedAnchor === null
          ? () => {}
          : markCountry(map, searchedCode, searchedAnchor)
      placeSearchedTag()
    }

    // Keeps the searched country's tag on it as the globe moves (mouse);
    // hidden behind the horizon and during flights.
    function placeSearchedTag() {
      if (!canHover) {
        return
      }
      const visible =
        searchedCode !== null &&
        searchedAnchor !== null &&
        !flying &&
        facesViewer(map.getCenter().toArray(), searchedAnchor)
      setSearchedHint(
        visible && searchedCode !== null && searchedAnchor !== null
          ? {
              ...layoutFor(searchedCode, map.project(searchedAnchor)),
              searched: true,
            }
          : null,
      )
    }

    // Drops the picked country and the search's pin.
    function unpick() {
      setSearched(null)
      if (canHover) {
        apply({ type: 'click', code: null })
        pickedCode = null
        setPicked(null)
      } else {
        pick(null)
      }
    }

    // Touch screens: raises the tapped country (dims one without a map) and
    // shows it in the panel.
    function pick(code: string | null) {
      const opens = code !== null && hasMap(code)
      apply({ type: 'click', code: opens ? code : null })
      dim(opens ? null : code)
      pickedCode = code
      setPicked(code)
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
      showHint(null)
      setSearched(null)
      pickedCode = null
      setPicked(null)
      viewBeforeOpening = {
        center: map.getCenter().toArray(),
        zoom: map.getZoom(),
      }
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
      onLandedRef.current()
    }

    // Lowered while hidden under the country page, so it does not flash raised
    // on the way back.
    lowerRef.current = () => apply({ type: 'click', code: null })

    openPickedRef.current = () => {
      if (!flying && pickedCode !== null && hasMap(pickedCode)) {
        open(pickedCode)
      }
    }

    closePickedRef.current = unpick

    selectCountryRef.current = (code, bottomInsetPx) => {
      const shape = shapes.get(code)
      if (flying || shape === undefined) {
        return
      }
      if (canHover) {
        dim(null)
        apply({ type: 'click', code })
        pickedCode = code
        setPicked(code)
      } else {
        pick(code)
      }
      showHint(null)
      setSearched(code)
      map.stop()
      map.easeTo({
        center: countryAnchor(shape.geometry),
        offset: [0, -bottomInsetPx / 2],
        duration: SELECT_TURN_MS,
      })
    }

    zoomOutRef.current = () => {
      // Back before the country page showed, the country is still raised.
      lowerRef.current()
      // Escape during the flight in: ends it first, as its end (moveend)
      // marks the globe as landed.
      map.stop()
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
      if (pendingPoint === null || flying || moving) {
        return
      }
      const code = countryCodeAt(map, pendingPoint)
      showHint(code)
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
        if (countries === null || disposed) {
          return
        }
        for (const feature of countries.features) {
          shapes.set(feature.properties.code, feature)
        }
        map.getSource<GeoJSONSource>(COUNTRIES_SOURCE)?.setData(countries)
      })

      if (canHover) {
        map.on('mousemove', (event) => {
          pendingPoint = event.point
          frame ??= window.requestAnimationFrame(onHoverFrame)
        })
        // The tag would drift off its country: hidden until the next move.
        map.on('movestart', () => {
          moving = true
          showHint(null)
        })
        map.on('moveend', () => {
          moving = false
        })
        map.on('resize', () => showHint(null))
        map.on('mouseout', () => {
          pendingPoint = null
          showHint(null)
          dim(null)
          apply({ type: 'hover', code: null })
        })
      }

      map.on('move', placeSearchedTag)
      map.on('resize', placeSearchedTag)

      map.on('click', (event) => {
        if (flying) {
          return
        }
        const outcome = clickOutcome(countryCodeAt(map, event.point), canHover)
        if (outcome.open !== null) {
          apply({ type: 'click', code: outcome.open })
          open(outcome.open)
        } else if (canHover) {
          unpick()
        } else {
          if (outcome.picked !== searchedCode) {
            setSearched(null)
          }
          pick(outcome.picked)
        }
      })
    })

    return () => {
      disposed = true
      unmark()
      window.clearTimeout(liftTimer)
      window.clearTimeout(hintTimer)
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame)
      }
      map.remove()
    }
  }, [containerRef, canHover])

  return {
    hint,
    searchedHint,
    picked,
    canHover,
    selectCountry,
    closePicked,
    openPicked,
  }
}
