import { useState } from 'react'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type RegisterRequest,
} from '../models/auth.ts'
import type { ApiErrorCode } from '../models/error.ts'
import { register } from '../services/auth.ts'

/** Why a registration failed. */
export type RegisterFailure = ApiErrorCode | 'unreachable'

/** State of the registration form. */
export type RegisterState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'registered' }
  | { kind: 'failed'; reason: RegisterFailure }

/** Submits a registration, checking the password length before calling the API. */
export function useRegister() {
  const [state, setState] = useState<RegisterState>({ kind: 'idle' })

  async function submit(request: RegisterRequest) {
    const lengthError = checkPasswordLength(request.password)
    if (lengthError) {
      setState({ kind: 'failed', reason: lengthError })
      return
    }

    setState({ kind: 'submitting' })
    try {
      const result = await register(request)
      setState(
        result.ok
          ? { kind: 'registered' }
          : { kind: 'failed', reason: result.code },
      )
    } catch (error: unknown) {
      console.error('registration failed', error)
      setState({ kind: 'failed', reason: 'unreachable' })
    }
  }

  return { state, submit }
}

function checkPasswordLength(password: string): RegisterFailure | null {
  const length = [...password].length
  if (length < PASSWORD_MIN_LENGTH) {
    return 'password_too_short'
  }
  if (length > PASSWORD_MAX_LENGTH) {
    return 'password_too_long'
  }
  return null
}
