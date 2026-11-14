/**
 * Downloads the Natural Earth sources (about 30 MB) into data/geo/ for
 * `make geo`, once. Pinned to the version public/geo/ was built from.
 * In Node, not in the Makefile: on Windows, make runs cmd.exe, which lacks
 * `mkdir -p` and shell tests.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson'
const OUTPUT = new URL('../../data/geo/', import.meta.url)
const FILES = [
  'ne_110m_admin_0_countries',
  'ne_50m_admin_0_countries',
  'ne_10m_admin_0_countries',
  'ne_10m_admin_0_countries_gbr',
]

mkdirSync(OUTPUT, { recursive: true })
for (const name of FILES) {
  const target = new URL(`${name}.geojson`, OUTPUT)
  if (existsSync(target)) {
    continue
  }
  console.log(`downloading ${name}`)
  const response = await fetch(`${SOURCE}/${name}.geojson`)
  if (!response.ok) {
    console.error(`${name}: download failed (HTTP ${response.status})`)
    process.exit(1)
  }
  writeFileSync(target, Buffer.from(await response.arrayBuffer()))
}
