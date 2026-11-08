import { Globe } from '../components/Globe.tsx'

// TODO(TL-32): open the country: zoom in, then show its 2D map.
function openCountry(code: string) {
  console.info('open country', code)
}

/** Home page: the globe, full screen, under the floating header. */
export function GlobePage() {
  return (
    <div className="globe-space relative flex-1">
      <Globe onSelectCountry={openCountry} />
    </div>
  )
}
