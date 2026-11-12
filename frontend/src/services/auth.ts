import type { RegisterRequest } from '../models/auth.ts'
import type { ApiErrorCode } from '../models/error.ts'
import { readErrorCode } from './apiError.ts'

const REGISTER_URL = '/api/auth/register'

/** Outcome of a registration. */
export type RegisterResult = { ok: true } | { ok: false; code: ApiErrorCode }

/** Calls POST /api/auth/register; throws only if the API is unreachable. */
export async function register(
  request: RegisterRequest,
): Promise<RegisterResult> {
  const response = await fetch(REGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (response.ok) {
    return { ok: true }
  }
  return { ok: false, code: await readErrorCode(response) }
}
