/**
 * Which countries of the globe are raised, as a pure function of what the
 * pointer does. Kept apart from the map code so it can be tested without
 * WebGL; useGlobe applies the result to the map.
 */
import { hasMap } from './countryCode.ts'

/** Country under the mouse and country picked with a click or a tap. */
export type GlobeSelection = {
  hovered: string | null
  selected: string | null
}

/** A pointer action on the globe; `code` is null over the ocean. */
export type GlobeEvent =
  | { type: 'hover'; code: string | null }
  | { type: 'click'; code: string | null }

/** Nothing hovered, nothing selected. */
export const EMPTY_SELECTION: GlobeSelection = { hovered: null, selected: null }

/**
 * Next selection after a pointer action. A click picks a country and keeps
 * it until another country or the ocean is clicked.
 */
export function reduceSelection(
  state: GlobeSelection,
  event: GlobeEvent,
): GlobeSelection {
  return event.type === 'hover'
    ? { ...state, hovered: event.code }
    : { ...state, selected: event.code }
}

/** Codes of the countries to show raised. */
export function raisedCountries(state: GlobeSelection): Set<string> {
  return new Set(
    [state.hovered, state.selected].filter((code) => code !== null),
  )
}

/**
 * What a click or tap on `code` (null: the ocean) does: a country to open,
 * and the country picked for the touch panel.
 */
export type ClickOutcome = { open: string | null; picked: string | null }

/**
 * With a mouse (`canHover`), a click opens the country at once. On a touch
 * screen, a tap only picks it: the panel's button opens it, so a stray
 * double tap opens nothing.
 */
export function clickOutcome(
  code: string | null,
  canHover: boolean,
): ClickOutcome {
  if (canHover) {
    return { open: code !== null && hasMap(code) ? code : null, picked: null }
  }
  return { open: null, picked: code }
}
