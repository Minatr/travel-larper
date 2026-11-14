import { type ReactNode, useEffect, useState } from 'react'

import { AuthContext, type AuthState } from '../hooks/authContext.ts'
import type { CurrentUser } from '../models/auth.ts'
import { fetchCurrentUser, logout } from '../services/auth.ts'

/**
 * Asks the API who is logged in, once, and shares the answer with every
 * page. The session cookie is HttpOnly.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setState(
            user ? { status: 'authenticated', user } : { status: 'anonymous' },
          )
        }
      })
      .catch((error: unknown) => {
        console.error('load current user failed', error)
        if (!cancelled) {
          setState({ status: 'anonymous' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function signedIn(user: CurrentUser) {
    setState({ status: 'authenticated', user })
  }

  async function signOut() {
    try {
      await logout()
      setState({ status: 'anonymous' })
    } catch (error: unknown) {
      console.error('logout failed', error)
    }
  }

  return (
    <AuthContext value={{ state, signedIn, signOut }}>{children}</AuthContext>
  )
}
