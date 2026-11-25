import { type ReactNode, useEffect, useState } from 'react'

import { AuthContext, type AuthNotice, type AuthState } from '../hooks/authContext.ts'
import type { CurrentUser } from '../models/auth.ts'
import { fetchCurrentUser, logout } from '../services/auth.ts'

/** How long the note confirming a login or a logout stays. */
const NOTICE_MS = 3000

/**
 * Asks the API who is logged in, once, and shares the answer with every
 * page. The session cookie is HttpOnly. A login or a logout done here also
 * raises a short notice (none for the session found on load).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [notice, setNotice] = useState<AuthNotice>(null)

  useEffect(() => {
    if (notice === null) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setState(user ? { status: 'authenticated', user } : { status: 'anonymous' })
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
    setNotice('signedIn')
  }

  // Anonymous even when the logout fails: the server clears the cookie
  async function signOut() {
    try {
      await logout()
    } catch (error: unknown) {
      console.error('logout failed', error)
    }
    setState({ status: 'anonymous' })
    setNotice('signedOut')
  }

  return <AuthContext value={{ state, notice, signedIn, signOut }}>{children}</AuthContext>
}
