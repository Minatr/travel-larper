import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { routes } from '../routes.ts'
import { stubFetch } from '../test/fetch.ts'

const REGISTER_URL = '/api/auth/register'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

function renderRegisterPage() {
  renderAt('/register')
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('is linked from the login page', async () => {
    stubFetch(new Response(null, { status: 204 }))
    renderAt('/login')

    expect(await screen.findByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register')
  })

  it('keeps the page asked at login through the sign-up', async () => {
    stubFetch(new Response(null, { status: 201 }))
    renderAt('/login?redirect=/countries/FR')

    fireEvent.click(await screen.findByRole('link', { name: 'Sign up' }))
    fillAndSubmit('bob@example.com', '12345678')
    await screen.findByRole('heading', { name: 'Account created' })

    // The header has its own "Log in" link: the one under test is the page's.
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?redirect=/countries/FR',
    )
  })

  it('creates the account and shows the confirmation', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 201 }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678')

    expect(await screen.findByRole('heading', { name: 'Account created' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      REGISTER_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'bob@example.com',
          password: '12345678',
        }),
      }),
    )
  })

  it('rejects a short password without calling the API', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 201 }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '1234567')

    expect(await screen.findByRole('alert')).toHaveTextContent('The password must be at least 8 characters long.')
    expect(fetchMock).not.toHaveBeenCalledWith(REGISTER_URL, expect.anything())
  })

  it.each([
    ['email_taken', 409, 'An account already exists with this email address.'],
    ['invalid_email', 400, 'This email address is invalid.'],
    ['rate_limited', 429, 'Too many attempts. Please try again later.'],
    ['internal_error', 500, 'Something went wrong. Please try again.'],
  ])('shows the message for %s', async (code, status, message) => {
    stubFetch(new Response(JSON.stringify({ code, message: '' }), { status }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678')

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('tells the user when the server cannot be reached', async () => {
    stubFetch(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server cannot be reached. Check your connection and try again.',
    )
  })
})
