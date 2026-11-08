import { useTranslation } from 'react-i18next'

import { useHealth } from '../hooks/useHealth.ts'

/** Shows whether the frontend can reach the API and the API its database. */
export function HealthPage() {
  const { t } = useTranslation()
  const state = useHealth()

  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <h1 className="mb-3 text-xl font-semibold">{t('health.title')}</h1>
      {state.kind === 'loading' && (
        <p className="text-muted-foreground">{t('health.checking')}</p>
      )}
      {state.kind === 'unreachable' && <p>{t('health.unreachable')}</p>}
      {state.kind === 'loaded' && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">{t('health.api')}</dt>
          <dd>{t(`health.status.${state.health.status}`)}</dd>
          <dt className="text-muted-foreground">{t('health.database')}</dt>
          <dd>{t(`health.databaseState.${state.health.database}`)}</dd>
        </dl>
      )}
    </section>
  )
}
