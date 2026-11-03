import type { Health } from '../models/health.ts'

const HEALTH_URL = '/api/health'

// Typed as Record over the generated enums: a value added to the contract
// fails compilation here until the runtime check below accepts it too.
const HEALTH_STATUSES: Record<Health['status'], true> = {
  ok: true,
  degraded: true,
}
const DATABASE_STATES: Record<Health['database'], true> = {
  up: true,
  down: true,
}

/**
 * Tells whether `value` is a valid Health body. Checked at runtime because
 * TypeScript types vanish once compiled.
 */
function isHealth(value: unknown): value is Health {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.status === 'string' &&
    Object.hasOwn(HEALTH_STATUSES, candidate.status) &&
    typeof candidate.database === 'string' &&
    Object.hasOwn(DATABASE_STATES, candidate.database)
  )
}

/**
 * Calls GET /api/health and returns its body, even on a 503 (database down).
 * Throws if the body is not a valid Health.
 */
export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch(HEALTH_URL, { signal })
  const body: unknown = await response.json()
  if (!isHealth(body)) {
    throw new Error(`unexpected health response (HTTP ${response.status})`)
  }
  return body
}
