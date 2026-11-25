import { LogOut, UserRound } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useAuth } from '../hooks/useAuth.ts'
import { cn } from '../lib/utils.ts'

/**
 * What the login and sign-up pages read from the link's state (AuthOverlay): opened from this button, the tag is
 * printed; reached from the other page, it turns round.
 */
export type AuthLinkState = { fromAccountButton?: true; turn?: true }

// 48 px: above the 44 px minimum touch target, and big enough to spot in the corner.
const squareClass =
  'flex size-12 items-center justify-center rounded-[10px] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/**
 * The account, top right of the header, with no text. A visitor gets a paper icon leading to the login page; a user
 * gets their initial on black, opening a small paper menu: log out, until the profile page exists (TL-25).
 */
export function AccountButton() {
  const { t } = useTranslation()
  const { state, signOut } = useAuth()

  switch (state.status) {
    case 'loading':
      // Holds the place, so the header does not jump once the answer comes.
      return <span aria-hidden className="size-12" />
    case 'anonymous':
      return (
        <Link
          to="/login"
          state={{ fromAccountButton: true } satisfies AuthLinkState}
          aria-label={t('nav.login')}
          className={cn(squareClass, 'bg-card text-card-foreground')}
        >
          <UserRound aria-hidden className="size-6" />
        </Link>
      )
    case 'authenticated':
      // TODO(TL-25): lead to the profile page, with the profile photo instead of the initial.
      // TODO(TL-22): show an account that is not active (pending, refused, suspended) and lead to its page.
      return (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label={t('nav.account', { name: state.user.displayName })}
            // A cream edge, like a photo's border: black alone melted into the dark space.
            className={cn(squareClass, 'tag-title bg-primary text-xl text-primary-foreground ring-2 ring-card')}
          >
            {initialOf(state.user.displayName)}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-30 w-60 rounded-[10px] bg-card p-1.5 text-sm text-card-foreground shadow-2xl"
            >
              <DropdownMenu.Label className="px-2.5 pt-2 pb-1">
                <span className="block truncate font-semibold">{state.user.displayName}</span>
                <span className="block truncate text-xs text-card-muted-foreground">{state.user.email}</span>
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="mx-1 my-1.5 h-px bg-card-foreground/10" />
              <DropdownMenu.Item
                onSelect={() => void signOut()}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2.5 outline-none data-highlighted:bg-selection data-highlighted:text-selection-foreground"
              >
                <LogOut aria-hidden className="size-4.5" />
                {t('nav.logout')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )
  }
}

// The name's first character stands for the user, until the profile photo (TL-25). Spread, not charAt: an emoji
// spans two UTF-16 units.
function initialOf(displayName: string): string {
  return ([...displayName][0] ?? '').toUpperCase()
}
