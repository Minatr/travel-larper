import type { components } from './api.gen.ts'

/** Body of POST /api/auth/register. */
export type RegisterRequest = components['schemas']['RegisterRequest']

/** Same bounds as `RegisterRequest.password` in openapi.yaml. */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
