const HOME = '/'

/**
 * The page to open after login: only a path of this site, so a crafted link
 * (`/login?redirect=https://evil.example`) cannot send the user elsewhere.
 */
export function safeRedirect(target: string | null): string {
  if (target === null || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return HOME
  }
  return target
}
