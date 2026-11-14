/**
 * How the globe hands over to a country's map: the country page opens at
 * once, invisible, and loads its map while the globe flies to the country
 * (globeFlight.ts), then fades in over it once both are done. The way back
 * flies backwards.
 */

/** Duration of the globe's flight to the country. */
export const GLOBE_TRANSITION_MS = 1100

/** Duration of the flight back: shorter, to get back to the globe quickly. */
export const GLOBE_RETURN_MS = 625

/** Duration of the country page's fade in. */
export const FADE_MS = 150

/**
 * Longest wait for the map before showing the page: on a slow network, the
 * map ends loading on screen, under a loading message.
 */
export const MAP_WAIT_MS = 2500

/**
 * Longest wait for the map's style (OpenFreeMap) before telling the map is
 * unavailable: a service that never answers would otherwise leave it blank.
 * Long, as the loading message shows meanwhile.
 */
export const MAP_STYLE_TIMEOUT_MS = 20_000

/** Margin around a country framed, on the globe and on its map. */
export const FRAME_PADDING_PX = 48

/** What GlobePage passes to the country page in its outlet. */
export type CountryOutletContext = {
  /** Whether the globe is still flying: the page waits for it to land. */
  flying: boolean
  /** Called once the page covers the globe. */
  onCountryShown: () => void
}
