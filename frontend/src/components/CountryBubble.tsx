import { useTranslation } from 'react-i18next'

import { hasMap } from '../lib/countryCode.ts'
import { countryName } from '../lib/countryName.ts'
import {
  type CountryHint,
  EYELET_OFFSET_PX,
  stringPath,
  TAG_WIDTH_PX,
} from '../lib/countryTag.ts'
import { fittedTitleSize } from '../lib/tagTitle.ts'
import { cn } from '../lib/utils.ts'

/** Room for the country's name on the tag, between its paddings. */
const TITLE_WIDTH_PX = TAG_WIDTH_PX - 56

/** Size of the name when it fits, in pixels (Tailwind's text-3xl). */
const TITLE_MAX_PX = 30

/** Props of {@link CountryBubble}. */
type CountryBubbleProps = {
  /** Hovered country's tag, or null to show none. */
  hint: CountryHint | null
}

/** Mouse only: the hovered country's tag, tied to it by a string. */
export function CountryBubble({ hint }: CountryBubbleProps) {
  const { t, i18n } = useTranslation()
  if (hint === null) {
    return null
  }

  const { code, layout } = hint
  const name = countryName(code, i18n.language)
  const { anchor, eyelet, side, tiltDegrees } = layout
  // Placed and tilted by its eyelet.
  const eyeletX =
    side === 'right' ? EYELET_OFFSET_PX.x : TAG_WIDTH_PX - EYELET_OFFSET_PX.x

  return (
    // Hidden from screen readers: mouse only.
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg className="tag-appear absolute inset-0 size-full">
        <path
          d={stringPath(anchor, eyelet)}
          fill="none"
          stroke="var(--card)"
          strokeWidth="1.5"
        />
        <circle cx={anchor.x} cy={anchor.y} r="3" fill="var(--card)" />
      </svg>
      <div
        className="tag-appear absolute drop-shadow-xl"
        style={{
          left: eyelet.x - eyeletX,
          top: eyelet.y - EYELET_OFFSET_PX.y,
          width: TAG_WIDTH_PX,
          transform: `rotate(${tiltDegrees}deg)`,
          transformOrigin: `${eyeletX}px ${EYELET_OFFSET_PX.y}px`,
        }}
      >
        <div
          className={cn(
            'relative bg-card py-3 text-card-foreground',
            side === 'right'
              ? 'tag-shape-left pr-4 pl-10'
              : 'tag-shape-right pr-10 pl-4',
          )}
        >
          <span
            className={cn(
              'absolute top-5 size-3.5 rounded-full bg-background ring-[3px] ring-ink',
              side === 'right' ? 'left-3.5' : 'right-3.5',
            )}
          />
          <p className="text-[0.625rem] font-semibold tracking-[0.18em] text-ink uppercase">
            {t('globe.destination')}
          </p>
          <p
            className="tag-title leading-none"
            style={{
              fontSize: fittedTitleSize(name, TITLE_WIDTH_PX, TITLE_MAX_PX),
            }}
          >
            {name}
          </p>
          <p className="mt-2 flex justify-between border-t border-dashed border-card-foreground/20 pt-2 text-xs font-semibold">
            {hasMap(code) ? (
              <>
                {t('globe.clickToOpen')}
                <span className="text-ink">→</span>
              </>
            ) : (
              <span className="text-card-muted-foreground">
                {t('globe.noMap')}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
