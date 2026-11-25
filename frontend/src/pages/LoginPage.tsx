import type { TFunction } from 'i18next'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { AuthAlt, AuthError, AuthField, AuthLink, AuthSubmit, AuthTextButton } from '../components/AuthForm.tsx'
import type { AuthLinkState } from '../components/AccountButton.tsx'
import { AuthOverlay } from '../components/AuthOverlay.tsx'
import { type LoginFailure, useLogin } from '../hooks/useLogin.ts'

/** Login page, over the globe; opens the page given by `?redirect=` once logged in. */
export function LoginPage() {
  const { t } = useTranslation()
  const { state, submit } = useLogin()
  // Kept on the sign-up link, so ?redirect= survives a detour to sign up.
  const { search } = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotShown, setForgotShown] = useState(false)
  const submitting = state.kind === 'submitting'
  const failed = state.kind === 'failed'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit({ email, password })
  }

  return (
    <AuthOverlay printed={t('login.printed')} title={t('login.title')}>
      {/* noValidate: the browser's messages would ignore the app language. */}
      <form noValidate onSubmit={handleSubmit}>
        <AuthField
          id="login-email"
          next
          label={t('login.email')}
          type="email"
          autoComplete="email"
          required
          invalid={failed}
          value={email}
          onChange={setEmail}
        />
        <AuthField
          id="login-password"
          label={t('login.password')}
          type="password"
          autoComplete="current-password"
          required
          invalid={failed}
          value={password}
          onChange={setPassword}
        />
        {/* TODO(TL-83): lead to the real reset form. Until passwords can be reset by email, the admin does it. */}
        <div className="-mt-1 mb-2.5 text-right text-[0.8125rem]">
          <AuthTextButton
            aria-expanded={forgotShown}
            aria-controls="login-forgot"
            onClick={() => setForgotShown((shown) => !shown)}
          >
            {t('login.forgotPassword')}
          </AuthTextButton>
          <p id="login-forgot" hidden={!forgotShown} className="mt-1 text-card-muted-foreground">
            {t('login.forgotPasswordHelp')}
          </p>
        </div>
        {failed && <AuthError>{errorMessage(t, state.reason)}</AuthError>}
        <AuthSubmit type="submit" disabled={submitting}>
          {submitting ? t('login.submitting') : t('login.submit')}
        </AuthSubmit>
      </form>
      <AuthAlt>
        {t('login.noAccount')}{' '}
        {/* Replacing the page: closing the sign-up page goes back to where the login started. */}
        <AuthLink to={{ pathname: '/register', search }} state={{ turn: true } satisfies AuthLinkState} replace>
          {t('login.registerLink')}
        </AuthLink>
      </AuthAlt>
    </AuthOverlay>
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
