import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { routes } from './routes.ts'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

// Serves one square country with the given code: in the countries file, and as its own detailed shape (with more parts
// if given).
function stubCountries(code: string, otherParts: number[][][][] = []) {
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
  // A new Response per call: the globe and the country page both fetch the countries file, and a body can be read only
  // once.
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        url === `/api/countries/${code}?lang=en`
          ? Response.json({
              code,
              currencies: ['EUR'],
              languages: [{ code: 'fr', name: 'French' }],
              summary: { status: 'available', text: 'A country of Western Europe.', url: 'https://w/France' },
            })
          : url === `/geo/countries/${code}.json`
            ? new Response(JSON.stringify({ type: 'MultiPolygon', coordinates: [square.coordinates, ...otherParts] }))
            : url === '/geo/countries.json'
              ? new Response(JSON.stringify(countries))
              : url === `/geo/borders/${code}.json`
                ? new Response('null')
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

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })

  it('shows the globe on the home page', () => {
    // The globe loads the country shapes: no server in the tests.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderAt('/')

    expect(screen.getByRole('region', { name: 'World globe' })).toBeInTheDocument()
  })

  it('shows the map of a country on /countries/:code', async () => {
    stubCountries('FR')

    renderAt('/countries/FR')

    expect(await screen.findByRole('region', { name: 'Map of France' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the globe' })).toHaveAttribute('href', '/')
  })

  it("shows the country's facts and Wikivoyage summary in its panel", async () => {
    stubCountries('FR')

    renderAt('/countries/FR')

    const panel = await screen.findByRole('region', { name: 'France' })
    expect(await within(panel).findByText('A country of Western Europe.')).toBeInTheDocument()
    expect(within(panel).getAllByText('Euro · €').length).toBeGreaterThan(0)
    expect(within(panel).getAllByText('French').length).toBeGreaterThan(0)
    expect(within(panel).getByRole('link', { name: 'Wikivoyage' })).toHaveAttribute('href', 'https://w/France')
  })

  it('opens on a distant territory with ?territory=, and leads back to the mainland', async () => {
    const reunion = [
      [
        [55.3, -21.3],
        [55.8, -21.3],
        [55.8, -20.9],
        [55.3, -20.9],
        [55.3, -21.3],
      ],
    ]
    stubCountries('FR', [reunion])

    renderAt('/countries/FR?territory=reunion')

    expect(await screen.findByRole('heading', { name: 'France · Réunion' })).toBeInTheDocument()
    const insets = screen.getByRole('navigation', { name: 'Distant territory' })
    // Its own thumbnail gives way to the mainland's.
    expect(within(insets).queryByRole('link', { name: 'Réunion' })).not.toBeInTheDocument()
    expect(within(insets).getByRole('link', { name: /^France/ })).toHaveAttribute('href', '/countries/FR')
  })

  it('ignores an unknown territory', async () => {
    stubCountries('FR')

    renderAt('/countries/FR?territory=nowhere')

    expect(await screen.findByRole('heading', { name: 'France' })).toBeInTheDocument()
  })

  it('shows the not found page for an unknown country code, without warning about its missing borders', async () => {
    stubCountries('FR')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderAt('/countries/XX')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(warn).not.toHaveBeenCalled()
  })

  it('shows the not found page for a malformed country code', async () => {
    stubCountries('FR')

    renderAt('/countries/..%2Ffr')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/geo/countries/..'), expect.anything())
  })

  it('shows the health page, translated, on /status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderAt('/status')

    expect(screen.getByRole('heading', { name: 'Service status' })).toBeInTheDocument()
    expect(await screen.findByText('The API is unreachable.')).toBeInTheDocument()
  })

  it('switches to French with the language switcher and remembers it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/does-not-exist')

    fireEvent.click(screen.getByRole('button', { name: 'Français' }))

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem('language')).toBe('fr')
  })
})
