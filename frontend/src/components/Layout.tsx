import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'

import { LanguageSwitcher } from './LanguageSwitcher.tsx'

/**
 * Frame shared by every page: a translucent, blurred header floating over
 * the page (CLAUDE.md, Direction artistique), so the globe runs under it
 * up to the top of the screen. Its glass is neutral, not blue, to match
 * the graphite space around the globe. Text pages leave room for it with
 * PageContainer.
 */
export function Layout() {
  const { t } = useTranslation()

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="absolute inset-x-0 top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
          <Link to="/" className="text-lg font-semibold">
            {t('app.name')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        {/* React Router renders here the page that matches the URL. */}
        <Outlet />
      </main>
    </div>
  )
}
