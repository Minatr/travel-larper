import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { PageContainer } from '../components/PageContainer.tsx'

/** Shown for any URL that matches no route. */
export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <PageContainer>
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">{t('notFound.title')}</h1>
        <p className="text-muted-foreground">{t('notFound.message')}</p>
        <Link
          to="/"
          className="text-primary underline-offset-4 hover:underline"
        >
          {t('notFound.backHome')}
        </Link>
      </section>
    </PageContainer>
  )
}
