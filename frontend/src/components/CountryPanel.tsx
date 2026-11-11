import { useTranslation } from 'react-i18next'

import { hasMap } from '../lib/countryCode.ts'
import { countryName } from '../lib/countryName.ts'

/** Props of {@link CountryPanel}. */
type CountryPanelProps = {
  /** Country tapped, or null to hide the panel. */
  code: string | null
  /** Opens the country's map. */
  onOpen: () => void
}

/** Touch screens: the tapped country, and a button to open its map. */
export function CountryPanel({ code, onOpen }: CountryPanelProps) {
  const { t, i18n } = useTranslation()
  if (code === null) {
    return null
  }

  return (
    <section
      aria-live="polite"
      className="absolute inset-x-4 bottom-6 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 py-2 pr-2 pl-4 backdrop-blur-md"
    >
      <h2 className="truncate font-semibold">
        {countryName(code, i18n.language)}
      </h2>
      {hasMap(code) ? (
        // 44 px high: the smallest comfortable touch target on a phone.
        <button
          type="button"
          onClick={onOpen}
          className="min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {t('globe.openMap')}
        </button>
      ) : (
        <p className="py-2.5 pr-2 text-sm text-muted-foreground">
          {t('globe.noMap')}
        </p>
      )}
    </section>
  )
}
