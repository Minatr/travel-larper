import { useState } from 'react'

/** localStorage key holding whether the visitor last left the territory tags out or put away. */
const STORAGE_KEY = 'territoryInsetsOpen'

/**
 * Whether the territory passes' drawer at the bottom of a country's map (on a computer) is out, and the way to put it
 * away or out again. Out at first, then as the visitor last left it, on this browser.
 */
export function useTerritoryInsetsOpen(): [boolean, () => void] {
  const [open, setOpen] = useState(() => storedOpen() ?? true)
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
