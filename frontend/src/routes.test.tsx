import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { routes } from './routes.ts'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

// Serves one square country with the given code: in the countries file,
// and as its own detailed shape.
function stubCountries(code: string) {
  const square = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 45],
        [5, 45],
        [5, 50],
        [0, 50],
        [0, 45],
      ],
    ],
  }
  const countries = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { code, colorGroup: 1 },
        geometry: square,
      },
    ],
  }
  // A new Response per call: the globe and the country page both fetch the
  // countries file, and a body can be read only once.
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        url === `/geo/countries/${code}.json`
          ? new Response(JSON.stringify(square))
          : url === '/geo/countries.json'
            ? new Response(JSON.stringify(countries))
            : new Response(null, { status: 404 }),
      ),
    ),
  )
}

describe('routes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows the not found page for an unknown URL', () => {
    renderAt('/does-not-exist')

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows the globe on the home page', () => {
    // The globe loads the country shapes: no server in the tests.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderAt('/')

    expect(
      screen.getByRole('region', { name: 'World globe' }),
    ).toBeInTheDocument()
  })

  it('shows the map of a country on /countries/:code', async () => {
    stubCountries('FR')

    renderAt('/countries/FR')

    expect(
      await screen.findByRole('region', { name: 'Map of France' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Globe' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows the not found page for an unknown country code', async () => {
    stubCountries('FR')

    renderAt('/countries/XX')

    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
  })

  it('shows the not found page for a malformed country code', async () => {
    stubCountries('FR')

    renderAt('/countries/..%2Ffr')

    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/geo/countries/..'),
      expect.anything(),
    )
  })

  it('shows the health page, translated, on /status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderAt('/status')

    expect(
      screen.getByRole('heading', { name: 'Service status' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('The API is unreachable.'),
    ).toBeInTheDocument()
  })

  it('switches to French with the language switcher and remembers it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/does-not-exist')

    fireEvent.click(screen.getByRole('button', { name: 'Français' }))

    expect(
      await screen.findByRole('heading', { name: 'Page introuvable' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(window.localStorage.getItem('language')).toBe('fr')
  })
})
