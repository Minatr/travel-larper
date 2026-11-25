/**
 * The address last signed up with on this browser, so that coming back to the sign-up page shows its pending account
 * rather than an empty form. A convenience only: the server is what refuses a second account for the same address.
 * localStorage can be unavailable (some private modes): the page then simply shows the form.
 */
const STORAGE_KEY = 'registeredEmail'

/** The address signed up with on this browser, or null. */
export function readRegisteredEmail(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Remembers the address just signed up with. */
export function rememberRegisteredEmail(email: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, email)
  } catch {
    // Storage unavailable: the pending screen only lasts until the page is closed.
  }
}

/** Forgets it: another account is wanted, or the account logged in. */
export function forgetRegisteredEmail(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing was remembered.
  }
}
