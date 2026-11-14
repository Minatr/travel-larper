import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useMatch } from 'react-router'

import { cn } from '../lib/utils.ts'
import { HeaderContext } from './headerContext.ts'
import { LanguageSwitcher } from './LanguageSwitcher.tsx'

/**
 * Frame shared by every page: a header floating over the page, so the globe
 * runs under it up to the top of the screen. It is no bar, just two paper
 * labels (CLAUDE.md, Direction artistique): the logo, a small luggage tag,
 * and the language switch. Text pages leave room for it with PageContainer.
 * On a country page the logo flies away: it would only take room there,
 * and the page has its own way back to the globe. A page can also hide
 * both labels (HeaderContext).
 */
export function Layout() {
  const { t } = useTranslation()
  const countryOpen = useMatch('/countries/:code') !== null
  const [hiddenByPage, setHiddenByPage] = useState(false)
  const logoGone = countryOpen || hiddenByPage

  return (
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
          inert={logoGone}
          className={cn(
            'pointer-events-auto origin-left rotate-2 py-1.5 drop-shadow-lg sm:py-0 transition duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
            logoGone && '-translate-y-20 -rotate-6 opacity-0',
          )}
        >
          <span className="tag-label-left tag-title flex min-h-8 items-center gap-2 bg-card pr-3 pl-3.5 text-sm tracking-wide text-card-foreground sm:min-h-11 sm:gap-2.5 sm:pr-3.5 sm:pl-4 sm:text-lg">
            <span
              aria-hidden
              className="size-2 rounded-full bg-background ring-2 ring-ink"
            />
            {t('app.name')}
          </span>
        </Link>
        <div
          inert={hiddenByPage}
          className={cn(
            'pointer-events-auto transition duration-300 ease-out',
            hiddenByPage && '-translate-y-20 opacity-0',
          )}
        >
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        {/* React Router renders here the page that matches the URL. */}
        <HeaderContext value={setHiddenByPage}>
          <Outlet />
        </HeaderContext>
      </main>
    </div>
  )
}
