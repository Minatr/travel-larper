import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { routes } from '../routes.ts'

function renderRegisterPage() {
  const router = createMemoryRouter(routes, { initialEntries: ['/register'] })
  render(<RouterProvider router={router} />)
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

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('is linked from the header', () => {
    renderRegisterPage()

    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/register',
    )
  })

  it('creates the account and shows the confirmation', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 201 }))
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678')

    expect(
      await screen.findByRole('heading', { name: 'Account created' }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/register',
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The password must be at least 8 characters long.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
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
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderRegisterPage()

    fillAndSubmit('bob@example.com', '12345678')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server cannot be reached. Check your connection and try again.',
    )
  })
})
