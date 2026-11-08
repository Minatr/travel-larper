/**
 * Runs before every test file (vite.config.ts, `test.setupFiles`): what all
 * the frontend tests need, written once.
 */
// Adds readable assertions such as toBeInTheDocument() to expect().
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import i18n from '../i18n/index.ts'

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
