import { useCallback, useEffect, useState } from 'react'

import { MAP_WAIT_MS } from '../lib/countryTransition.ts'

/** Where the country page stands, and the callbacks its map reports to. */
export type Reveal = {
  /** The page shows, over the globe. */
  visible: boolean
  /** The map is still loading: a message tells it. */
  loading: boolean
  /** The map could not load. */
  failed: boolean
  /** For the map to call once fully drawn. */
  onMapReady: () => void
  /** For the map to call when it cannot load. */
  onMapFailed: () => void
}

type MapStatus = 'loading' | 'ready' | 'failed'

/**
 * Shows the country page once the globe has landed (`flying` false) and its
 * map is ready, or after MAP_WAIT_MS with the map still loading.
 */
export function useReveal(flying: boolean): Reveal {
  const [map, setMap] = useState<MapStatus>('loading')
  const [waitOver, setWaitOver] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setWaitOver(true), MAP_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const onMapReady = useCallback(() => setMap('ready'), [])
  const onMapFailed = useCallback(() => setMap('failed'), [])
  return {
    visible: !flying && (map !== 'loading' || waitOver),
    loading: map === 'loading',
    failed: map === 'failed',
    onMapReady,
    onMapFailed,
  }
}
