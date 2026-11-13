import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useGlobe } from '../hooks/useGlobe.ts'
import { CountryBubble } from './CountryBubble.tsx'
import { CountryPanel } from './CountryPanel.tsx'

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
 */
export function Globe({
  onOpenCountry,
  onLanded,
  countryOpen,
  countryShown,
}: GlobeProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const { hint, picked, openPicked } = useGlobe(
    containerRef,
    onOpenCountry,
    onLanded,
    countryOpen,
    countryShown,
  )

  return (
    <section
      aria-label={t('globe.label')}
      className="absolute inset-0 overflow-hidden"
    >
      {/*
        The map gets its own element: MapLibre's CSS sets `position: relative`
        on its container, which beats Tailwind's `absolute` (unlayered CSS
        wins over Tailwind's layers) and would collapse the globe to 0 px.
      */}
      <div ref={containerRef} className="h-full w-full" />
      <CountryBubble hint={hint} />
      <CountryPanel code={picked} onOpen={openPicked} />
    </section>
  )
}
