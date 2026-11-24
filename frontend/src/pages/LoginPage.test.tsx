import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CurrentUser } from '../models/auth.ts'
import { routes } from '../routes.ts'
import { stubFetch } from '../test/fetch.ts'

const user: CurrentUser = {
  id: '6f1c2a9e-0d4b-4c1e-9a55-2b7c3d4e5f60',
  email: 'bob@example.com',
  status: 'active',
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

async function fillAndSubmit(email: string, password: string) {
  fireEvent.change(await screen.findByLabelText('Email'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('logs in, then opens the page it was asked for', async () => {
    const fetchMock = stubFetch(Response.json(user))
    const router = renderAt('/login?redirect=/status')

    await fillAndSubmit('bob@example.com', '12345678')

    expect(
      await screen.findByRole('button', { name: 'Log out' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/status')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'bob@example.com',
          password: '12345678',
        }),
      }),
    )
  })

  it('ignores a redirect to another site', async () => {
    stubFetch(Response.json(user))
    const router = renderAt('/login?redirect=//evil.example')

    await fillAndSubmit('bob@example.com', '12345678')

    await screen.findByRole('button', { name: 'Log out' })
    expect(router.state.location.pathname).toBe('/')
  })

  it.each([
    ['invalid_credentials', 401, 'The email or the password is incorrect.'],
    ['rate_limited', 429, 'Too many attempts. Please try again later.'],
    ['internal_error', 500, 'Something went wrong. Please try again.'],
  ])('shows the message for %s', async (code, status, message) => {
    stubFetch(Response.json({ code, message: '' }, { status }))
    renderAt('/login')

    await fillAndSubmit('bob@example.com', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('tells the user when the server cannot be reached', async () => {
    stubFetch(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/login')

    await fillAndSubmit('bob@example.com', '12345678')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server cannot be reached. Check your connection and try again.',
    )
  })
})

describe('header account action', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('offers to log in to a visitor', async () => {
    stubFetch(new Response(null, { status: 204 }))
    renderAt('/status')

    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('logs a user out', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }), user)
    renderAt('/status')

    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(
      await screen.findByRole('link', { name: 'Log in' }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
    })
  })

  it('logs a user out even when the server fails', async () => {
    stubFetch(
      Response.json({ code: 'internal_error', message: '' }, { status: 500 }),
      user,
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/status')

    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(
      await screen.findByRole('link', { name: 'Log in' }),
    ).toBeInTheDocument()
  })
})
