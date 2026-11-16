import type { ApiErrorCode } from '../models/error.ts'

// A Record over the generated enum: a new code breaks compilation until listed.
const API_ERROR_CODES: Record<ApiErrorCode, true> = {
  invalid_parameter: true,
  invalid_body: true,
  invalid_email: true,
  password_too_short: true,
  password_too_long: true,
  email_taken: true,
  not_found: true,
  method_not_allowed: true,
  request_too_large: true,
  rate_limited: true,
  internal_error: true,
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && Object.hasOwn(API_ERROR_CODES, value)
}

/** Reads the code of an error response, `internal_error` if it has none. */
export async function readErrorCode(response: Response): Promise<ApiErrorCode> {
  const body: unknown = await response.json().catch(() => null)
  if (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    isApiErrorCode(body.code)
  ) {
    return body.code
  }
  return 'internal_error'
}
