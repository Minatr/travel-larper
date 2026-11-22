import { useTranslation } from 'react-i18next'

import { countryName } from '../lib/countryName.ts'
import type { InsetId } from '../lib/territories.ts'

/**
 * Names a country, or one of its distant territories after it ("France · French Guiana"), in the current language.
 */
export function usePlaceName(): (code: string, territory: InsetId | null) => string {
  const { t, i18n } = useTranslation()
  return (code, territory) => {
    const name = countryName(code, i18n.language)
    return territory === null ? name : `${name} · ${t(`territories.${territory}`)}`
  }
}
