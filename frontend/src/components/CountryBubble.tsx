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

/** Room the close button takes from the name (pr-9 instead of pr-4). */
const CLOSE_ROOM_PX = 20

/** Props of {@link CountryBubble}. */
type CountryBubbleProps = {
  /** Hovered country's tag, or null to show none. */
  hint: CountryHint | null
  /** Shows a close button (the searched country's tag), calling this. */
  onClose?: () => void
  /** Faded behind another tag, so that one stays readable. */
  faded?: boolean
}

/**
 * Mouse only: the hovered country's tag, or the one found by the search,
 * tied to the country by a string.
 */
export function CountryBubble({
  hint,
  onClose,
  faded = false,
}: CountryBubbleProps) {
  const { t, i18n } = useTranslation()
  if (hint === null) {
    return null
  }

  const { code, layout } = hint
  const name = countryName(code, i18n.language)
  const closable = onClose !== undefined
  const { anchor, eyelet, side, tiltDegrees } = layout
  // Placed and tilted by its eyelet.
  const eyeletX =
    side === 'right' ? EYELET_OFFSET_PX.x : TAG_WIDTH_PX - EYELET_OFFSET_PX.x

  return (
    // Mouse only; the mouse goes through it to the countries below, except
    // on its close button.
    <div
      className={cn(
        'pointer-events-none absolute inset-0 transition-opacity duration-200',
        faded && 'opacity-40',
      )}
    >
      <svg aria-hidden className="tag-appear absolute inset-0 size-full">
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
              ? cn('tag-shape-left pl-10', closable ? 'pr-9' : 'pr-4')
              : cn('tag-shape-right pr-10', closable ? 'pl-9' : 'pl-4'),
          )}
        >
          <span
            className={cn(
              'absolute top-5 size-3.5 rounded-full bg-background ring-[3px] ring-ink',
              side === 'right' ? 'left-3.5' : 'right-3.5',
            )}
          />
          {onClose !== undefined && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('globe.close')}
              className={cn(
                'pointer-events-auto absolute top-0.5 flex size-8 items-center justify-center text-lg text-card-muted-foreground hover:text-card-foreground',
                // Opposite the eyelet.
                side === 'right' ? 'right-0.5' : 'left-0.5',
              )}
            >
              ×
            </button>
          )}
          <p
            aria-hidden
            className="text-[0.625rem] font-semibold tracking-[0.18em] text-ink uppercase"
          >
            {t('globe.destination')}
          </p>
          <p
            aria-hidden
            className="tag-title leading-none"
            style={{
              fontSize: fittedTitleSize(
                name,
                TITLE_WIDTH_PX - (closable ? CLOSE_ROOM_PX : 0),
                TITLE_MAX_PX,
              ),
            }}
          >
            {name}
          </p>
          <p
            aria-hidden
            className="mt-2 flex justify-between border-t border-dashed border-card-foreground/20 pt-2 text-xs font-semibold"
          >
            {hasMap(code) ? (
              <>
                {t(hint.searched ? 'globe.enterToOpen' : 'globe.clickToOpen')}
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
