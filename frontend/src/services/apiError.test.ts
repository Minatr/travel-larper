import { describe, expect, it } from 'vitest'

import { readErrorCode } from './apiError.ts'

function jsonResponse(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), { status })
}

describe('readErrorCode', () => {
  it('returns the code of an API error', async () => {
    const response = jsonResponse(
      { code: 'email_taken', message: 'Taken' },
      409,
    )

    expect(await readErrorCode(response)).toBe('email_taken')
  })

  it.each([
    ['an unknown code', jsonResponse({ code: 'teapot' })],
    ['a body without code', jsonResponse({ message: 'Oops' })],
    [
      'a body that is not JSON',
      new Response('<html>Bad gateway</html>', { status: 502 }),
    ],
  ])('falls back to internal_error for %s', async (_, response) => {
    expect(await readErrorCode(response)).toBe('internal_error')
  })
})
