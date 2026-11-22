import { afterEach, describe, expect, it, vi } from 'vitest'

// The download is kept for the whole app: each test loads the module anew.
async function freshFetchCountries() {
  vi.resetModules()
  const { fetchCountries } = await import('./countries.ts')
  return fetchCountries
}

const countries = { type: 'FeatureCollection', features: [] }

describe('fetchCountryBorders', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gives null for a country masked with its shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('null'))),
    )
    const { fetchCountryBorders } = await import('./countries.ts')

    await expect(fetchCountryBorders('RU')).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledWith('/geo/borders/RU.json', { signal: undefined })
  })

  it('fails on a failed download', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))),
    )
    const { fetchCountryBorders } = await import('./countries.ts')

    await expect(fetchCountryBorders('VA')).rejects.toThrow('HTTP 404')
  })
})

describe('fetchCountries', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('downloads the countries once for every caller', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(countries))))
    vi.stubGlobal('fetch', fetchMock)
    const fetchCountries = await freshFetchCountries()

    const [first, second] = await Promise.all([fetchCountries(), fetchCountries()])

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(second).toBe(first)
  })

  it('tries again after a failed download', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(countries)))
    vi.stubGlobal('fetch', fetchMock)
    const fetchCountries = await freshFetchCountries()

    await expect(fetchCountries()).rejects.toThrow('HTTP 503')
    await expect(fetchCountries()).resolves.toEqual(countries)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
