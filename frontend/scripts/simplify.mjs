/**
 * Douglas-Peucker simplification of a ring, shared by the map data scripts (build-countries.mjs,
 * build-country-borders.mjs).
 */
const METERS_PER_DEGREE = 111_320

/**
 * The ring with only the points straying more than `toleranceMeters` from a straight line, distances measured with the
 * longitudes shrunk by the cosine of the latitude: O(n log n) on average, O(n²) at worst.
 */
export function simplify(ring, toleranceMeters) {
  if (ring.length <= 4) {
    return ring
  }
  const cosine = Math.cos((ring[0][1] * Math.PI) / 180)
  const points = ring.map(([longitude, latitude]) => [
    longitude * cosine * METERS_PER_DEGREE,
    latitude * METERS_PER_DEGREE,
  ])
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

// Point between `first` and `last` farthest from the line through them, and its distance.
function farthest(points, first, last) {
  const [ax, ay] = points[first]
  const [bx, by] = points[last]
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy)
  let best = { index: first + 1, distance: -1 }
  for (let index = first + 1; index < last; index++) {
    const [px, py] = points[index]
    const distance = length === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * (px - ax) - dx * (py - ay)) / length
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
  const cosine = Math.cos((ring[0][1] * Math.PI) / 180)
  // Open ring of [point, x, y], x and y in meters.
  const points = ring
    .slice(0, -1)
    .map((point) => [point, point[0] * cosine * METERS_PER_DEGREE, point[1] * METERS_PER_DEGREE])
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

function triangleArea([, ax, ay], [, bx, by], [, cx, cy]) {
  return Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2
}
