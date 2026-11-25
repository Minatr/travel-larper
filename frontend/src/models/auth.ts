import type { components } from './api.gen.ts'

/** Body of POST /api/auth/register. */
export type RegisterRequest = components['schemas']['RegisterRequest']

/** Body of POST /api/auth/login. */
export type LoginRequest = components['schemas']['LoginRequest']

/** The logged-in user, as returned by login and GET /api/auth/me. */
export type CurrentUser = components['schemas']['CurrentUser']

/** Same bounds as `RegisterRequest.displayName` in openapi.yaml. */
export const DISPLAY_NAME_MIN_LENGTH = 2
export const DISPLAY_NAME_MAX_LENGTH = 30

/** Same bounds as `RegisterRequest.password` in openapi.yaml. */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
