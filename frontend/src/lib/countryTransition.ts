/**
 * How the globe hands over to a country's map: the country page opens at
 * once, invisible, and loads its map while the globe flies to the country
 * (globeFlight.ts), then fades in over it. The way back flies backwards.
 */

/** Duration of the globe's flight to the country. */
export const GLOBE_TRANSITION_MS = 1100

/** Duration of the flight back: shorter, to get back to the globe quickly. */
export const GLOBE_RETURN_MS = 625

/** Duration of the country page's fade in. */
export const FADE_MS = 150

/** Longest wait for the map: on a slow network, it ends loading on screen. */
export const MAP_WAIT_MS = 2500

/** Margin around a country framed, on the globe and on its map. */
export const FRAME_PADDING_PX = 48

/**
 * Navigation state set by the globe: the country page then waits for the
 * end of the flight. Absent when the URL is typed.
 */
export const FROM_GLOBE = { fromGlobe: true } as const

/** Tells whether the navigation state is {@link FROM_GLOBE}. */
export function cameFromGlobe(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'fromGlobe' in state &&
    state.fromGlobe === true
  )
}

/**
 * What GlobePage passes to the country page: `onCountryShown`, called once
 * the page covers the globe.
 */
export type CountryOutletContext = { onCountryShown: () => void }
