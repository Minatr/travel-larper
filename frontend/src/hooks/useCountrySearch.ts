import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { COUNTRY_ALIASES } from '../lib/countryAliases.ts'
import { countryName } from '../lib/countryName.ts'
import { type CountryResult, searchCountries } from '../lib/countrySearch.ts'
import { fetchCountries } from '../services/countries.ts'

/** Enter this soon after a choice is a double press, not a wish to open. */
const ENTER_AGAIN_DELAY_MS = 500

/** State and actions of the country search field (CountrySearch). */
export type CountrySearch = {
  query: string
  results: CountryResult[]
  /** Whether the country names are loaded: until then, no result to show. */
  ready: boolean
  /** Whether the result list shows. */
  listOpen: boolean
  /** Result highlighted by the arrow keys or the mouse. */
  activeIndex: number
  setActiveIndex: (index: number) => void
  /** Loads the country names, on the first focus. */
  prepare: () => void
  change: (query: string) => void
  choose: (entry: CountryResult) => void
  /** Handles a key; returns whether it was used. */
  press: (key: string) => boolean
  closeList: () => void
}

/**
 * Search over the globe's countries. Choosing a result selects it
 * (`onSelect`), Enter again opens it (`onOpen`). The field keeps its name
 * until another country, or none, is `selected`, then empties.
 */
export function useCountrySearch(
  onSelect: (code: string) => void,
  onOpen: () => void,
  selected: string | null,
): CountrySearch {
  const { i18n } = useTranslation()
  const [codes, setCodes] = useState<string[] | null>(null)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)

  // Selection closed or changed outside the search: the name goes.
  const [seenSelected, setSeenSelected] = useState(selected)
  if (selected !== seenSelected) {
    setSeenSelected(selected)
    if (selected !== chosen) {
      setQuery('')
      setChosen(null)
      setListOpen(false)
    }
  }
  // Language switched: a chosen name follows it, typed text stays.
  const [seenLanguage, setSeenLanguage] = useState(i18n.language)
  if (i18n.language !== seenLanguage) {
    setSeenLanguage(i18n.language)
    if (chosen !== null) {
      setQuery(countryName(chosen, i18n.language))
    }
  }
  const loading = useRef(false)
  const chosenAt = useRef(0)

  const results = useMemo(() => {
    if (codes === null) {
      return []
    }
    const aliases = COUNTRY_ALIASES[i18n.resolvedLanguage ?? ''] ?? {}
    const entries = codes.map((code) => ({
      code,
      name: countryName(code, i18n.language),
      aliases: aliases[code],
    }))
    return searchCountries(query, entries, i18n.language)
  }, [codes, query, i18n.language, i18n.resolvedLanguage])

  function prepare() {
    if (codes !== null || loading.current) {
      return
    }
    loading.current = true
    fetchCountries()
      .then((countries) =>
        setCodes(countries.features.map((country) => country.properties.code)),
      )
      .catch((error: unknown) => console.error('search: countries', error))
      .finally(() => {
        loading.current = false
      })
  }

  function change(value: string) {
    setQuery(value)
    setChosen(null)
    setActiveIndex(0)
    setListOpen(value.trim() !== '')
  }

  function choose(entry: CountryResult) {
    setQuery(entry.name)
    setListOpen(false)
    setChosen(entry.code)
    chosenAt.current = Date.now()
    onSelect(entry.code)
  }

  function press(key: string): boolean {
    const count = results.length
    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (count === 0) {
          return false
        }
        setListOpen(true)
        setActiveIndex(
          (index) => (index + (key === 'ArrowDown' ? 1 : count - 1)) % count,
        )
        return true
      case 'Enter':
        if (listOpen && results[activeIndex] !== undefined) {
          choose(results[activeIndex])
          return true
        }
        if (!listOpen && chosen !== null && chosen === selected) {
          if (Date.now() - chosenAt.current >= ENTER_AGAIN_DELAY_MS) {
            onOpen()
          }
          return true
        }
        return false
      case 'Escape':
        if (listOpen) {
          setListOpen(false)
          return true
        }
        return false
      default:
        return false
    }
  }

  return {
    query,
    results,
    ready: codes !== null,
    listOpen,
    activeIndex,
    setActiveIndex,
    prepare,
    change,
    choose,
    press,
    closeList: () => setListOpen(false),
  }
}
