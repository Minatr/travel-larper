import { ChevronLeft, CircleAlert } from 'lucide-react'
import { type CSSProperties, type ReactNode, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useClamped } from '../hooks/useClamped.ts'
import { useCountryInfo } from '../hooks/useCountryInfo.ts'
import { useDrawerDrag } from '../hooks/useDrawerDrag.ts'
import { useLiftedCredit } from '../hooks/useLiftedCredit.ts'
import { useMeasuredHeight } from '../hooks/useMeasuredHeight.ts'
import { currencyLabel, languagesLabel } from '../lib/countryFacts.ts'
import { cn } from '../lib/utils.ts'
import type { CountryInfo } from '../models/country.ts'
import { Flag } from './Flag.tsx'

/** Small printed labels, in the ink: decoration, never clickable. */
const PRINTED_LABEL = 'text-[0.625rem] font-semibold tracking-[0.18em] text-ink uppercase'

/** Props of {@link CountryInfoPanel}. */
type CountryInfoPanelProps = {
  /** ISO code of the country, any case. */
  code: string
  /** Name shown: the country's, or "France · Réunion" on a distant territory. */
  title: string
  /** On a phone, the passes of its distant territories, in their own tab; null without any. */
  territories: { count: number; list: ReactNode } | null
}

/**
 * The country's paper panel, over its map: the way back to the globe, its flag and name, then its currencies,
 * languages and Wikivoyage summary. On a computer, top left, as tall as its content. On a phone, a drawer at the
 * bottom, folded down to its name until pulled up (dragged, or its handle tapped), with tabs for its overview and its
 * distant territories; choosing a territory folds it again.
 */
export function CountryInfoPanel({ code, title, territories }: CountryInfoPanelProps) {
  const { t } = useTranslation()
  const state = useCountryInfo(code)
  // Open for one place: the page of another (a territory chosen in the drawer) starts folded.
  const [openFor, setOpenFor] = useState<string | null>(null)
  const open = openFor === title
  const setOpen = (next: boolean) => setOpenFor(next ? title : null)
  const [tab, setTab] = useState<'overview' | 'territories'>('overview')
  const showTerritories = open && territories !== null && tab === 'territories'
  const bodyId = useId()
  const sectionRef = useRef<HTMLElement>(null)
  // The drawer spans the phone's width: the map's credit, which must stay visible, goes above it.
  useLiftedCredit(sectionRef, true)
  const drag = useDrawerDrag(open, setOpen)
  const bodyRef = useRef<HTMLDivElement>(null)
  const bodyHeight = useMeasuredHeight(bodyRef)

  return (
    <section
      ref={sectionRef}
      aria-label={title}
      style={drag.offset === 0 ? undefined : { transform: `translateY(${drag.offset}px)` }}
      className={cn(
        'absolute inset-x-0 bottom-0 z-10 flex max-h-[80dvh] flex-col rounded-t-2xl bg-card pb-[env(safe-area-inset-bottom,0px)] text-card-foreground shadow-[0_-10px_30px_rgb(0_0_0/0.5)]',
        'sm:inset-x-auto sm:top-4 sm:bottom-auto sm:left-4 sm:max-h-[calc(100dvh-2rem)] sm:w-[300px] sm:rounded-xl sm:pb-0 sm:shadow-2xl 2xl:w-[340px]',
        !drag.dragging && 'transition-transform duration-200 ease-out motion-reduce:transition-none',
      )}
    >
      {/* Phone only: the drawer's top follows a finger, up or down; its handle is also a button, tapped or clicked. */}
      <div {...drag.handlers} className="touch-none sm:touch-auto">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? t('countryInfo.fold') : t('countryInfo.unfold')}
          onClick={() => {
            if (drag.isTap()) {
              setOpen(!open)
            }
          }}
          className="relative block h-7 w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:hidden"
        >
          <span
            aria-hidden
            className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-card-foreground/25"
          />
        </button>
        <div className={cn('flex items-center gap-2.5 px-3.5 sm:pt-3', !open && 'pb-3.5 sm:pb-0')}>
          <Link
            to="/"
            aria-label={t('country.backToGlobe')}
            className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <Flag code={code} className="h-[27px] w-9 rounded-[3px]" />
          <h1 className="tag-title line-clamp-2 min-w-0 flex-1 text-[1.75rem] leading-[0.95]">{title}</h1>
        </div>
      </div>
      {open && territories !== null && (
        <div role="tablist" className="mt-3 flex gap-1 border-b border-card-foreground/12 px-3.5 sm:hidden">
          <TabButton selected={tab === 'overview'} controls={bodyId} onSelect={() => setTab('overview')}>
            {t('countryInfo.overview')}
          </TabButton>
          <TabButton selected={tab === 'territories'} controls={bodyId} onSelect={() => setTab('territories')}>
            {/* The space keeps "Distant territories 5" apart for screen readers; the margin draws it. */}
            {t('country.territories', { count: territories.count })}{' '}
            <span className="ml-1 rounded-full bg-card-foreground/8 px-1.5 text-xs">{territories.count}</span>
          </TabButton>
        </div>
      )}
      {/*
        On a phone, its height follows its content's, measured, so that it slides: when the drawer opens or folds, when
        a tab is chosen, when the summary unrolls. Folded, it keeps its content but at no height, out of sight.
      */}
      <div
        id={bodyId}
        role={open && territories !== null ? 'tabpanel' : undefined}
        style={{ '--body-height': `${open ? bodyHeight : 0}px` } as CSSProperties}
        className={cn(
          'scrollbar-paper h-(--body-height) min-h-0 overflow-y-auto transition-[height,visibility] duration-300 ease-out motion-reduce:transition-none sm:visible sm:h-auto',
          !open && 'invisible',
        )}
      >
        <div ref={bodyRef} className="px-3.5 pb-3.5">
          {/* A computer always shows the overview: the territories have their own drawer there. */}
          <div className={cn(showTerritories && 'hidden sm:block')}>
            <Body state={state} />
          </div>
          {showTerritories && <div className="pt-3 sm:hidden">{territories.list}</div>}
        </div>
      </div>
    </section>
  )
}

