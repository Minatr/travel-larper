/** Short screens, as the `short:` variant of index.css: keep both in step. */
const SHORT_SCREEN_QUERY = '(max-height: 700px)'

/** Whether the screen is short (a small phone). */
export function isShortScreen(): boolean {
  return window.matchMedia(SHORT_SCREEN_QUERY).matches
}

/** The system setting "reduce motion", as Tailwind's `motion-reduce:`. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Whether the user asked their system to reduce motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}
