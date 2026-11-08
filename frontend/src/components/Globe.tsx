import 'maplibre-gl/dist/maplibre-gl.css'

import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useGlobe } from '../hooks/useGlobe.ts'

/** Props of {@link Globe}. */
type GlobeProps = {
  /** Called with the ISO code of the country clicked or tapped. */
  onSelectCountry: (code: string) => void
}

/** Interactive globe filling its parent: hover or tap a country to raise it. */
export function Globe({ onSelectCountry }: GlobeProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  useGlobe(containerRef, onSelectCountry)

  return (
    <section aria-label={t('globe.label')} className="absolute inset-0">
      {/*
        The map gets its own element: MapLibre's CSS sets `position: relative`
        on its container, which beats Tailwind's `absolute` (unlayered CSS
        wins over Tailwind's layers) and would collapse the globe to 0 px.
      */}
      <div ref={containerRef} className="h-full w-full" />
    </section>
  )
}
