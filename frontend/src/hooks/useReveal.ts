import { useCallback, useEffect, useState } from 'react'

import { GLOBE_TRANSITION_MS, MAP_WAIT_MS } from '../lib/countryTransition.ts'

/** Whether the country page shows, and the callback for a ready map. */
export type Reveal = { visible: boolean; onMapReady: () => void }

/**
 * Shows the country page once its map is ready and, coming from the globe,
 * the flight is over. Stops waiting for the map after MAP_WAIT_MS.
 */
export function useReveal(fromGlobe: boolean): Reveal {
  const [mapReady, setMapReady] = useState(false)
  const [zoomOver, setZoomOver] = useState(!fromGlobe)

  useEffect(() => {
    const timers = [window.setTimeout(() => setMapReady(true), MAP_WAIT_MS)]
    if (fromGlobe) {
      timers.push(
        window.setTimeout(() => setZoomOver(true), GLOBE_TRANSITION_MS),
      )
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [fromGlobe])

  const onMapReady = useCallback(() => setMapReady(true), [])
  return { visible: mapReady && zoomOver, onMapReady }
}
