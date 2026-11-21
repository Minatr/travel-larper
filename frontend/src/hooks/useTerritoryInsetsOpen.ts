import { useState } from 'react'

/** localStorage key holding whether the visitor last left the territory tags out or put away. */
const STORAGE_KEY = 'territoryInsetsOpen'

/** Screens wide enough to leave the tags out at first, as Tailwind's `sm:`; on a phone, they would hide the map. */
const WIDE_SCREEN_QUERY = '(min-width: 40rem)'

/**
 * Whether the territory tags at the bottom of a country's map are out, and the way to put them away or out again. At
 * first, out on a wide screen and put away on a phone; then as the visitor last left them, on this browser.
 */
export function useTerritoryInsetsOpen(): [boolean, () => void] {
  const [open, setOpen] = useState(() => storedOpen() ?? window.matchMedia(WIDE_SCREEN_QUERY).matches)
  function toggle() {
    setOpen(!open)
    storeOpen(!open)
  }
  return [open, toggle]
}

// localStorage can be missing or refuse access (private browsing, blocked storage): then the default applies.
function storedOpen(): boolean | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === null ? null : value === 'true'
  } catch {
    return null
  }
}

function storeOpen(open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(open))
  } catch {
    // Not remembered: the default applies on the next visit.
  }
}
