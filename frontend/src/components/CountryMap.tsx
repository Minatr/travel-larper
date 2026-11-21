import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { CountryMapData } from '../lib/countryMapData.ts'
import type { Camera } from '../lib/mercatorCamera.ts'
import type { Bounds } from '../lib/geo.ts'
import { useCountryMap } from '../hooks/useCountryMap.ts'

/** Props of {@link CountryMap}. */
type CountryMapProps = {
  /** Name of the country, for screen readers. */
  name: string
  /** Shapes and framing of the country. */
  data: CountryMapData
  /** Area shown: the mainland or an inset; the map glides there when it changes. */
  view: Bounds
  /** Called once the map is fully drawn. */
  onReady: () => void
  /** Called when the map cannot load. */
  onFailed: () => void
  /** Called with the map's camera once set up and after each move. */
  onMove: (camera: Camera) => void
}

/** Detailed map of a country, filling its parent. */
export function CountryMap({ name, data, view, onReady, onFailed, onMove }: CountryMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  useCountryMap(containerRef, data, view, onReady, onFailed, onMove)

  return (
    <section aria-label={t('country.mapLabel', { name })} className="absolute inset-0">
      {/* Own element for the map: see the same comment in Globe.tsx. */}
      <div ref={containerRef} className="h-full w-full" />
    </section>
  )
}
