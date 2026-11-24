/**
 * Downloads the map sources (about 30 MB of Natural Earth, plus OpenStreetMap's borders) into data/geo/ for `make geo`,
 * once. Pinned to the versions public/geo/ was built from.
 * In Node, not in the Makefile: on Windows, make runs cmd.exe, which lacks `mkdir -p` and shell tests.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const NATURAL_EARTH =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson'
// OpenStreetMap's country borders to within 10 m (github.com/simonepri/geo-maps): with the territorial waters, and on
// land only.
const GEO_MAPS = 'https://github.com/simonepri/geo-maps/releases/download/v0.6.0'
const OUTPUT = new URL('../../data/geo/', import.meta.url)
const FILES = [
  ['ne_110m_admin_0_countries.geojson', `${NATURAL_EARTH}/ne_110m_admin_0_countries.geojson`],
  ['ne_50m_admin_0_countries.geojson', `${NATURAL_EARTH}/ne_50m_admin_0_countries.geojson`],
  ['ne_10m_admin_0_countries.geojson', `${NATURAL_EARTH}/ne_10m_admin_0_countries.geojson`],
  ['ne_10m_admin_0_countries_gbr.geojson', `${NATURAL_EARTH}/ne_10m_admin_0_countries_gbr.geojson`],
  ['countries-maritime-10m.geo.json', `${GEO_MAPS}/countries-maritime-10m.geo.json`],
  ['countries-land-10m.geo.json', `${GEO_MAPS}/countries-land-10m.geo.json`],
]

mkdirSync(OUTPUT, { recursive: true })
for (const [name, url] of FILES) {
  const target = new URL(name, OUTPUT)
  if (existsSync(target)) {
    continue
  }
  console.log(`downloading ${name}`)
  const response = await fetch(url)
  if (!response.ok) {
    console.error(`${name}: download failed (HTTP ${response.status})`)
    process.exit(1)
  }
  writeFileSync(target, Buffer.from(await response.arrayBuffer()))
}
