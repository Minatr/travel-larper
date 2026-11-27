import type { MultiPolygon } from 'geojson'
import { useId, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useScrollEdges } from '../hooks/useScrollEdges.ts'
import { useTerritoryInsetsOpen } from '../hooks/useTerritoryInsetsOpen.ts'
import { useTerritoryTags } from '../hooks/useTerritoryTags.ts'
import type { InsetMap } from '../lib/countryMapData.ts'
import { INSET_LAND_COLOR, SEA_COLOR } from '../lib/countryMapTheme.ts'
import type { Bounds } from '../lib/geo.ts'
import { thumbnailPath } from '../lib/shapePath.ts'
import type { InsetId } from '../lib/territories.ts'
import { cn } from '../lib/utils.ts'

/** Side of the square map the ticket opens with, in pixels; shown smaller on a phone (CSS). */
const THUMBNAIL_SIZE_PX = 88
/** Outline around the land: a tiny island (Azores) still shows as a dot. */
const OUTLINE_PX = 1.5
/** A ticket with rounded notches, on the drawer's tab. */
const TICKET_PATH =
  'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z'
/** A plane seen from above, nose right, before the distance. */
const PLANE_PATH =
  'M15 8c0-.6-.5-1-1-1H9.6L6 1.5H4.5L6.3 7H3L1.8 5.5H.5L1.4 8 .5 10.5h1.3L3 9h3.3l-1.8 5.5H6L9.6 9H14c.5 0 1-.4 1-1z'
/** Delay between two tags turning round, one after the other from the left. */
const TURN_STAGGER_MS = 60

/** Props of {@link TerritoryInsets}. */
export type TerritoryInsetsProps = {
  /** The country's distant territories. */
  insets: InsetMap[]
  /** Inset shown, or null on the mainland. */
  current: InsetId | null
  /** Name of the country, for the mainland's tag. */
  countryName: string
  /** Parts and frame of the mainland, for its tag. */
  mainShape: MultiPolygon
  mainBounds: Bounds
}

/**
 * The passes in a drawer at the bottom left of the map, on a computer, whose tab folds it down to the tab alone (out
 * at first, then as last left). In a row, scrolling sideways when there are too many. On a phone, the passes go in the
 * country's drawer instead (CountryInfoPanel, {@link TerritoryPassList}).
 */
