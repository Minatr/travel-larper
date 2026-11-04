import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'

import { LanguageSwitcher } from './LanguageSwitcher.tsx'

/**
 * Frame shared by every page: header with the app name and the language
 * switcher, then the page.
 */
export function Layout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
          <Link to="/" className="text-lg font-semibold">
            {t('app.name')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* React Router renders here the page that matches the URL. */}
        <Outlet />
      </main>
    </div>
  )
}
