import { useTranslation } from 'react-i18next'

import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  storeLanguage,
} from '../i18n/languages.ts'
import { cn } from '../lib/utils.ts'

/**
 * Lets the visitor switch the interface language, on a paper label: the
 * current language is printed in black. The choice is remembered on this
 * browser; it will move to the user profile once accounts exist.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="flex gap-0.5 rounded-md bg-card p-0.5 shadow-lg"
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const isCurrent = i18n.resolvedLanguage === language
        return (
          <button
            key={language}
            type="button"
            lang={language}
            aria-label={LANGUAGE_NAMES[language]}
            aria-pressed={isCurrent}
            onClick={() => {
              void i18n.changeLanguage(language)
              storeLanguage(language)
            }}
            // 44 px: the smallest comfortable touch target on a phone.
            className={cn(
              'tag-title min-h-11 min-w-11 rounded-sm px-2 text-base',
              isCurrent
                ? 'bg-primary text-primary-foreground'
                : 'text-card-muted-foreground hover:text-card-foreground',
            )}
          >
            {language}
          </button>
        )
      })}
    </div>
  )
}
