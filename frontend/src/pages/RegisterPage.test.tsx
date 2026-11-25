import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

function fillAndSubmit(email: string, password: string, confirmation = password, displayName = 'Bob') {
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: displayName },
  })
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText('Confirm the password'), {
    target: { value: confirmation },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create my account' }))
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('is linked from the login page', async () => {
    stubFetch(new Response(null, { status: 204 }))
    renderAt('/login')

    expect(await screen.findByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
  })

  it('keeps the page asked at login through the sign-up', async () => {
    stubFetch(new Response(null, { status: 201 }))
    renderAt('/login?redirect=/countries/FR')

    fireEvent.click(await screen.findByRole('link', { name: 'Create an account' }))
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
          displayName: 'Bob',
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
    ['invalid_display_name', 400, 'Your username must be 2 to 30 characters long.'],
    ['invalid_email', 400, 'This email address is invalid.'],
    ['rate_limited', 429, 'Too many attempts. Please try again later.'],
    ['internal_error', 500, 'Something went wrong. Please try again.'],
  ])('shows the message for %s', async (code, status, message) => {
    stubFetch(new Response(JSON.stringify({ code, message: '' }), { status }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678')

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('rejects two different passwords without calling the API', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 201 }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678', '12345679')

    expect(await screen.findByRole('alert')).toHaveTextContent('The two passwords differ.')
    expect(screen.getByLabelText('Confirm the password')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalledWith(REGISTER_URL, expect.anything())
  })

  it('sends the name and the email without the spaces around them', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 201 }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com ', '12345678', '12345678', ' Bob ')

    await screen.findByRole('heading', { name: 'Account created' })
    expect(fetchMock).toHaveBeenCalledWith(
      REGISTER_URL,
      expect.objectContaining({
        body: JSON.stringify({ displayName: 'Bob', email: 'bob@example.com', password: '12345678' }),
      }),
    )
  })

  it.each([
    ['missing', ''],
    ['too short', ' B '],
    ['too long', 'a'.repeat(31)],
  ])('rejects a name %s without calling the API', async (_case, displayName) => {
    const fetchMock = stubFetch(new Response(null, { status: 201 }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678', '12345678', displayName)

    expect(await screen.findByRole('alert')).toHaveTextContent('Your username must be 2 to 30 characters long.')
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalledWith(REGISTER_URL, expect.anything())
  })

  it('offers to log in when the address already has an account', async () => {
    stubFetch(Response.json({ code: 'email_taken', message: '' }, { status: 409 }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('You already have an account with this address.')
    expect(within(alert).getByRole('link', { name: 'Log in to see where it stands.' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('shows the pending account again on this browser, until starting over', async () => {
    stubFetch(new Response(null, { status: 201 }))
    renderRegisterPage()
    fillAndSubmit('bob@example.com', '12345678')
    await screen.findByRole('heading', { name: 'Account created' })
    cleanup()

    renderRegisterPage()
    expect(await screen.findByRole('heading', { name: 'Account created' })).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })

  it('moves to the next field on Enter instead of submitting', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 201 }))
    renderRegisterPage()
    const name = screen.getByLabelText('Username')
    const confirmation = screen.getByLabelText('Confirm the password')
    expect(name).toHaveAttribute('enterkeyhint', 'next')
    expect(confirmation).toHaveAttribute('enterkeyhint', 'go')

    fireEvent.keyDown(name, { key: 'Enter' })

    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalledWith(REGISTER_URL, expect.anything())
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
