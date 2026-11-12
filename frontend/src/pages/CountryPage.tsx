import { type ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useOutletContext, useParams } from 'react-router'

import { CountryMap } from '../components/CountryMap.tsx'
import { PageContainer } from '../components/PageContainer.tsx'
import { useCountry } from '../hooks/useCountry.ts'
import { useReveal } from '../hooks/useReveal.ts'
import { countryName } from '../lib/countryName.ts'
import { type CountryOutletContext, FADE_MS } from '../lib/countryTransition.ts'
import { NotFoundPage } from './NotFoundPage.tsx'

/**
 * Page of a country, `/countries/:code`: its map, above the globe
 * (GlobePage's outlet), invisible until the map is ready.
 */
export function CountryPage() {
  const { t, i18n } = useTranslation()
  const { code = '' } = useParams()
  const country = useCountry(code)
  const { flying, onCountryShown } = useOutletContext<CountryOutletContext>()
  const { visible, loading, failed, onMapReady, onMapFailed } =
    useReveal(flying)
  useEffect(() => {
    if (visible) {
      onCountryShown()
    }
  }, [visible, onCountryShown])

  if (country.kind === 'notFound') {
    return (
      <Overlay visible>
        <NotFoundPage />
      </Overlay>
    )
  }
  if (country.kind === 'unavailable' || failed) {
    return (
      <Overlay visible={!flying}>
        <PageContainer>
          <p>{t('country.unavailable')}</p>
        </PageContainer>
      </Overlay>
    )
  }

  const name = countryName(code, i18n.language)

  return (
    <Overlay visible={visible}>
      {country.kind === 'found' && (
        <CountryMap
          name={name}
          data={country.map}
          onReady={onMapReady}
          onFailed={onMapFailed}
        />
      )}
      {loading && (
        <p
          role="status"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm backdrop-blur-md"
        >
          {t('country.loading')}
        </p>
      )}
      <div className="absolute top-16 right-4 left-4 flex items-center gap-3">
        <Link
          to="/"
          className="shrink-0 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-sm backdrop-blur-md hover:bg-black/60"
        >
          {t('country.backToGlobe')}
        </Link>
        {/*
          A title, not a control: plain text, no glass, so it does not look
          clickable.
        */}
        <h1 className="truncate text-lg font-semibold drop-shadow-md">
          {name}
        </h1>
      </div>
    </Overlay>
  )
}

// Covers the globe. Even invisible, it catches clicks: no second country
// opens during the transition. Its content is inert meanwhile: no click,
// no focus with Tab, nothing read by screen readers.
function Overlay({
  visible,
  children,
}: {
  visible: boolean
  children: ReactNode
}) {
  return (
    <div
      className="absolute inset-0 bg-background"
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      <div inert={!visible} className="absolute inset-0">
        {children}
      </div>
    </div>
  )
}
