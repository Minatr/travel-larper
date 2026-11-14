/**
 * MapLibre, set up once for the whole app: the globe and the country map
 * import it from here.
 */
import 'maplibre-gl/dist/maplibre-gl.css'

import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// Vite moves MapLibre's worker (the thread that parses map data) when
// bundling: MapLibre is given its new URL.
setWorkerUrl(workerUrl)

/** Pixel ratio cap: a 3x phone screen would draw 2.25 times more. */
const MAX_PIXEL_RATIO = 2

/** Pixel ratio to draw the maps with. */
export function mapPixelRatio(): number {
  return Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO)
}

export { MapLibreMap } from 'maplibre-gl'
