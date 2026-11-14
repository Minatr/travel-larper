/**
 * Camera framing bounds on a flat (Mercator) map, shared by the globe and
 * the country map. MapLibre's globe and flat map each pick their own zoom,
 * which differ for countries over many latitudes (China): with this one, the
 * flight ends on the very picture the map opens on.
 */
import { type Bounds, FULL_TURN_DEGREES, HALF_TURN_DEGREES } from './geo.ts'

/** Center and zoom of a map. */
export type Camera = { center: [number, number]; zoom: number }

/** Width of the world at zoom 0, in pixels. */
const WORLD_SIZE_PX = 512

/**
 * Same as MapLibre's fitBounds on a flat map: center and zoom fitting
 * `bounds`, plus `padding` on each side, in a `width` × `height` view.
 */
export function mercatorCamera(
  [west, south, east, north]: Bounds,
  width: number,
  height: number,
  padding: number,
): Camera {
  const left = mercatorX(west)
  const right = mercatorX(east)
  const top = mercatorY(north)
  const bottom = mercatorY(south)
  const scale = Math.min(
    (width - 2 * padding) / ((right - left) * WORLD_SIZE_PX),
    (height - 2 * padding) / ((bottom - top) * WORLD_SIZE_PX),
  )
  return {
    center: [
      wrapLongitude(longitudeOf((left + right) / 2)),
      latitudeOf((top + bottom) / 2),
    ],
    zoom: Math.log2(scale),
  }
}

/**
 * The area a `width` × `height` view shows with `camera`, the reverse of
 * mercatorCamera (without padding). Latitudes stop at the map's edges.
 */
export function mercatorView(
  { center: [longitude, latitude], zoom }: Camera,
  width: number,
  height: number,
): Bounds {
  const worldPx = WORLD_SIZE_PX * 2 ** zoom
  const x = mercatorX(longitude)
  const y = mercatorY(latitude)
  const halfWidth = width / 2 / worldPx
  const halfHeight = height / 2 / worldPx
  return [
    longitudeOf(x - halfWidth),
    latitudeOf(Math.min(1, y + halfHeight)),
    longitudeOf(x + halfWidth),
    latitudeOf(Math.max(0, y - halfHeight)),
  ]
}

// Position across the world: 0 at 180° W, 1 at 180° E (more past it).
function mercatorX(longitude: number): number {
  return (longitude + HALF_TURN_DEGREES) / FULL_TURN_DEGREES
}

// Position down the world: 0 at the top, 1 at the bottom.
function mercatorY(latitude: number): number {
  const radians = (latitude * Math.PI) / HALF_TURN_DEGREES
  return (1 - Math.log(Math.tan(Math.PI / 4 + radians / 2)) / Math.PI) / 2
}

function longitudeOf(x: number): number {
  return x * FULL_TURN_DEGREES - HALF_TURN_DEGREES
}

function latitudeOf(y: number): number {
  const radians = 2 * Math.atan(Math.exp(Math.PI * (1 - 2 * y))) - Math.PI / 2
  return (radians * HALF_TURN_DEGREES) / Math.PI
}

function wrapLongitude(longitude: number): number {
  return longitude > HALF_TURN_DEGREES
    ? longitude - FULL_TURN_DEGREES
    : longitude
}
