import { LogIn, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Link, Outlet, useMatch } from 'react-router'

import { useAuth } from '../hooks/useAuth.ts'
import { cn } from '../lib/utils.ts'
import { AuthProvider } from './AuthProvider.tsx'
import { LanguageSwitcher } from './LanguageSwitcher.tsx'

const headerLabelClass =
  'tag-title flex min-h-11 min-w-11 items-center justify-center rounded-md bg-card px-3 text-base text-card-muted-foreground shadow-lg hover:text-card-foreground'

/**
 * Frame shared by every page: a header floating over the page, so the globe
 * runs under it up to the top of the screen. It is no bar, just two paper
 * labels (CLAUDE.md, Direction artistique): the logo, a small luggage tag,
 * and the language switch. Text pages leave room for it with PageContainer.
 * On a country page the logo flies away: it would only take room there,
 * and the page has its own way back to the globe.
 */
export function Layout() {
  const { t } = useTranslation()
  const countryOpen = useMatch('/countries/:code') !== null

  return (
    <AuthProvider>
      <div className="relative flex min-h-dvh flex-col">
        {/* Clicks between the labels reach the globe below. */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
          {/*
          Drooping to the right, like a tag hanging from its eyelet; smaller on
          a phone, where it would hide the globe (its padding keeps a 44 px
          touch target around the smaller label). Out of reach once gone.
        */}
          <Link
            to="/"
            inert={countryOpen}
            className={cn(
              'pointer-events-auto origin-left rotate-2 py-1.5 drop-shadow-lg sm:py-0 transition duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none',
              countryOpen && '-translate-y-20 -rotate-6 opacity-0',
            )}
          >
            <span className="tag-label-left tag-title flex min-h-8 items-center gap-2 bg-card pr-3 pl-3.5 text-sm tracking-wide text-card-foreground sm:min-h-11 sm:gap-2.5 sm:pr-3.5 sm:pl-4 sm:text-lg">
              <span aria-hidden className="size-2 rounded-full bg-background ring-2 ring-ink" />
              {t('app.name')}
            </span>
          </Link>
          <nav className="pointer-events-auto flex items-center gap-2">
            <AccountAction />
            <LanguageSwitcher />
          </nav>
        </header>
        <main className="flex flex-1 flex-col">
          {/* React Router renders here the page that matches the URL. */}
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  )
}

function AccountAction() {
  const { t } = useTranslation()
  const { state, signOut } = useAuth()

  switch (state.status) {
    case 'loading':
      return null
    case 'anonymous':
      return (
        <Link to="/login" className={headerLabelClass}>
          <AccountLabel icon={<LogIn />} text={t('nav.login')} />
        </Link>
      )
    case 'authenticated':
      return (
        <button type="button" onClick={() => void signOut()} className={headerLabelClass}>
          <AccountLabel icon={<LogOut />} text={t('nav.logout')} />
        </button>
      )
  }
}

// An icon on a phone, where the text would not fit next to the logo and
// the language switch; the text stays readable by screen readers.
function AccountLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <>
      <span aria-hidden className="sm:hidden [&_svg]:size-5">
        {icon}
      </span>
      <span className="sr-only sm:not-sr-only">{text}</span>
    </>
  )
}
