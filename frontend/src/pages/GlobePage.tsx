import { useCallback, useState } from 'react'
import { Outlet, useMatch, useNavigate } from 'react-router'

import { Globe } from '../components/Globe.tsx'
import { Starfield } from '../components/Starfield.tsx'
import type { CountryOutletContext } from '../lib/countryTransition.ts'

/**
 * Home page: the globe, under the floating header. A country page opens
 * above it in its outlet; the globe stays mounted to fly back on return.
 */
export function GlobePage() {
  const navigate = useNavigate()
  const countryOpen = useMatch('/countries/:code') !== null
  const [countryShown, setCountryShown] = useState(false)
  // A flight to a country is on: its page waits for the globe to land.
  const [flying, setFlying] = useState(false)

  function openCountry(code: string) {
    setCountryShown(false)
    setFlying(true)
    void navigate(`/countries/${code}`)
  }

  const onLanded = useCallback(() => setFlying(false), [])
  const onCountryShown = useCallback(() => setCountryShown(true), [])
  const context: CountryOutletContext = { flying, onCountryShown }

  return (
    <div className="globe-space relative flex-1">
      <Starfield />
      <Globe
        onOpenCountry={openCountry}
        onLanded={onLanded}
        countryOpen={countryOpen}
        countryShown={countryOpen && countryShown}
      />
      <Outlet context={context} />
    </div>
  )
}
