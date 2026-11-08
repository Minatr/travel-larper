/**
 * Sets up the translations once, before React renders anything: main.tsx
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
  DEFAULT_LANGUAGE,
  detectLanguage,
  readStoredLanguage,
} from './languages.ts'
import en from './locales/en.json'
import fr from './locales/fr.json'

/**
 * Translations of every supported language. English is the reference: the
 * other languages must have exactly its keys.
 *
 * `satisfies typeof en` checks fr.json against the shape of en.json without
 * changing its type, so a key missing in French fails the compilation. Keys
 * that exist in French only are not caught here: the i18n test does it.
 */
export const resources = {
  en: { translation: en },
  fr: { translation: fr satisfies typeof en },
}

void i18n.use(initReactI18next).init({
  resources,
  // The visitor's own choice first, then the browser language.
  lng: readStoredLanguage() ?? detectLanguage(navigator.languages),
  // Shown when a key has no translation in the current language.
  fallbackLng: DEFAULT_LANGUAGE,
  // React already escapes what it renders.
  interpolation: { escapeValue: false },
})

// Screen readers and the browser's spell checker rely on <html lang>.
document.documentElement.lang = i18n.language
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

export default i18n
