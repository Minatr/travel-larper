import { use, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGlobe } from '../hooks/useGlobe.ts'
import { useKeyPress } from '../hooks/useKeyPress.ts'
import type { LngLat } from '../lib/countryAnchor.ts'
import { isShortScreen } from '../lib/screen.ts'
import { skyOffset } from '../lib/starfield.ts'
import { cn } from '../lib/utils.ts'
import { CountryBubble } from './CountryBubble.tsx'
import { CountryPanel } from './CountryPanel.tsx'
import { CountrySearch } from './CountrySearch.tsx'
import { HeaderContext } from './headerContext.ts'
import { Starfield } from './Starfield.tsx'

/** Height of the touch panel, to center a chosen country above it. */
const PANEL_INSET_PX = 200

/** The same on a short screen, where the panel is compact. */
const SHORT_PANEL_INSET_PX = 150

/** Height of the search field at the bottom, with its margin. */
const SEARCH_INSET_PX = 72

/** Props of {@link Globe}. */
type GlobeProps = {
  /** Called with the ISO code of the country clicked or tapped. */
  onOpenCountry: (code: string) => void
  /** Called when a flight of the globe ends. */
  onLanded: () => void
  /** Whether a country page is open above the globe. */
  countryOpen: boolean
  /** Whether that page is visible, covering the globe. */
  countryShown: boolean
}

/**
 * Interactive globe filling its parent: hover a country for its tag, click
 * it to open its map; on a touch screen, tap it, then open it from the panel.
 * A search field finds a country by name.
 */
export function Globe({
  onOpenCountry,
  onLanded,
  countryOpen,
  countryShown,
}: GlobeProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const skyRef = useRef<SVGPatternElement>(null)
  // Set on the element directly: it changes on every frame of a move.
  const moveSky = useCallback((center: LngLat) => {
    const { x, y } = skyOffset(center)
    skyRef.current?.setAttribute('patternTransform', `translate(${x} ${y})`)
  }, [])
  const globe = useGlobe(
    containerRef,
    onOpenCountry,
    onLanded,
    countryOpen,
    countryShown,
    moveSky,
  )
  const [searchFocused, setSearchFocused] = useState(false)
  const phone = !globe.canHover
  const picked = globe.picked !== null
  // Phone: the field sits at the bottom, the panel above it; it goes up
  // in place of the header's labels only while typing.
  const searchAtTop = phone && searchFocused

  const hideHeader = use(HeaderContext)
  useEffect(() => {
    hideHeader(searchAtTop)
    return () => hideHeader(false)
  }, [hideHeader, searchAtTop])

  // While a country is picked: Escape drops it (unless the search used it
  // for its list), Enter opens it, wherever the focus is (the globe after
  // a drag), except on a control that has its own Enter.
  useKeyPress('Escape', globe.closePicked, { enabled: picked })
  useKeyPress('Enter', globe.openPicked, {
    enabled: picked && !phone,
    skipControls: true,
  })

  function bottomInset(): number {
    if (!phone) {
      return 0
    }
    const panel = isShortScreen() ? SHORT_PANEL_INSET_PX : PANEL_INSET_PX
    return panel + SEARCH_INSET_PX
  }

  return (
    <section
      aria-label={t('globe.label')}
      className="absolute inset-0 overflow-hidden"
    >
      <Starfield ref={skyRef} />
      {/*
        The map gets its own element: MapLibre's CSS sets `position: relative`
        on its container, which beats Tailwind's `absolute` (unlayered CSS
        wins over Tailwind's layers) and would collapse the globe to 0 px.
      */}
      <div ref={containerRef} className="h-full w-full" />
      {/* The hovered country's tag comes on top, the searched one fades. */}
      <CountryBubble
        hint={globe.searchedHint}
        onClose={globe.closePicked}
        faded={globe.hint !== null}
      />
      <CountryBubble hint={globe.hint} />
      <CountrySearch
        onSelect={(code) => globe.selectCountry(code, bottomInset())}
        onOpen={globe.openPicked}
        selected={globe.picked}
        onFocusChange={(focused) => {
          setSearchFocused(focused)
          // A new search starts from scratch: the picked country goes.
          if (focused) {
            globe.closePicked()
          }
        }}
        blurOnSelect={phone}
        withLogo={!phone}
        inert={countryOpen}
        className={cn(
          'absolute transition duration-300 ease-out',
          // Placed by its top, 1.5 rem above the bottom: the result list
          // then opens below the field instead of pushing it up.
          phone ? 'inset-x-3 top-[calc(100%-4.5rem)]' : 'top-3 left-4 w-96',
          // From the bottom to the header's row: the screen's height, less
          // the field (3 rem) and its margins (1.5 rem below, 0.75 rem above).
          searchAtTop && '-translate-y-[calc(100dvh-5.25rem)]',
          // A country opens: up and off the screen on a computer, its
          // hanging logo too (12 rem clears both); faded out on a phone.
          countryOpen && (phone ? 'opacity-0' : '-translate-y-48'),
        )}
      />
      {/* After the search, so Tab goes from the field to its button. */}
      <CountryPanel
        code={phone ? globe.picked : null}
        onOpen={globe.openPicked}
        onClose={globe.closePicked}
      />
    </section>
  )
}
