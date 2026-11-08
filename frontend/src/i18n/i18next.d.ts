/**
 * Types only: this file never runs. It tells TypeScript which translation
 * keys exist, so that:
 * - a typo or a removed key (`t('helth.title')`) fails the compilation,
 *   instead of showing the raw key on screen;
 * - the editor autocompletes the keys inside `t('…')`.
 *
 * `declare module 'i18next'` adds our types to those of the library (this is
 * called module augmentation): i18next reads `CustomTypeOptions` to type
 * `t()`. The keys come from en.json, the reference language.
 */
import 'i18next'

import type { resources } from './index.ts'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: (typeof resources)['en']
  }
}
