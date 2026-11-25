import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useMatch } from 'react-router'

import { useAuth } from '../hooks/useAuth.ts'
import { cn } from '../lib/utils.ts'
import { AccountButton } from './AccountButton.tsx'
import { AuthProvider } from './AuthProvider.tsx'
import { HeaderContext } from './headerContext.ts'

/**
 * Frame shared by every page: a header floating over the page, so the globe runs under it up to the top of the screen.
 * It is no bar, just paper labels (CLAUDE.md, Direction artistique): the logo, a small luggage tag, and the account
 * button. No language switch: a visitor gets the browser's language, a user will pick it in the profile (TL-25). Text
 * pages leave room for it with PageContainer. There is no logo on the globe and its country pages: the globe is the
 * home page, the search takes its corner, and a country page has its own way back. Nor any account on a country page:
 * its name takes the whole row. A page can also hide all the labels (HeaderContext).
 */
export function Layout() {
  const { t } = useTranslation()
  // Both hooks always run: no `||` between them.
  const onGlobeHome = useMatch('/') !== null
  const onCountryPage = useMatch('/countries/:code') !== null
  const onLogin = useMatch('/login') !== null
  const onRegister = useMatch('/register') !== null
  const onGlobe = onGlobeHome || onCountryPage
  const [hiddenByPage, setHiddenByPage] = useState(false)
  const logoGone = onGlobe || hiddenByPage
  const accountGone = onCountryPage || hiddenByPage
  // On a computer the login and sign-up tags sit in the middle of the screen, over the globe: the logo would only clash
  // with the background. On a phone it stays, above the tag.
  const logoGoneOnComputer = onLogin || onRegister

  return (
    <AuthProvider>
      <div className="relative flex min-h-dvh flex-col">
        {/* Clicks between the labels reach the globe below. */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
          {/*
            Drooping to the right, like a tag hanging from its eyelet; smaller on a phone, where it would hide the globe
            (its padding keeps a 44 px touch target around the smaller label). Out of reach once gone.
          */}
          <Link
            to="/"
            inert={logoGone}
            className={cn(
              'pointer-events-auto origin-left rotate-2 py-1.5 drop-shadow-lg sm:py-0 transition duration-300 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
              logoGone && '-translate-y-20 -rotate-6 opacity-0',
              logoGoneOnComputer && 'sm:invisible sm:-translate-y-20 sm:-rotate-6 sm:opacity-0',
            )}
          >
            <span className="tag-label-left tag-title flex min-h-8 items-center gap-2 bg-card pr-3 pl-3.5 text-sm tracking-wide text-card-foreground sm:min-h-11 sm:gap-2.5 sm:pr-3.5 sm:pl-4 sm:text-lg">
              <span aria-hidden className="size-2 rounded-full bg-background ring-2 ring-ink" />
              {t('app.name')}
            </span>
          </Link>
          <nav
            inert={accountGone}
            className={cn(
              'pointer-events-auto flex items-center gap-2 transition duration-300 ease-out motion-reduce:transition-none',
              accountGone && '-translate-y-20 opacity-0',
            )}
          >
            <AccountButton />
          </nav>
        </header>
        <AuthNoticeNote />
        <main className="flex flex-1 flex-col">
          {/* React Router renders here the page that matches the URL. */}
          <HeaderContext value={setHiddenByPage}>
            <Outlet />
          </HeaderContext>
        </main>
      </div>
    </AuthProvider>
  )
}

// Confirms a login or a logout. Always there, empty when silent: a live region only reads out what changes inside it.
function AuthNoticeNote() {
  const { t } = useTranslation()
  const { notice } = useAuth()

  return (
    <p
      role="status"
      className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4 text-sm font-medium"
    >
      {notice !== null && (
        <span className="tag-appear rounded-md bg-card px-3 py-2 text-card-foreground shadow-lg">
          {notice === 'signedIn' ? t('nav.loggedIn') : t('nav.loggedOut')}
        </span>
      )}
    </p>
  )
}
