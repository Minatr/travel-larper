import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'

import { hasMap } from '../lib/countryCode.ts'
import { countryName } from '../lib/countryName.ts'
import { cn } from '../lib/utils.ts'

/** Props of {@link CountryBubble}. */
type CountryBubbleProps = {
  /** Country hovered, or null to hide the bubble. */
  code: string | null
  /** The bubble element, which useGlobe moves along with the mouse. */
  ref: Ref<HTMLDivElement>
}

/** Name of the country under the mouse, next to it. */
export function CountryBubble({ code, ref }: CountryBubbleProps) {
  const { t, i18n } = useTranslation()

  return (
    // Always rendered, so the hook can move it before it shows; hidden from
    // screen readers, as it only follows the mouse.
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-0 left-0 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm backdrop-blur-md',
        code === null && 'invisible',
      )}
    >
      {code !== null && (
        <>
          <p className="font-semibold">{countryName(code, i18n.language)}</p>
          {!hasMap(code) && (
            <p className="text-muted-foreground">{t('globe.noMap')}</p>
          )}
        </>
      )}
    </div>
  )
}
