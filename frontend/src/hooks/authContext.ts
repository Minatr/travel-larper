import { createContext } from 'react'

import type { CurrentUser } from '../models/auth.ts'

/** Who is using the app; `loading` until GET /api/auth/me answers. */
export type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: CurrentUser }

/** What AuthProvider shares with the whole app. */
export type AuthContextValue = {
  state: AuthState
  signedIn: (user: CurrentUser) => void
  signOut: () => Promise<void>
}

/** Filled by AuthProvider, read with useAuth. */
export const AuthContext = createContext<AuthContextValue | null>(null)
