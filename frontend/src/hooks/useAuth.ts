import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from './authContext.ts'

/** The logged-in user and the actions that change it. */
export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext)
  if (auth === null) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return auth
}
