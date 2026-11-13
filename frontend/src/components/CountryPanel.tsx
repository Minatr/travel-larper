import { useTranslation } from 'react-i18next'

import { hasMap } from '../lib/countryCode.ts'
import { countryName } from '../lib/countryName.ts'
import { fittedTitleSize } from '../lib/tagTitle.ts'

/**
 * Room for the country's name on a phone, beside the barcode: the narrowest
 * panel, so the name fits on every screen.
 */
const TITLE_WIDTH_PX = 210

/** Size of the name when it fits, in pixels (Tailwind's text-5xl). */
const TITLE_MAX_PX = 48

/** Props of {@link CountryPanel}. */
type CountryPanelProps = {
  /** Country tapped, or null to hide the panel. */
  code: string | null
  /** Opens the country's map. */
  onOpen: () => void
}

/**
 * Touch screens: the tapped country's luggage tag, with a button to open
 * its map.
 */
export function CountryPanel({ code, onOpen }: CountryPanelProps) {
  const { t, i18n } = useTranslation()
  if (code === null) {
    return null
  }
  const name = countryName(code, i18n.language)

  return (
    <section
      aria-live="polite"
      className="absolute inset-x-3 bottom-6 mx-auto max-w-sm drop-shadow-2xl"
    >
      <div className="tag-shape-left relative border-r-[6px] border-ink bg-card py-4 pr-4 pl-11 text-card-foreground">
        <span className="absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 rounded-full bg-background ring-[3px] ring-ink" />
        <p className="text-[0.625rem] font-semibold tracking-[0.18em] text-ink uppercase">
          {t('globe.destination')}
        </p>
        <div className="flex items-end justify-between gap-3">
          <h2
            className="tag-title leading-[0.9]"
            style={{
              fontSize: fittedTitleSize(name, TITLE_WIDTH_PX, TITLE_MAX_PX),
            }}
          >
            {name}
          </h2>
          {/* Code 39 barcode font: the asterisks are its start and stop. */}
          <span
            aria-hidden
            className="shrink-0 font-barcode text-3xl leading-none text-ink"
          >
            *{code}*
          </span>
        </div>
        {hasMap(code) ? (
          // 48 px high: above the 44 px minimum touch target on a phone.
          <button
            type="button"
            onClick={onOpen}
            className="mt-3.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary font-semibold text-primary-foreground"
          >
            {t('globe.openMap')}
            <span aria-hidden className="text-ink">
              →
            </span>
          </button>
        ) : (
          <p className="mt-3 text-sm text-card-muted-foreground">
            {t('globe.noMap')}
          </p>
        )}
      </div>
    </section>
  )
}
