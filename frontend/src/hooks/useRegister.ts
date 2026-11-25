import { useState } from 'react'

import { forgetRegisteredEmail, readRegisteredEmail, rememberRegisteredEmail } from '../lib/registeredEmail.ts'
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type RegisterRequest,
} from '../models/auth.ts'
import type { ApiErrorCode } from '../models/error.ts'
import { register } from '../services/auth.ts'

/** Why a registration failed: an API error, or one caught before calling it. */
export type RegisterFailure = ApiErrorCode | 'unreachable' | 'password_mismatch'

/** State of the registration form. */
export type RegisterState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'registered'; email: string }
  | { kind: 'failed'; reason: RegisterFailure }

/**
 * Submits a registration, checking the name and the password (length, confirmation) before calling the API. Starts on the pending
 * account signed up with on this browser, if any; `startOver` forgets it, for another account.
 */
export function useRegister() {
  const [state, setState] = useState<RegisterState>(() => {
    const email = readRegisteredEmail()
    return email === null ? { kind: 'idle' } : { kind: 'registered', email }
  })

  async function submit(request: RegisterRequest, confirmation: string) {
    // Phones' autocompletion often adds a space after the address or the name.
    const email = request.email.trim()
    const displayName = request.displayName.trim()
    const error = checkDisplayName(displayName) ?? checkPassword(request.password, confirmation)
    if (error) {
      setState({ kind: 'failed', reason: error })
      return
    }

    setState({ kind: 'submitting' })
    try {
      const result = await register({ ...request, displayName, email })
      if (!result.ok) {
        setState({ kind: 'failed', reason: result.code })
        return
      }
      rememberRegisteredEmail(email)
      setState({ kind: 'registered', email })
    } catch (error: unknown) {
      console.error('registration failed', error)
      setState({ kind: 'failed', reason: 'unreachable' })
    }
  }

  function startOver() {
    forgetRegisteredEmail()
    setState({ kind: 'idle' })
  }

  return { state, submit, startOver }
}

function checkDisplayName(displayName: string): RegisterFailure | null {
  // Counted like the server does: by character, an emoji counting for one.
  const length = [...displayName].length
  return length < DISPLAY_NAME_MIN_LENGTH || length > DISPLAY_NAME_MAX_LENGTH ? 'invalid_display_name' : null
}

function checkPassword(password: string, confirmation: string): RegisterFailure | null {
  const length = [...password].length
  if (length < PASSWORD_MIN_LENGTH) {
    return 'password_too_short'
  }
  if (length > PASSWORD_MAX_LENGTH) {
    return 'password_too_long'
  }
  if (password !== confirmation) {
    return 'password_mismatch'
  }
  return null
}
