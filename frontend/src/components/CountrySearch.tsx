import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useCountrySearch } from '../hooks/useCountrySearch.ts'
import { splitOnMatch } from '../lib/countrySearch.ts'
import { cn } from '../lib/utils.ts'
import { HangingLogo } from './HangingLogo.tsx'

/** Props of {@link CountrySearch}. */
type CountrySearchProps = {
  /** Called with the chosen country: the globe turns to it. */
  onSelect: (code: string) => void
  /** Called on Enter again after a choice: opens the country's map. */
  onOpen: () => void
  /** Country picked, if any: the field empties when it goes. */
  selected: string | null
  /** Called when the field gains or loses the focus. */
  onFocusChange: (focused: boolean) => void
  /** Touch screens: closes the keyboard once a country is chosen. */
  blurOnSelect: boolean
  /** Placement, from the globe. */
  className?: string
  /** Out of reach (hidden, or covered by a country page). */
  inert?: boolean
  /** Hangs the app's name from the field (computer). */
  withLogo?: boolean
}

/** Paper search field over the globe, with its result list (combobox). */
export function CountrySearch({
  onSelect,
  onOpen,
  selected,
  onFocusChange,
  blurOnSelect,
  className,
  inert,
  withLogo = false,
}: CountrySearchProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const search = useCountrySearch(
    (code) => {
      onSelect(code)
      if (blurOnSelect) {
        inputRef.current?.blur()
      }
    },
    onOpen,
    selected,
  )
  const optionId = (index: number) => `${listId}-${index}`
  // Nothing to show, not even "no country found", until the names load.
  const showList = search.ready && search.listOpen && search.query.trim() !== ''

  return (
    <div className={cn('isolate drop-shadow-lg', className)} inert={inert}>
      {/* A new one each time the field comes back, so that it swings again. */}
      {withLogo && <HangingLogo key={String(inert)} />}
      {/*
        A luggage tag, like the others: point and eyelet on the left, a small
        printed label. Its cut shape clips outlines: focus shows as an inner
        line in the selection color.
      */}
      <label className="tag-label-left flex min-h-12 cursor-text items-center gap-3 bg-card pr-3 pl-5 text-card-foreground focus-within:shadow-[inset_0_-2px_0_var(--ring)]">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full bg-background ring-2 ring-ink"
        />
        <span className="flex min-w-0 flex-1 flex-col py-1.5">
          <span
            aria-hidden
            className="text-[0.625rem] leading-none font-semibold tracking-[0.18em] text-ink uppercase"
          >
            {t('globe.destination')}
          </span>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label={t('search.label')}
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showList && search.results.length > 0
                ? optionId(search.activeIndex)
                : undefined
            }
            placeholder={t('search.placeholder')}
            autoComplete="off"
            enterKeyHint="search"
            value={search.query}
            onChange={(event) => search.change(event.target.value)}
            onKeyDown={(event) => {
              if (search.press(event.key)) {
                event.preventDefault()
              } else if (event.key === 'Escape') {
                event.currentTarget.blur()
              }
            }}
            onFocus={() => {
              search.prepare()
              onFocusChange(true)
            }}
            onBlur={() => {
              search.closeList()
              onFocusChange(false)
            }}
            className="mt-1 min-w-0 bg-transparent text-base leading-tight outline-none placeholder:text-card-muted-foreground"
          />
        </span>
        <SearchIcon />
      </label>
      <ul
        id={listId}
        role="listbox"
        aria-label={t('search.label')}
        hidden={!showList || search.results.length === 0}
        className="mt-2 overflow-hidden rounded-md bg-card py-1 text-card-foreground"
      >
        {search.results.map((entry, index) => (
          <li
            key={entry.code}
            id={optionId(index)}
            role="option"
            aria-selected={index === search.activeIndex}
            // Keeps the focus in the field, so the click lands.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => search.setActiveIndex(index)}
            onClick={() => search.choose(entry)}
            className={cn(
              'flex min-h-11 cursor-pointer items-center px-3',
              index === search.activeIndex &&
                'bg-selection text-selection-foreground',
            )}
          >
            {entry.alias === undefined ? (
              <HighlightedName name={entry.name} query={search.query} />
            ) : (
              // Found by a common name: shown after the official one.
              <span>
                {entry.name}
                <span className="text-card-muted-foreground">
                  {' · '}
                  <HighlightedName name={entry.alias} query={search.query} />
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
      {showList && search.results.length === 0 && (
        <p
          role="status"
          className="mt-2 rounded-md bg-card px-3 py-3 text-card-muted-foreground"
        >
          {t('search.noResult')}
        </p>
      )}
    </div>
  )
}

// The part of the name matching the query, in bold.
function HighlightedName({ name, query }: { name: string; query: string }) {
  const { before, match, after } = splitOnMatch(name, query)
  return (
    <span>
      {before}
      <strong className="font-bold">{match}</strong>
      {after}
    </span>
  )
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}
