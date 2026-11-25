import { useEffect } from 'react'

/**
 * Keeps the page scrolled to the top while `enabled`. On a phone, focusing a field near the bottom makes the browser
 * (iOS Safari above all) push the whole page up above the keyboard; a field that then moves to the top of the screen
 * ends up out of sight. Resets that push each time the keyboard moves the visible area.
 */
export function usePinnedPage(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return
    }
    const viewport = window.visualViewport
    const pin = () => {
      if (window.scrollY !== 0 || (viewport !== null && viewport.offsetTop !== 0)) {
        window.scrollTo(0, 0)
      }
    }
    pin()
    viewport?.addEventListener('resize', pin)
    viewport?.addEventListener('scroll', pin)
    window.addEventListener('scroll', pin)
    return () => {
      viewport?.removeEventListener('resize', pin)
      viewport?.removeEventListener('scroll', pin)
      window.removeEventListener('scroll', pin)
    }
  }, [enabled])
}
