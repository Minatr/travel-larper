/**
 * The pieces of the login and sign-up tags (AuthOverlay): fields with labels printed in ink, the black submit button,
 * and the links under it, in the paper's colors.
 */
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '../lib/utils.ts'
import { Button } from './ui/button.tsx'

const LINK_CLASS = 'font-semibold text-card-foreground underline underline-offset-2'

/** Props of {@link AuthField}: those of an input, with its label, an optional hint and a plain onChange. */
type AuthFieldProps = Omit<ComponentProps<'input'>, 'id' | 'onChange' | 'value'> & {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  invalid?: boolean
  /** Not the last field: Enter (the keyboard's "Next" key on a phone) moves to the next field instead of submitting. */
  next?: boolean
}

/** A form field on paper: printed label, 44 px high box, turquoise focus, red when invalid. */
export function AuthField({
  id,
  label,
  value,
  onChange,
  hint,
  invalid = false,
  next = false,
  ...input
}: AuthFieldProps) {
  const hintId = `${id}-hint`
  return (
    <div className="mb-2.5">
      <label htmlFor={id} className="mb-1 block text-[0.625rem] font-semibold tracking-[0.18em] text-ink uppercase">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={hint === undefined ? undefined : hintId}
        enterKeyHint={next ? 'next' : 'go'}
        onKeyDown={next ? focusNextField : undefined}
        // The browser paints autofilled fields grey-blue: an inset shadow of the field's color covers it. 16 px on a
        // phone: below that, iOS Safari zooms in on the focused field and does not zoom back out.
        className="block min-h-11 w-full rounded-md bg-field px-3 autofill:shadow-[inset_0_0_0_100px_var(--field)] autofill:[-webkit-text-fill-color:var(--card-foreground)] text-base text-card-foreground sm:text-[0.9375rem] ring-1 ring-card-foreground/20 outline-none ring-inset focus-visible:ring-2 focus-visible:ring-selection aria-invalid:ring-2 aria-invalid:ring-destructive"
        {...input}
      />
      {hint !== undefined && (
        <p id={hintId} className="mt-1 text-xs text-card-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

// The keyboard's label alone changes nothing: Enter in a form still submits it.
function focusNextField(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== 'Enter') {
    return
  }
  const fields = [...(event.currentTarget.form?.querySelectorAll('input') ?? [])]
  const nextField = fields[fields.indexOf(event.currentTarget) + 1]
  if (nextField !== undefined) {
    event.preventDefault()
    nextField.focus()
  }
}

/** The tag's main action, black, full width (or a link styled like it, with `asChild`). */
export function AuthSubmit(props: ComponentProps<typeof Button>) {
  return <Button {...props} className={cn('tag-title min-h-11 w-full rounded-lg text-[1.0625rem]', props.className)} />
}

/** A short line under the action ("No account yet? Create an account"). */
export function AuthAlt({ children }: { children: ReactNode }) {
  return <p className="mt-3.5 text-center text-[0.8125rem] text-card-muted-foreground">{children}</p>
}

/** A link in the tag's text. */
export function AuthLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} className={LINK_CLASS} />
}

/** A button that reads like a link, for an action that stays on the page. */
export function AuthTextButton(props: Omit<ComponentProps<'button'>, 'type' | 'className'>) {
  return <button type="button" {...props} className={LINK_CLASS} />
}

/** The form's error, read out as soon as it shows. */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mb-2.5 text-sm text-destructive">
      {children}
    </p>
  )
}