type TabButtonProps = { selected: boolean; controls: string; onSelect: () => void; children: ReactNode }

function TabButton({ selected, controls, onSelect, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      onClick={onSelect}
      className={cn(
        'relative flex min-h-11 items-center px-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        selected
          ? 'text-card-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-t after:bg-primary'
          : 'text-card-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Body({ state }: { state: ReturnType<typeof useCountryInfo> }) {
  const { t } = useTranslation()
  if (state.kind === 'loading') {
    return (
      <div role="status" aria-label={t('countryInfo.loading')} className="mt-3.5 flex flex-col gap-2">
        <Skeleton className="w-3/5" />
        <Skeleton className="w-2/5" />
        <hr className="my-1.5 border-card-foreground/12" />
        <Skeleton className="w-full" />
        <Skeleton className="w-full" />
        <Skeleton className="w-2/3" />
      </div>
    )
  }
  if (state.kind === 'failed') {
    return (
      <div className="mt-3.5">
        <Notice>{t('countryInfo.unavailable')}</Notice>
      </div>
    )
  }
  return (
    <>
      <Facts info={state.info} />
      <hr className="my-3 border-card-foreground/12" />
      <Summary info={state.info} />
    </>
  )
}

function Facts({ info }: { info: CountryInfo }) {
  const { t, i18n } = useTranslation()
  if (info.currencies.length === 0 && info.languages.length === 0) {
    return null
  }
  return (
    <dl className="mt-3.5 grid grid-cols-[auto_1fr] items-baseline gap-x-3.5 gap-y-1.5">
      {info.currencies.length > 0 && (
        <>
          <dt className={PRINTED_LABEL}>{t('countryInfo.currency', { count: info.currencies.length })}</dt>
          <dd className="text-[0.9375rem] font-semibold">
            {info.currencies.map((currency) => (
              <span key={currency} className="block">
                {currencyLabel(currency, i18n.language)}
              </span>
            ))}
          </dd>
        </>
      )}
      {info.languages.length > 0 && (
        <>
          <dt className={PRINTED_LABEL}>{t('countryInfo.language', { count: info.languages.length })}</dt>
          <dd className="text-[0.9375rem] font-semibold">{languagesLabel(info.languages, i18n.language)}</dd>
        </>
      )}
    </dl>
  )
}

function Summary({ info }: { info: CountryInfo }) {
  const { t } = useTranslation()
  const { summary } = info
  return (
    <div>
      <h2 className={PRINTED_LABEL}>{t('countryInfo.summary')}</h2>
      {summary.status === 'available' && summary.text !== undefined ? (
        <SummaryText text={summary.text} url={summary.url} />
      ) : (
        <Notice>{summary.status === 'missing' ? t('countryInfo.missing') : t('countryInfo.summaryUnavailable')}</Notice>
      )}
    </div>
  )
}

// Cut to three lines; "Read more" unrolls the rest in place, the panel growing with it.
function SummaryText({ text, url }: { text: string; url?: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const clamped = useClamped(textRef, text)
  return (
    <>
      <p ref={textRef} className={cn('mt-1.5 text-sm leading-relaxed', !expanded && 'line-clamp-3')}>
        {text}
      </p>
      {/*
        Stuck to the bottom of the panel's scrolling area: "Show less" and the source stay in sight however long the
        summary (Serbia's, 1,400 characters). Unrolled, the text fades out above it.
      */}
      <div
        className={cn(
          'sticky bottom-0 mt-1 flex flex-wrap items-center justify-between gap-x-3 bg-card text-xs text-card-muted-foreground',
          expanded &&
            'before:pointer-events-none before:absolute before:inset-x-0 before:-top-5 before:h-5 before:bg-linear-to-t before:from-card before:to-transparent',
        )}
      >
        {(clamped || expanded) && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="min-h-9 text-[0.8125rem] font-semibold text-card-foreground underline underline-offset-2"
          >
            {expanded ? t('countryInfo.readLess') : t('countryInfo.readMore')}
          </button>
        )}
        {/* Wikivoyage's licence (CC BY-SA) asks for the source and a link to it. */}
        <span className="ml-auto">
          {url !== undefined && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-card-foreground underline underline-offset-2"
            >
              {t('countryInfo.source')}
            </a>
          )}{' '}
          · CC BY-SA
        </span>
      </div>
    </>
  )
}

function Notice({ children }: { children: string }) {
  return (
    <p className="mt-1.5 flex gap-2.5 rounded-lg bg-card-foreground/6 p-2.5 text-[0.8125rem] text-card-muted-foreground">
      <CircleAlert aria-hidden className="mt-px size-4 shrink-0" />
      {children}
    </p>
  )
}

function Skeleton({ className }: { className: string }) {
  return <span className={cn('block h-3 animate-pulse rounded bg-card-foreground/10', className)} />
}
