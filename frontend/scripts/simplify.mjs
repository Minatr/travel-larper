/**
 * Simplifications of a ring, shared by the map data scripts (build-countries.mjs, build-country-borders.mjs).
 * Distances are measured with the longitudes shrunk by the cosine of each point's own latitude: with the first point's
 * alone, a ring running from the Arctic down to the south of Canada counted its east-west gaps 2.5 times too short.
 */
const METERS_PER_DEGREE = 111_320

/**
 * The ring with only the points straying more than `toleranceMeters` from a straight line (Douglas-Peucker): O(n log n)
 * on average, O(n²) at worst.
 */
export function simplify(ring, toleranceMeters) {
  if (ring.length <= 4) {
    return ring
  }
  const points = ring.map(inMeters)
  const keep = new Uint8Array(ring.length)
  keep[0] = 1
  keep[ring.length - 1] = 1
  // A closed ring starts and ends on the same point: split it at its farthest point first.
  const split = farthest(points, 0, ring.length - 1).index
  keep[split] = 1
  const stack = [
    [0, split],
    [split, ring.length - 1],
  ]
  while (stack.length > 0) {
    const [first, last] = stack.pop()
    if (last - first < 2) {
      continue
    }
    const { index, distance } = farthest(points, first, last)
    if (distance > toleranceMeters) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  const kept = ring.filter((_, index) => keep[index] === 1)
  return kept.length >= 4 ? kept : ring
}

// [x, y, cosine]: the point in meters before shrinking the longitude, and the cosine of its latitude to shrink it by.
function inMeters([longitude, latitude]) {
  return [longitude * METERS_PER_DEGREE, latitude * METERS_PER_DEGREE, Math.cos((latitude * Math.PI) / 180)]
}

// Point between `first` and `last` farthest from the line through them, and its distance, measured at its latitude.
function farthest(points, first, last) {
  const [ax, ay] = points[first]
  const [bx, by] = points[last]
  const dy = by - ay
  let best = { index: first + 1, distance: -1 }
  for (let index = first + 1; index < last; index++) {
    const [px, py, cosine] = points[index]
    const dx = (bx - ax) * cosine
    const offsetX = (px - ax) * cosine
    const length = Math.hypot(dx, dy)
    const distance = length === 0 ? Math.hypot(offsetX, py - ay) : Math.abs(dy * offsetX - dx * (py - ay)) / length
    if (distance > best.distance) {
      best = { index, distance }
    }
  }
  return best
}

/**
 * The ring without the points whose triangle with their two neighbors is smaller than `minAreaSquareMeters`
 * (Visvalingam): unlike Douglas-Peucker, it also drops thin spikes, such as a harbor's jetties. O(n²), for small rings.
 */
export function simplifyByArea(ring, minAreaSquareMeters) {
  // Open ring of [point, x, y, cosine] (see inMeters).
  const points = ring.slice(0, -1).map((point) => [point, ...inMeters(point)])
  const MIN_POINTS = 3
  while (points.length > MIN_POINTS) {
    let smallest = { index: -1, area: Infinity }
    for (let index = 0; index < points.length; index++) {
      const area = triangleArea(
        points[(index + points.length - 1) % points.length],
        points[index],
        points[(index + 1) % points.length],
      )
      if (area < smallest.area) {
        smallest = { index, area }
      }
    }
    if (smallest.area >= minAreaSquareMeters) {
      break
    }
    points.splice(smallest.index, 1)
  }
  const kept = points.map(([point]) => point)
  return [...kept, kept[0]]
}

// Area of the triangle, its longitudes shrunk at the latitude of its middle point `b`.
function triangleArea([, ax, ay], [, bx, by, cosine], [, cx, cy]) {
  return Math.abs((bx - ax) * cosine * (cy - ay) - (cx - ax) * cosine * (by - ay)) / 2
}
