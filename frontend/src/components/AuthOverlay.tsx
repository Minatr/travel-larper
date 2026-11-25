import { type ReactNode, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuth } from '../hooks/useAuth.ts'
import { useKeyPress } from '../hooks/useKeyPress.ts'
import { safeRedirect } from '../lib/redirect.ts'
import { cn } from '../lib/utils.ts'
import type { AuthLinkState } from './AccountButton.tsx'

/** Props of {@link AuthOverlay}. */
type AuthOverlayProps = {
  /** Small label printed in ink above the title ("Boarding"). */
  printed: string
  title: string
  children: ReactNode
}

/**
 * The login and sign-up pages: a luggage tag over the dimmed globe (they open above it, like a country page), centered
 * on a computer, near the top on a phone. Opened from the account button, it comes out of a slot like a boarding pass
 * from a kiosk; from the other page, it turns round. Escape, the cross or a
 * click beside the tag close it: back to the page before, or to the globe when the page was opened from its URL. For
 * visitors only: logged in (just now, or already when the page opened), on to the page given by `?redirect=`.
 */
export function AuthOverlay({ printed: printedLabel, title, children }: AuthOverlayProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { state } = useAuth()
  const titleId = useId()
  const linkState = location.state as AuthLinkState | null
  const printed = linkState?.fromAccountButton === true
  const turned = linkState?.turn === true

  function close() {
    // `default`: the first page of this visit, with nothing to go back to.
    void (location.key === 'default' ? navigate('/') : navigate(-1))
  }
  useKeyPress('Escape', close)

  // TODO(TL-22): an account that is not active goes to its own page instead.
  if (state.status === 'authenticated') {
    return <Navigate to={safeRedirect(searchParams.get('redirect'))} replace />
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      {/* The dimmed globe: a click there closes, like the cross (which keyboards and screen readers use instead). */}
      <div aria-hidden onClick={close} className="fixed inset-0 bg-background/70" />
      <div className="pointer-events-none relative flex min-h-full items-start justify-center px-3 pt-20 pb-6 sm:items-center sm:pt-6">
        <section
          aria-labelledby={titleId}
          className={cn('pointer-events-auto relative w-full max-w-[340px]', printed && 'tag-printing')}
        >
          <span aria-hidden className="tag-slot" />
          {/* Two layers: the outer one hides the tag above the slot, the inner one moves (a clip would move with it). */}
          <div className="tag-feed">
            <div className="tag-print drop-shadow-2xl">
              <div
                className={cn(
                  'tag-shape-left relative border-r-[6px] border-ink bg-card pt-5.5 pr-5.5 pb-5 pl-11.5 text-card-foreground',
                  turned && 'tag-turn',
                )}
              >
                <span
                  aria-hidden
                  className="absolute top-7 left-4 size-3.5 rounded-full bg-background ring-[3px] ring-ink"
                />
                <button
                  type="button"
                  onClick={close}
                  aria-label={t('auth.close')}
                  className="absolute top-1 right-1 flex size-11 items-center justify-center text-xl text-card-muted-foreground hover:text-card-foreground"
                >
                  ×
                </button>
                <p className="text-[0.625rem] font-semibold tracking-[0.18em] text-ink uppercase">{printedLabel}</p>
                <h1 id={titleId} className="tag-title mt-1 mb-3.5 text-[2rem] leading-[0.92] text-balance">
                  {title}
                </h1>
                {children}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
