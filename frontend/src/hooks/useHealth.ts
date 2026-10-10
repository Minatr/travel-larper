import { useEffect, useState } from 'react'

import type { Health } from '../models/health.ts'
import { fetchHealth } from '../services/health.ts'

/** State of the health request: still loading, answered, or API unreachable. */
export type HealthState =
  | { kind: 'loading' }
  | { kind: 'loaded'; health: Health }
  | { kind: 'unreachable' }

/** Loads the API health once, when the component mounts. */
export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchHealth(controller.signal)
      .then((health) => setState({ kind: 'loaded', health }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('health check failed', error)
          setState({ kind: 'unreachable' })
        }
      })
    return () => controller.abort()
  }, [])

  return state
}
