import { ChevronLeft } from 'lucide-react'
import { type ReactNode, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router'

import { CountryMap } from '../components/CountryMap.tsx'
import { PageContainer } from '../components/PageContainer.tsx'
import { TerritoryInsets } from '../components/TerritoryInsets.tsx'
import { useCountry } from '../hooks/useCountry.ts'
import { useKeyPress } from '../hooks/useKeyPress.ts'
import { usePlaceName } from '../hooks/usePlaceName.ts'
import { useReveal } from '../hooks/useReveal.ts'
import { countryName } from '../lib/countryName.ts'
import { type CountryOutletContext, FADE_MS } from '../lib/countryTransition.ts'
import { findInset } from '../lib/territories.ts'
import { NotFoundPage } from './NotFoundPage.tsx'

/**
 * Page of a country, `/countries/:code`: its map, above the globe (GlobePage's outlet), invisible until the map is
 * ready. `?territory=french-guiana` shows one of its distant territories instead of the mainland; an unknown one is
 * ignored.
 */
export function CountryPage() {
  const { t, i18n } = useTranslation()
  const { code = '' } = useParams()
  const country = useCountry(code)
  const placeName = usePlaceName()
  const [searchParams] = useSearchParams()
  const inset = findInset(code.toUpperCase(), searchParams.get('territory'))
  const map = country.kind === 'found' ? country.map : null
  // A new array only when the area changes: the map glides on each new one.
  const view = useMemo(
    () => (map === null ? null : (map.insets.find((entry) => entry.inset.id === inset?.id)?.bounds ?? map.bounds)),
    [map, inset?.id],
  )
  const { flying, onCountryShown, onMapMove } = useOutletContext<CountryOutletContext>()
  const { visible, loading, failed, onMapReady, onMapFailed } = useReveal(flying)
  useEffect(() => {
    if (visible) {
      onCountryShown()
    }
  }, [visible, onCountryShown])
  // Escape goes back to the globe, like the back link; during the flight, it undoes a click on the wrong country.
  const navigate = useNavigate()
  useKeyPress('Escape', () => void navigate('/'))

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
  const title = placeName(code, inset?.id ?? null)

  return (
    <Overlay visible={visible}>
      {map !== null && view !== null && (
        <>
          <CountryMap
            name={title}
            data={map}
            view={view}
            onReady={onMapReady}
            onFailed={onMapFailed}
            onMove={onMapMove}
          />
          <TerritoryInsets
            insets={map.insets}
            current={inset?.id ?? null}
            countryName={name}
            mainShape={map.mainShape}
            mainBounds={map.bounds}
          />
        </>
      )}
      {loading && (
        <p
          role="status"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-card px-4 py-2 text-sm text-card-foreground shadow-lg"
        >
          {t('country.loading')}
        </p>
      )}
      {/*
        On the header's row, which leaves it alone on this page (Layout): the back link, then the name on all the rest.
        On a phone the back link is a 44 px arrow, so that a long name fits, on two lines at most.
      */}
      <div className="absolute inset-x-4 top-3 flex items-center gap-3">
        <Link
          to="/"
          aria-label={t('country.backToGlobeLabel')}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] bg-card text-sm font-medium text-card-foreground shadow-lg sm:rounded-md sm:px-3"
        >
          <ChevronLeft aria-hidden className="size-5 sm:hidden" />
          <span aria-hidden className="hidden sm:inline">
            {t('country.backToGlobe')}
          </span>
        </Link>
        {/*
          A title, not a control: plain text, not paper, so it does not look clickable.
        */}
        <h1 className="tag-title line-clamp-2 text-xl leading-none text-balance drop-shadow-md sm:text-2xl">{title}</h1>
      </div>
    </Overlay>
  )
}

// Covers the globe. Even invisible, it catches clicks: no second country opens during the transition. Its content is
// inert meanwhile: no click, no focus with Tab, nothing read by screen readers.
function Overlay({ visible, children }: { visible: boolean; children: ReactNode }) {
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
