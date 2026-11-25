import { useState } from 'react'

import { forgetRegisteredEmail } from '../lib/registeredEmail.ts'
import type { LoginRequest } from '../models/auth.ts'
import type { ApiErrorCode } from '../models/error.ts'
import { login } from '../services/auth.ts'
import { useAuth } from './useAuth.ts'

/** Why a login failed. */
export type LoginFailure = ApiErrorCode | 'unreachable'

/** State of the login form. */
export type LoginState = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed'; reason: LoginFailure }

/**
 * Logs in. The login page then leaves on its own, as it does for anyone already logged in (AuthOverlay); the sign-up
 * page stops showing a pending account on this browser.
 */
export function useLogin() {
  const [state, setState] = useState<LoginState>({ kind: 'idle' })
  const { signedIn } = useAuth()

  async function submit(request: LoginRequest) {
    setState({ kind: 'submitting' })
    try {
      const result = await login({ ...request, email: request.email.trim() })
      if (!result.ok) {
        setState({ kind: 'failed', reason: result.code })
        return
      }
      forgetRegisteredEmail()
      signedIn(result.user)
    } catch (error: unknown) {
      console.error('login failed', error)
      setState({ kind: 'failed', reason: 'unreachable' })
    }
  }

  return { state, submit }
}
