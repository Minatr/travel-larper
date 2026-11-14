/** Short screens, as the `short:` variant of index.css: keep both in step. */
export const SHORT_SCREEN_QUERY = '(max-height: 700px)'

/** Whether the screen is short (a small phone). */
export function isShortScreen(): boolean {
  return window.matchMedia(SHORT_SCREEN_QUERY).matches
}
