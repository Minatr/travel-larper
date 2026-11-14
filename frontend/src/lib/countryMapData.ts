import type { MultiPolygon, Polygon } from 'geojson'

import { countryBounds } from './countryBounds.ts'
import type { Bounds } from './geo.ts'
import { partsWithin, simplifyToBudget } from './countryShape.ts'

/** What the map of a country needs. */
export type CountryMapData = {
  /** Detailed shape, parts around the framed area only. */
  shape: MultiPolygon
  /** Light copy of `shape`, to keep only the country's labels. */
  labelArea: MultiPolygon
  /** Area to frame, from the globe's shape: the map frames what it did. */
  bounds: Bounds
}

/**
 * Starting tolerance of `labelArea`: a thousandth of the framed area's
 * diagonal (about a pixel), at least 0.005° (about 500 m).
 */
const LABEL_AREA_PRECISION_SHARE = 1 / 1000
const MIN_LABEL_AREA_TOLERANCE_DEGREES = 0.005
/**
 * Most points of `labelArea`: MapLibre tests each label against each point
 * (Russia took 750 ms at 1,300 points). Coarser, a border town may land on
 * the wrong side, a fair price.
 */
const MAX_LABEL_AREA_POINTS = 300

/** Margin kept around the framed area, as a share of its size. */
const SHAPE_MARGIN_SHARE = 1

/**
 * Map data of a country from its globe shape (for the framing) and its
 * detailed shape, or null when no detailed part lies near the framed area.
 */
export function countryMapData(
  globeShape: Polygon | MultiPolygon,
  detailed: Polygon | MultiPolygon,
): CountryMapData | null {
  const bounds = countryBounds(globeShape)
  const shape = partsWithin(detailed, around(bounds))
  if (shape === null) {
    return null
  }
  const labelArea = simplifyToBudget(
    shape,
    labelAreaTolerance(bounds),
    MAX_LABEL_AREA_POINTS,
  )
  return { shape, labelArea, bounds }
}

function labelAreaTolerance([west, south, east, north]: Bounds): number {
  const diagonal = Math.hypot(east - west, north - south)
  return Math.max(
    diagonal * LABEL_AREA_PRECISION_SHARE,
    MIN_LABEL_AREA_TOLERANCE_DEGREES,
  )
}

function around([west, south, east, north]: Bounds): Bounds {
  const marginX = (east - west) * SHAPE_MARGIN_SHARE
  const marginY = (north - south) * SHAPE_MARGIN_SHARE
  return [west - marginX, south - marginY, east + marginX, north + marginY]
}
