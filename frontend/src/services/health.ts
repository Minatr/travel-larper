import type { Health } from '../models/health.ts'

const HEALTH_URL = '/api/health'

/**
 * Checks the shape of the response at runtime: TypeScript types disappear
 * after compilation, so a malformed body would otherwise go unnoticed.
 */
function isHealth(value: unknown): value is Health {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    (candidate.status === 'ok' || candidate.status === 'degraded') &&
    (candidate.database === 'up' || candidate.database === 'down')
  )
}

/**
 * Fetches the API health. A 503 still carries a valid body (database down),
 * so the body is read whatever the status code.
 */
export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch(HEALTH_URL, { signal })
  const body: unknown = await response.json()
  if (!isHealth(body)) {
    throw new Error(`unexpected health response (HTTP ${response.status})`)
  }
  return body
}
