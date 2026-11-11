import { useCallback, useState } from 'react'
import { Outlet, useMatch, useNavigate } from 'react-router'

import { Globe } from '../components/Globe.tsx'
import {
  type CountryOutletContext,
  FROM_GLOBE,
} from '../lib/countryTransition.ts'

/**
 * Home page: the globe, under the floating header. A country page opens
 * above it in its outlet; the globe stays mounted to fly back on return.
 */
export function GlobePage() {
  const navigate = useNavigate()
  const countryOpen = useMatch('/countries/:code') !== null
  const [countryShown, setCountryShown] = useState(false)

  function openCountry(code: string) {
    setCountryShown(false)
    void navigate(`/countries/${code}`, { state: FROM_GLOBE })
  }

  const onCountryShown = useCallback(() => setCountryShown(true), [])
  const context: CountryOutletContext = { onCountryShown }

  return (
    <div className="globe-space relative flex-1">
      <Globe
        onOpenCountry={openCountry}
        countryOpen={countryOpen}
        countryShown={countryOpen && countryShown}
      />
      <Outlet context={context} />
    </div>
  )
}
