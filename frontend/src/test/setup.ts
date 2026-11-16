/**
 * Runs before every test file (vite.config.ts, `test.setupFiles`): what all
 * the frontend tests need, written once.
 */
// Adds readable assertions such as toBeInTheDocument() to expect().
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import i18n from '../i18n/index.ts'

// jsdom draws nothing and has no WebGL: MapLibre is replaced by a stub that
// accepts the calls the globe and the country map make. Their rendering is
// checked by hand.
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: () => {},
  LngLatBounds: class {},
  MapLibreMap: class {
    on() {}
    once() {}
    remove() {}
    setFeatureState() {}
    touchZoomRotate = { disableRotation() {} }
    keyboard = { disableRotation() {} }
    getCanvas() {
      return document.createElement('canvas')
    }
    queryRenderedFeatures() {
      return []
    }
  },
}))

// jsdom has no matchMedia (used by the globe to detect hover support):
// answer "no" to every media query.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) satisfies MediaQueryList

// The tests check the default language, whatever the machine's settings.
await i18n.changeLanguage('en')

// Unmounts what a test rendered, so the next one starts from an empty page
// (Testing Library does it on its own only when Vitest globals are enabled),
// and forgets a language a test may have picked.
afterEach(async () => {
  cleanup()
  window.localStorage.clear()
  await i18n.changeLanguage('en')
})
