import { useTranslation } from 'react-i18next'

/**
 * The app's name on a small tag, hanging by a string from the search
 * field's eyelet: decoration only, the mouse goes through it. It swings
 * once as it shows up.
 */
export function HangingLogo() {
  const { t } = useTranslation()
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-6 left-[1.5625rem] -z-10"
    >
      {/* String from the field's eyelet down to the logo's. */}
      <svg
        width="24"
        height="68"
        className="absolute top-0 left-0 overflow-visible"
      >
        <path
          d="M0 0 Q 2 38 9 64"
          fill="none"
          stroke="var(--card)"
          strokeWidth="1.5"
        />
      </svg>
      {/* Its eyelet (15 px in, mid-height) on the string's end, turning there. */}
      <div className="tag-swing absolute top-[3.125rem] left-[-0.375rem] origin-[15px_50%] rotate-[20deg] drop-shadow-lg">
        <span className="tag-label-left tag-title flex h-7 items-center gap-2 bg-card pr-2.5 pl-3 text-xs tracking-wide whitespace-nowrap text-card-foreground">
          <span className="size-1.5 rounded-full bg-background ring-2 ring-ink" />
          {t('app.name')}
        </span>
      </div>
    </div>
  )
}
