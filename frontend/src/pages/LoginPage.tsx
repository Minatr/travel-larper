import type { TFunction } from 'i18next'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { PageContainer } from '../components/PageContainer.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { Label } from '../components/ui/label.tsx'
import { type LoginFailure, useLogin } from '../hooks/useLogin.ts'

/** Login page; opens the page given by `?redirect=` once logged in. */
export function LoginPage() {
  const { t } = useTranslation()
  const { state, submit } = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const submitting = state.kind === 'submitting'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit({ email, password })
  }

  return (
    <PageContainer>
      <section className="mx-auto max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="mb-6 text-xl font-semibold">{t('login.title')}</h1>
        {/* noValidate: the browser's messages would ignore the app language. */}
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-email">{t('login.email')}</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-password">{t('login.password')}</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {state.kind === 'failed' && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(t, state.reason)}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="min-h-11">
            {submitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="font-medium underline">
            {t('login.registerLink')}
          </Link>
        </p>
      </section>
    </PageContainer>
  )
}

function errorMessage(t: TFunction, reason: LoginFailure): string {
  switch (reason) {
    case 'invalid_credentials':
      return t('login.errors.invalidCredentials')
    case 'rate_limited':
      return t('login.errors.rateLimited')
    case 'unreachable':
      return t('login.errors.unreachable')
    default:
      return t('login.errors.generic')
  }
}
