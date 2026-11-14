import type {
  CurrentUser,
  LoginRequest,
  RegisterRequest,
} from '../models/auth.ts'
import type { ApiErrorCode } from '../models/error.ts'
import { readErrorCode } from './apiError.ts'

const REGISTER_URL = '/api/auth/register'
const LOGIN_URL = '/api/auth/login'
const LOGOUT_URL = '/api/auth/logout'
const ME_URL = '/api/auth/me'
const UNAUTHORIZED = 401

/** Outcome of a registration. */
export type RegisterResult = { ok: true } | { ok: false; code: ApiErrorCode }

/** Outcome of a login. */
export type LoginResult =
  { ok: true; user: CurrentUser } | { ok: false; code: ApiErrorCode }

/** Calls POST /api/auth/register; throws only if the API is unreachable. */
export async function register(
  request: RegisterRequest,
): Promise<RegisterResult> {
  const response = await postJSON(REGISTER_URL, request)
  if (response.ok) {
    return { ok: true }
  }
  return { ok: false, code: await readErrorCode(response) }
}

/** Calls POST /api/auth/login; throws only if the API is unreachable. */
export async function login(request: LoginRequest): Promise<LoginResult> {
  const response = await postJSON(LOGIN_URL, request)
  if (response.ok) {
    return { ok: true, user: (await response.json()) as CurrentUser }
  }
  return { ok: false, code: await readErrorCode(response) }
}

/** Calls POST /api/auth/logout; throws if the session could not be closed. */
export async function logout(): Promise<void> {
  const response = await fetch(LOGOUT_URL, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`logout failed: ${await readErrorCode(response)}`)
  }
}

/** Calls GET /api/auth/me: the logged-in user, or null for a visitor. */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch(ME_URL)
  if (response.status === UNAUTHORIZED) {
    return null
  }
  if (!response.ok) {
    throw new Error(`get current user failed: ${await readErrorCode(response)}`)
  }
  return (await response.json()) as CurrentUser
}

function postJSON(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
