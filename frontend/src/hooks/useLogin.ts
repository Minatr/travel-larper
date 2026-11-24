import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { safeRedirect } from '../lib/redirect.ts'
import type { LoginRequest } from '../models/auth.ts'
import type { ApiErrorCode } from '../models/error.ts'
import { login } from '../services/auth.ts'
import { useAuth } from './useAuth.ts'

/** Why a login failed. */
export type LoginFailure = ApiErrorCode | 'unreachable'

/** State of the login form. */
export type LoginState = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed'; reason: LoginFailure }

/** Logs in, then opens the page given by `?redirect=` (home by default). */
export function useLogin() {
  const [state, setState] = useState<LoginState>({ kind: 'idle' })
  const { signedIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  async function submit(request: LoginRequest) {
    setState({ kind: 'submitting' })
    try {
      const result = await login(request)
      if (!result.ok) {
        setState({ kind: 'failed', reason: result.code })
        return
      }
      signedIn(result.user)
      void navigate(safeRedirect(searchParams.get('redirect')), {
        replace: true,
      })
    } catch (error: unknown) {
      console.error('login failed', error)
      setState({ kind: 'failed', reason: 'unreachable' })
    }
  }

  return { state, submit }
}
