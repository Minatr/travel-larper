import type { MultiPolygon, Polygon } from 'geojson'

import { countryFrame } from './countryBounds.ts'
import type { Bounds } from './geo.ts'
import { partsInside, partsWithin, simplifyToBudget } from './countryShape.ts'
import { ignoredAreasOf, type Inset, insetArea, insetsOf } from './territories.ts'

/** A distant territory on its country's map: where to frame it, and its own parts (for its thumbnail). */
export type InsetMap = { inset: Inset; bounds: Bounds; shape: MultiPolygon }

/** What the map of a country needs. */
export type CountryMapData = {
  /** Detailed shape: the parts around the framed area and the insets, without the territories left out. */
  shape: MultiPolygon
  /** Light copy of `shape`, to keep only the country's labels. */
  labelArea: MultiPolygon
  /** Area to frame, the same as the globe's flight. */
  bounds: Bounds
  /** Parts of the mainland, for its thumbnail once on an inset. */
  mainShape: MultiPolygon
  /** The country's distant territories, in a fixed order. */
  insets: InsetMap[]
}

/**
 * Starting tolerance of `labelArea`: a thousandth of the framed area's diagonal (about a pixel), at least 0.005° (about
 * 500 m).
 */
const LABEL_AREA_PRECISION_SHARE = 1 / 1000
const MIN_LABEL_AREA_TOLERANCE_DEGREES = 0.005
/**
 * Most points of `labelArea` for the mainland, and for each inset: MapLibre tests each label against each point (Russia
 * took 750 ms at 1,300 points). Coarser, a border town may land on the wrong side, a fair price.
 */
const MAX_LABEL_AREA_POINTS = 300
const MAX_INSET_LABEL_AREA_POINTS = 100

/** Margin kept around the framed area, as a share of its size. */
const SHAPE_MARGIN_SHARE = 1

/**
 * Map data of the country `code` from its globe shape (for the framing) and its detailed shape, or null when no
 * detailed part lies near the framed area.
 */
export function countryMapData(
  code: string,
  globeShape: Polygon | MultiPolygon,
  detailed: Polygon | MultiPolygon,
): CountryMapData | null {
  const bounds = countryFrame(code, globeShape)
  const ignored = ignoredAreasOf(code)
  const mainShape = partsWithin(detailed, [around(bounds)], ignored)
  if (mainShape === null) {
    return null
  }
  const insets = insetsOf(code).flatMap((inset) => {
    const insetBounds = countryFrame(code, globeShape, inset)
    // Wholly inside: India's mainland box reaches the Andaman Islands' frame.
    const insetShape = partsInside(detailed, insetArea(inset))
    return insetShape === null ? [] : [{ inset, bounds: insetBounds, shape: insetShape }]
  })
  const shape = merge([mainShape, ...insets.map((inset) => inset.shape)])
  // Each area simplified on its own: in one go with the mainland, Mayotte would vanish.
  const labelArea = merge([
    simplifyToBudget(mainShape, labelAreaTolerance(bounds), MAX_LABEL_AREA_POINTS),
    ...insets.map((inset) =>
      simplifyToBudget(inset.shape, labelAreaTolerance(inset.bounds), MAX_INSET_LABEL_AREA_POINTS),
    ),
  ])
  return { shape, labelArea, bounds, mainShape, insets }
}

// Each part once: an inset near the mainland (Ogasawara) is also in the mainland's margin, and a part twice would punch
// the mask twice.
function merge(shapes: MultiPolygon[]): MultiPolygon {
  return { type: 'MultiPolygon', coordinates: [...new Set(shapes.flatMap((shape) => shape.coordinates))] }
}

function labelAreaTolerance([west, south, east, north]: Bounds): number {
  const diagonal = Math.hypot(east - west, north - south)
  return Math.max(diagonal * LABEL_AREA_PRECISION_SHARE, MIN_LABEL_AREA_TOLERANCE_DEGREES)
}

function around([west, south, east, north]: Bounds): Bounds {
  const marginX = (east - west) * SHAPE_MARGIN_SHARE
  const marginY = (north - south) * SHAPE_MARGIN_SHARE
  return [west - marginX, south - marginY, east + marginX, north + marginY]
}
