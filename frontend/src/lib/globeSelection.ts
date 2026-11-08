/**
 * Which countries of the globe are raised, as a pure function of what the
 * pointer does. Kept apart from the map code so it can be tested without
 * WebGL; useGlobe applies the result to the map.
 */

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

/** Codes of the countries to show raised, with white borders. */
export function raisedCountries(state: GlobeSelection): Set<string> {
  return new Set(
    [state.hovered, state.selected].filter((code) => code !== null),
  )
}
