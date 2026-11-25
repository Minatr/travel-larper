import type { TFunction } from 'i18next'
import { type FormEvent, useState } from 'react'
import { Mail } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { AuthAlt, AuthError, AuthField, AuthLink, AuthSubmit, AuthTextButton } from '../components/AuthForm.tsx'
import type { AuthLinkState } from '../components/AccountButton.tsx'
import { AuthOverlay } from '../components/AuthOverlay.tsx'
import { type RegisterFailure, type RegisterState, useRegister } from '../hooks/useRegister.ts'
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type RegisterRequest,
} from '../models/auth.ts'

/** Link state turning the tag round, from this page to the login page. */
const TURN: AuthLinkState = { turn: true }

/**
 * Sign-up page, over the globe: the form, then the pending account, shown again on this browser until another account
 * is wanted.
 */
export function RegisterPage() {
  const { t } = useTranslation()
  const { state, submit, startOver } = useRegister()

  return state.kind === 'registered' ? (
    <AuthOverlay printed={t('register.printed')} title={t('register.success.title')}>
      <RegisterSuccess email={state.email} onStartOver={startOver} />
    </AuthOverlay>
  ) : (
    <AuthOverlay printed={t('register.printed')} title={t('register.title')}>
      <RegisterForm state={state} onSubmit={submit} />
    </AuthOverlay>
  )
}

function RegisterSuccess({ email, onStartOver }: { email: string; onStartOver: () => void }) {
  const { t } = useTranslation()
  // ?redirect= from the login page, handed back to it.
  const { search } = useLocation()

  return (
    <>
      <span className="tag-title inline-block -rotate-6 rounded-lg border-[3px] border-ink px-2.5 py-1 text-xl tracking-wide text-ink">
        {t('register.success.stamp')}
      </span>
      <p className="mt-3.5 mb-2.5 text-[0.8125rem] text-card-muted-foreground">{t('register.success.message')}</p>
      <p className="mb-3.5 flex items-start gap-2 rounded-lg bg-card-foreground/6 p-2.5 text-[0.8125rem]">
        <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-card-muted-foreground" />
        {/*
          TODO(TL-83): once emails are sent, "You will get an email at … as soon as it is approved", as in the mockup.
          Until then, no email is promised: only the address signed up with.
        */}
        <span className="min-w-0 break-words">
          <Trans i18nKey="register.success.signedUpWith" values={{ email }} components={{ b: <b /> }} />
        </span>
      </p>
      <AuthSubmit asChild>
        <Link to="/">{t('register.success.backToGlobe')}</Link>
      </AuthSubmit>
      <AuthAlt>
        <AuthLink to={{ pathname: '/login', search }} state={TURN} replace>
          {t('register.success.login')}
        </AuthLink>
      </AuthAlt>
      <AuthAlt>
        {t('register.success.wrongAddress')}{' '}
        <AuthTextButton onClick={onStartOver}>{t('register.success.startOver')}</AuthTextButton>
      </AuthAlt>
    </>
  )
}

function RegisterForm({
  state,
  onSubmit,
}: {
  state: RegisterState
  onSubmit: (request: RegisterRequest, confirmation: string) => Promise<void>
}) {
  const { t } = useTranslation()
  // Kept on the login links, so ?redirect= survives the detour.
  const { search } = useLocation()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const submitting = state.kind === 'submitting'
  const reason = state.kind === 'failed' ? state.reason : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({ displayName, email, password }, confirmation)
  }

  return (
    <>
      {/* noValidate: the browser's messages would ignore the app language. */}
      <form noValidate onSubmit={handleSubmit}>
        <AuthField
          id="register-display-name"
          next
          label={t('register.displayName')}
          // Not "username": password managers would save it as the login, which is the email.
          autoComplete="nickname"
          required
          hint={t('register.displayNameHint')}
          invalid={reason === 'invalid_display_name'}
          value={displayName}
          onChange={setDisplayName}
        />
        <AuthField
          id="register-email"
          next
          label={t('register.email')}
          type="email"
          autoComplete="email"
          required
          invalid={reason === 'invalid_email' || reason === 'email_taken'}
          value={email}
          onChange={setEmail}
        />
        <AuthField
          id="register-password"
          next
          label={t('register.password')}
          type="password"
          autoComplete="new-password"
          required
          hint={t('register.passwordHint', { min: PASSWORD_MIN_LENGTH })}
          invalid={reason === 'password_too_short' || reason === 'password_too_long'}
          value={password}
          onChange={setPassword}
        />
        <AuthField
          id="register-confirmation"
          label={t('register.confirmPassword')}
          type="password"
          autoComplete="new-password"
          required
          invalid={reason === 'password_mismatch'}
          value={confirmation}
          onChange={setConfirmation}
        />
        {reason === 'email_taken' ? (
          // The account exists: logging in shows whether it is still pending.
          <AuthError>
            {t('register.errors.emailTaken')}{' '}
            <AuthLink to={{ pathname: '/login', search }} state={TURN} replace>
              {t('register.errors.emailTakenLink')}
            </AuthLink>
          </AuthError>
        ) : (
          reason !== null && <AuthError>{errorMessage(t, reason)}</AuthError>
        )}
        <AuthSubmit type="submit" disabled={submitting}>
          {submitting ? t('register.submitting') : t('register.submit')}
        </AuthSubmit>
      </form>
      <AuthAlt>
        {t('register.hasAccount')}{' '}
        <AuthLink to={{ pathname: '/login', search }} state={TURN} replace>
          {t('register.loginLink')}
        </AuthLink>
      </AuthAlt>
    </>
  )
}

function errorMessage(t: TFunction, reason: RegisterFailure): string {
  switch (reason) {
    case 'invalid_display_name':
      return t('register.errors.invalidDisplayName', { min: DISPLAY_NAME_MIN_LENGTH, max: DISPLAY_NAME_MAX_LENGTH })
    case 'invalid_email':
      return t('register.errors.invalidEmail')
    case 'password_too_short':
      return t('register.errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH })
    case 'password_too_long':
      return t('register.errors.passwordTooLong', { max: PASSWORD_MAX_LENGTH })
    case 'password_mismatch':
      return t('register.errors.passwordMismatch')
    case 'rate_limited':
      return t('register.errors.rateLimited')
    case 'unreachable':
      return t('register.errors.unreachable')
    default:
      return t('register.errors.generic')
  }
}
