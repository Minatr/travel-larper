import { useCallback, useRef, useState } from 'react'
import { Outlet, useMatch, useNavigate, useSearchParams } from 'react-router'

import { Globe } from '../components/Globe.tsx'
import type { CountryOutletContext } from '../lib/countryTransition.ts'
import type { Camera } from '../lib/mercatorCamera.ts'
import type { InsetId } from '../lib/territories.ts'

/**
 * Home page: the globe, under the floating header. A country page opens above it in its outlet; the globe stays mounted
 * to fly back on return.
 */
export function GlobePage() {
  const navigate = useNavigate()
  const countryMatch = useMatch('/countries/:code')
  const countryOpen = countryMatch !== null
  const [searchParams] = useSearchParams()
  const openPlace =
    countryMatch === null
      ? null
      : { code: (countryMatch.params.code ?? '').toUpperCase(), territory: searchParams.get('territory') }
  const [countryShown, setCountryShown] = useState(false)
  // A flight to a country is on: its page waits for the globe to land.
  const [flying, setFlying] = useState(false)
  // Camera of the country's map, for the globe to fly back from: a ref, as it changes on every move and only the way
  // back reads it.
  const mapCameraRef = useRef<Camera | null>(null)
  // Set by the globe, to follow that camera under the page.
  const followMapRef = useRef<() => void>(() => {})

  function openCountry(code: string, territory: InsetId | null) {
    mapCameraRef.current = null
    setCountryShown(false)
    setFlying(true)
    void navigate(territory === null ? `/countries/${code}` : `/countries/${code}?territory=${territory}`)
  }

  const onLanded = useCallback(() => setFlying(false), [])
  const onCountryShown = useCallback(() => setCountryShown(true), [])
  const onMapMove = useCallback((camera: Camera) => {
    mapCameraRef.current = camera
    followMapRef.current()
  }, [])
  const context: CountryOutletContext = { flying, onCountryShown, onMapMove }

  return (
    <div className="globe-space relative flex-1">
      <Globe
        onOpenCountry={openCountry}
        onLanded={onLanded}
        countryOpen={countryOpen}
        countryShown={countryOpen && countryShown}
        openPlace={openPlace}
        mapCameraRef={mapCameraRef}
        followMapRef={followMapRef}
      />
      <Outlet context={context} />
    </div>
  )
}
