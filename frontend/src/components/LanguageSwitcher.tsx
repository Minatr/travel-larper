import { useTranslation } from 'react-i18next'

import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  storeLanguage,
} from '../i18n/languages.ts'
import { cn } from '../lib/utils.ts'

/**
 * Lets the visitor switch the interface language. The choice is remembered on
 * this browser; it will move to the user profile once accounts exist.
 *
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div role="group" aria-label={t('language.label')} className="flex gap-1">
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
              'min-h-11 min-w-11 rounded-md px-2 text-sm font-medium uppercase',
              isCurrent
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {language}
          </button>
        )
      })}
    </div>
  )
}
