import type { TFunction } from 'i18next'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { PageContainer } from '../components/PageContainer.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { Label } from '../components/ui/label.tsx'
import {
  type RegisterFailure,
  type RegisterState,
  useRegister,
} from '../hooks/useRegister.ts'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type RegisterRequest,
} from '../models/auth.ts'

/** Sign-up page: the form, then a confirmation once the account is created. */
export function RegisterPage() {
  const { state, submit } = useRegister()

  return (
    <PageContainer>
      <section className="mx-auto max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        {state.kind === 'registered' ? (
          <RegisterSuccess />
        ) : (
          <RegisterForm state={state} onSubmit={submit} />
        )}
      </section>
    </PageContainer>
  )
}

function RegisterSuccess() {
  const { t } = useTranslation()

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">
        {t('register.success.title')}
      </h1>
      <p className="mb-4 text-muted-foreground">
        {t('register.success.message')}
      </p>
      <Link to="/" className="text-sm font-medium underline">
        {t('register.success.backHome')}
      </Link>
    </>
  )
}

function RegisterForm({
  state,
  onSubmit,
}: {
  state: RegisterState
  onSubmit: (request: RegisterRequest) => Promise<void>
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const submitting = state.kind === 'submitting'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({ email, password })
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">{t('register.title')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('register.intro')}
      </p>
      {/* noValidate: the browser's messages would ignore the app language. */}
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="register-email">{t('register.email')}</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="register-password">{t('register.password')}</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            aria-describedby="register-password-hint"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p
            id="register-password-hint"
            className="text-sm text-muted-foreground"
          >
            {t('register.passwordHint', { min: PASSWORD_MIN_LENGTH })}
          </p>
        </div>
        {state.kind === 'failed' && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(t, state.reason)}
          </p>
        )}
        <Button type="submit" disabled={submitting} className="min-h-11">
          {submitting ? t('register.submitting') : t('register.submit')}
        </Button>
      </form>
    </>
  )
}

function errorMessage(t: TFunction, reason: RegisterFailure): string {
  switch (reason) {
    case 'invalid_email':
      return t('register.errors.invalidEmail')
    case 'password_too_short':
      return t('register.errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH })
    case 'password_too_long':
      return t('register.errors.passwordTooLong', { max: PASSWORD_MAX_LENGTH })
    case 'email_taken':
      return t('register.errors.emailTaken')
    case 'rate_limited':
      return t('register.errors.rateLimited')
    case 'unreachable':
      return t('register.errors.unreachable')
    default:
      return t('register.errors.generic')
  }
}