export function TerritoryInsets(props: TerritoryInsetsProps) {
  const { t } = useTranslation()
  const { title, tags } = useTerritoryTags(props)
  const [open, toggle] = useTerritoryInsetsOpen()
  const railId = useId()
  const railRef = useRef<HTMLDivElement>(null)
  const { moreBefore, moreAfter, scrollStep } = useScrollEdges(railRef)
  if (tags.length === 0) {
    return null
  }
  const current = props.current

  return (
    // A drawer of the map's dark, floating like the other panels, clear of the credit. Clicks go through the room
    // beside the tab, to the map and its credit.
    <nav
      aria-label={title}
      className="pointer-events-none absolute bottom-4 left-4 hidden w-max max-w-[calc(100%-6rem)] flex-col items-start drop-shadow-2xl sm:flex"
    >
      {/* The tab, as wide as its content; 44 px high, for a finger. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={railId}
        onClick={toggle}
        className={cn(
          'pointer-events-auto relative flex min-h-11 shrink-0 items-center gap-2.5 rounded-t-xl bg-primary/90 pr-2 pl-4 text-xs font-semibold tracking-widest text-primary-foreground uppercase backdrop-blur-md transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-[3px] focus-visible:outline-ring motion-reduce:transition-none',
          !open && 'rounded-xl',
        )}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-[1.125rem] shrink-0">
          <path d={TICKET_PATH} fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 5v12" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2" />
        </svg>
        {title}
        <span className="grid h-[1.375rem] min-w-[1.375rem] place-items-center rounded-full bg-card px-1 text-[0.6875rem] tracking-normal text-card-foreground">
          {tags.length}
        </span>
        <span className="grid size-7 place-items-center rounded-lg bg-white/8">
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className={cn(
              'size-3 transition-transform duration-300 motion-reduce:transition-none',
              !open && 'rotate-180',
            )}
          >
            <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        {/* The hollow curve joining the tab to the wider drawer below. */}
        {open && (
          <span
            aria-hidden
            className="absolute bottom-0 left-full size-3 bg-[radial-gradient(circle_at_100%_0,transparent_0.7rem,color-mix(in_srgb,var(--primary)_90%,transparent)_0.75rem)]"
          />
        )}
      </button>
      {/* Folds down to nothing when put away, the tab staying. */}
      <div
        className={cn(
          'pointer-events-auto grid w-full rounded-tr-[0.875rem] rounded-b-[0.875rem] bg-primary/90 backdrop-blur-md transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="relative min-h-0 overflow-hidden">
          {/* Room around for the passes, and for one lifting on hover: a scrolling row clips it. */}
          <div
            ref={railRef}
            id={railId}
            inert={!open}
            className="scrollbar-hidden snap-x snap-mandatory scroll-px-6 overflow-x-auto px-6 pt-[1.125rem] pb-[1.625rem]"
          >
            <div className="flex w-max gap-3">
              {/* Keyed by the place shown too: every pass turns round when it changes, its distance with it. */}
              {tags.map(({ id, ...tag }, index) => (
                <Tag key={`${current ?? 'mainland'}:${id}`} turnDelayMs={index * TURN_STAGGER_MS} {...tag} />
              ))}
            </div>
          </div>
          {/* Passes cut off on a side: the edge fades into the drawer, with an arrow to scroll there. */}
          {open && moreBefore && (
            <ScrollHint side="before" label={t('country.previousTerritories')} onClick={() => scrollStep(-1)} />
          )}
          {open && moreAfter && (
            <ScrollHint side="after" label={t('country.nextTerritories')} onClick={() => scrollStep(1)} />
          )}
        </div>
      </div>
    </nav>
  )
}

/** The same passes, one under the other, for the "Territories" tab of the country's drawer on a phone. */
export function TerritoryPassList(props: TerritoryInsetsProps) {
  const { title, tags } = useTerritoryTags(props)
  return (
    <ul aria-label={title} className="flex flex-col gap-2.5 py-1">
      {tags.map(({ id, ...tag }) => (
        <li key={`${props.current ?? 'mainland'}:${id}`} className="flex">
          <Tag turnDelayMs={0} fullWidth {...tag} />
        </li>
      ))}
    </ul>
  )
}

type TagProps = {
  label: string
  distance: string | null
  shape: MultiPolygon
  bounds: Bounds
  search: string
  turnDelayMs: number
  /** As wide as its row (the phone's list), rather than the drawer's fixed width. */
  fullWidth?: boolean
}

// A boarding pass: the territory's outline on the map's sea, then past a tear line where the paper is notched,
// "Destination", its name and how far it is. Hovered or focused, it lifts and its plane takes off. The shadow sits on a
// wrapper: the notches' mask would cut it.
function Tag({ label, distance, shape, bounds, search, turnDelayMs, fullWidth = false }: TagProps) {
  const { t } = useTranslation()
  const path = useMemo(() => thumbnailPath(shape, bounds, THUMBNAIL_SIZE_PX, THUMBNAIL_SIZE_PX), [shape, bounds])
  return (
    <div
      className={cn(
        'group tag-turn flex shrink-0 snap-start drop-shadow-[0_2px_5px_rgb(0_0_0/0.45)] transition-[translate] duration-200 ease-out hover:-translate-y-1 has-focus-visible:-translate-y-1 motion-reduce:transition-none',
        fullWidth && 'w-full drop-shadow-none',
      )}
      style={{ animationDelay: `${turnDelayMs}ms` }}
    >
      <Link
        to={{ search }}
        className={cn(
          'ticket-notches flex min-h-[5.25rem] overflow-hidden rounded-lg text-card-foreground [--ticket-cut:5.25rem] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:min-h-[6.25rem] sm:[--ticket-cut:6.25rem]',
          // On the paper of the country's drawer, a shade darker to stand out.
          fullWidth ? 'w-full bg-card-foreground/7' : 'w-[13.5rem] bg-card sm:w-64',
        )}
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${THUMBNAIL_SIZE_PX} ${THUMBNAIL_SIZE_PX}`}
          // Inset in the paper: on the map's sea, a map running to the edge would melt into it. Its size is fixed, the
          // tear line with it: a long name makes the pass taller, not the map.
          className="m-1 size-[4.75rem] shrink-0 self-center rounded-sm sm:size-[5.75rem]"
          style={{ background: SEA_COLOR }}
        >
          <path
            d={path}
            fill={INSET_LAND_COLOR}
            stroke={INSET_LAND_COLOR}
            strokeWidth={OUTLINE_PX}
            strokeLinejoin="round"
          />
        </svg>
        <span className="flex min-w-0 flex-1 flex-col border-l-2 border-dashed border-card-foreground/25 py-1.5 pr-2 pl-2.5 sm:py-2">
          <span
            aria-hidden
            className="text-[0.5625rem] font-semibold tracking-[0.18em] text-ink uppercase sm:text-[0.625rem]"
          >
            {t('country.destination')}
          </span>
          {/* Whole names, on as many lines as they need (Andaman and Nicobar Islands), broken between words only. */}
          <span className="tag-title mt-0.5 flex-1 text-base leading-tight break-words sm:text-lg">{label}</span>
          {distance !== null && (
            <span className="tag-title flex items-center gap-1 text-xs text-ink sm:text-sm">
              {/* Taking off on hover. */}
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="size-3.5 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:-rotate-12 group-has-focus-visible:translate-x-1 group-has-focus-visible:-translate-y-0.5 group-has-focus-visible:-rotate-12 motion-reduce:transition-none"
              >
                <path d={PLANE_PATH} fill="currentColor" />
              </svg>
              {distance}
            </span>
          )}
        </span>
      </Link>
    </div>
  )
}

type ScrollHintProps = { side: 'before' | 'after'; label: string; onClick: () => void }

// A fade over the drawer's edge, and a round paper button with an arrow pointing to the passes out of sight.
function ScrollHint({ side, label, onClick }: ScrollHintProps) {
  const after = side === 'after'
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-y-0 flex w-14 items-center from-primary/90 to-transparent',
        after ? 'right-0 justify-end bg-linear-to-l pr-2' : 'left-0 justify-start bg-linear-to-r pl-2',
      )}
    >
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="pointer-events-auto grid size-9 place-items-center rounded-full bg-card text-card-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <svg aria-hidden viewBox="0 0 12 12" className={cn('size-3.5', !after && 'rotate-180')}>
          <path d="M4.5 2 8.5 6 4.5 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
