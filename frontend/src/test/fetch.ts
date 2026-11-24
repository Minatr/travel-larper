/**
 * Fake API for the page tests: every page asks GET /api/auth/me on load
 * (AuthProvider), so the stub answers it apart from the call under test.
 */
import { vi } from 'vitest'

import type { CurrentUser } from '../models/auth.ts'

/** Asked by every page on load (AuthProvider). */
export const ME_URL = '/api/auth/me'

/** Answer of GET /api/auth/me for a visitor. */
export function visitorResponse(): Response {
  return Response.json({ code: 'unauthorized', message: '' }, { status: 401 })
}

/**
 * Replaces fetch: GET /api/auth/me answers `me` (a visitor when null), any
 * other call `answer` (an Error means the API is unreachable).
 */
export function stubFetch(answer: Response | Error, me: CurrentUser | null = null) {
  const fetchMock = vi.fn((url: string) => {
    if (url === ME_URL) {
      return Promise.resolve(me === null ? visitorResponse() : Response.json(me))
    }
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer.clone())
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
