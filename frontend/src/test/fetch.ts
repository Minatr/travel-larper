/**
 * Fake API for the page tests: every page asks GET /api/auth/me on load
 * (AuthProvider), so the stub answers it apart from the call under test. The
 * login and sign-up pages open over the globe, which asks for the countries.
 */
import { vi } from 'vitest'

import type { CurrentUser } from '../models/auth.ts'

const ME_URL = '/api/auth/me'
const COUNTRIES_URL = '/geo/countries.json'

/**
 * Replaces fetch: GET /api/auth/me answers `me` (a visitor when null), the
 * countries file no country, any other call `answer` (an Error means the API
 * is unreachable).
 */
export function stubFetch(answer: Response | Error, me: CurrentUser | null = null) {
  const fetchMock = vi.fn((url: string) => {
    if (url === ME_URL) {
      return Promise.resolve(
        me === null ? Response.json({ code: 'unauthorized', message: '' }, { status: 401 }) : Response.json(me),
      )
    }
    if (url === COUNTRIES_URL) {
      // No country: the tests draw no globe.
      return Promise.resolve(Response.json({ type: 'FeatureCollection', features: [] }))
    }
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer.clone())
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
