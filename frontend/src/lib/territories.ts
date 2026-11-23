/**
 * Distant territories of the countries, decided country by country: shown as insets on the country's map, or left out
 * (uninhabited or closed to travellers). Frames computed once from the 1:10m shapes, groups of parts under 300 km
 * apart. Every country whose detailed shape has parts over 150 km from its mainland has its frame here; the others keep
 * countryBounds' rule.
 */
import type { LngLat } from './countryAnchor.ts'
import { type Bounds, distanceKm, FULL_TURN_DEGREES } from './geo.ts'

/**
 * A distant territory shown as an inset on its country's map: its frame, and its anchor on the globe (middle of its
 * largest part, not of its frame: the middle of the Antilles' frame is Dominica, another country).
 */
type InsetData = { country: string; bounds: Bounds; anchor: LngLat }

const INSETS = {
  'christmas-island': { country: 'AU', bounds: [105.58, -10.57, 105.72, -10.43], anchor: [105.66, -10.49] },
  'easter-island': { country: 'CL', bounds: [-109.45, -27.2, -109.22, -27.06], anchor: [-109.34, -27.13] },
  'juan-fernandez': { country: 'CL', bounds: [-80.78, -33.77, -78.76, -33.58], anchor: [-78.87, -33.62] },
  'san-andres': { country: 'CO', bounds: [-81.72, 12.5, -81.69, 12.59], anchor: [-81.71, 12.54] },
  galapagos: { country: 'EC', bounds: [-91.67, -1.4, -89.25, 0.65], anchor: [-91.2, -0.45] },
  'canary-islands': { country: 'ES', bounds: [-18.17, 27.64, -13.42, 29.29], anchor: [-16.55, 28.31] },
  rotuma: { country: 'FJ', bounds: [177.01, -12.52, 177.13, -12.47], anchor: [177.07, -12.5] },
  chuuk: { country: 'FM', bounds: [149.18, 6.7, 151.92, 8.99], anchor: [151.61, 7.36] },
  kosrae: { country: 'FM', bounds: [162.91, 5.27, 163.05, 5.38], anchor: [162.98, 5.32] },
  yap: { country: 'FM', bounds: [138.06, 9.41, 140.53, 9.78], anchor: [138.14, 9.5] },
  antilles: { country: 'FR', bounds: [-61.8, 14.41, -60.81, 16.51], anchor: [-60.98, 14.62] },
  'french-guiana': { country: 'FR', bounds: [-54.62, 2.11, -51.65, 5.75], anchor: [-53.33, 3.74] },
  mayotte: { country: 'FR', bounds: [45.04, -12.99, 45.23, -12.65], anchor: [45.13, -12.83] },
  reunion: { country: 'FR', bounds: [55.23, -21.37, 55.85, -20.86], anchor: [55.55, -21.11] },
  'andaman-nicobar': { country: 'IN', bounds: [92.22, 6.75, 93.93, 13.58], anchor: [92.82, 12.49] },
  ogasawara: { country: 'JP', bounds: [141.29, 24.73, 142.24, 27.1], anchor: [142.16, 26.67] },
  'line-islands': { country: 'KI', bounds: [-160.42, 1.71, -157.18, 4.72], anchor: [-157.38, 1.87] },
  'phoenix-islands': { country: 'KI', bounds: [-174.54, -4.7, -171.08, -2.76], anchor: [-171.68, -2.81] },
  rodrigues: { country: 'MU', bounds: [63.33, -19.77, 63.49, -19.67], anchor: [63.41, -19.71] },
  'caribbean-netherlands': { country: 'NL', bounds: [-68.42, 12.02, -68.19, 12.31], anchor: [-68.28, 12.18] },
  'saba-sint-eustatius': { country: 'NL', bounds: [-63.25, 17.46, -62.94, 17.65], anchor: [-62.97, 17.5] },
  svalbard: { country: 'NO', bounds: [10.48, 74.35, 33.64, 80.77], anchor: [15.43, 78.61] },
  'chatham-islands': { country: 'NZ', bounds: [-176.85, -44.34, -176.11, -43.7], anchor: [-176.52, -43.87] },
  azores: { country: 'PT', bounds: [-31.29, 36.93, -25.01, 39.73], anchor: [-25.5, 37.81] },
  madeira: { country: 'PT', bounds: [-17.25, 32.64, -16.27, 33.11], anchor: [-16.97, 32.78] },
  niuas: { country: 'TO', bounds: [-175.69, -15.62, -175.61, -15.56], anchor: [-175.65, -15.59] },
  alaska: { country: 'US', bounds: [172.48, 51.22, 230.01, 71.41], anchor: [-152.23, 60.98] },
  hawaii: { country: 'US', bounds: [-160.25, 18.91, -154.81, 22.23], anchor: [-155.57, 19.59] },
  socotra: { country: 'YE', bounds: [52.06, 12.13, 54.54, 12.71], anchor: [53.94, 12.54] },
} satisfies Record<string, InsetData>

/** Identifier of an inset, in the URL (`?territory=french-guiana`) and the texts (`territories.french-guiana`). */
export type InsetId = keyof typeof INSETS

/** A distant territory shown as an inset. */
export type Inset = InsetData & { id: InsetId }

/** Every inset, grouped by country. */
export const ALL_INSETS: Inset[] = (Object.keys(INSETS) as InsetId[]).map((id) => ({ id, ...INSETS[id] }))

/** Capitals of the countries with insets, for the distances printed on the tags. */
const CAPITALS: Record<string, LngLat> = {
  AU: [149.13, -35.28],
  CL: [-70.65, -33.45],
  CO: [-74.07, 4.71],
  EC: [-78.47, -0.18],
  ES: [-3.7, 40.42],
  FJ: [178.44, -18.14],
  FM: [158.16, 6.92],
  FR: [2.35, 48.86],
  IN: [77.21, 28.61],
  JP: [139.69, 35.69],
  KI: [173.01, 1.33],
  MU: [57.5, -20.16],
  NL: [4.9, 52.37],
  NO: [10.75, 59.91],
  NZ: [174.78, -41.29],
  PT: [-9.14, 38.72],
  TO: [-175.2, -21.14],
  US: [-77.04, 38.9],
  YE: [44.21, 15.35],
}

/** Rounding of the distances printed: a tag tells how far, not the exact figure. */
const DISTANCE_STEP_KM = 10

/**
 * Distance between two places of the country `code`, rounded: its mainland (null, measured from the capital) or one
 * of its insets (from its anchor). Null when the capital is unknown.
 */
export function distanceBetweenKm(code: string, from: Inset | null, to: Inset | null): number | null {
  const capital = CAPITALS[code] as LngLat | undefined
  const start = from?.anchor ?? capital
  const end = to?.anchor ?? capital
  if (start === undefined || end === undefined) {
    return null
  }
  return Math.round(distanceKm(start, end) / DISTANCE_STEP_KM) * DISTANCE_STEP_KM
}

/** Territories left out of the map: not drawn, not framed. */
const IGNORED_AREAS: Record<string, Bounds[]> = {
  AU: [
    [115.3, -20.88, 115.47, -20.67], // Barrow Island
    [158.83, -54.75, 158.96, -54.47], // Macquarie Island
  ],
  BR: [
    [-29.43, 0.83, -29.34, 0.89], // Saint Peter and Saint Paul Rocks
  ],
  CA: [
    [-60.13, 43.91, -59.71, 44.01], // Sable Island
  ],
  FR: [
    [-109.26, 10.27, -109.18, 10.33], // Clipperton Island
  ],
  KI: [
    [-155.93, -5.63, -154.94, -4.03], // Malden and Starbuck Islands
    [-151.82, -11.46, -151.78, -11.39], // Flint Island
  ],
  MX: [
    [-111.07, 18.72, -110.91, 18.87], // Revillagigedo Islands
    [-114.8, 18.32, -114.72, 18.36], // Clarión Island
  ],
  NO: [
    [-9.12, 70.81, -7.94, 71.18], // Jan Mayen
    [3.35, -54.46, 3.49, -54.38], // Bouvet Island
  ],
  NZ: [
    [165.89, -52.6, 169.29, -50.52], // Auckland and Campbell Islands
    [178.72, -49.72, 178.84, -49.62], // Antipodes and Bounty Islands
    [-177.96, -29.29, -177.85, -29.22], // Kermadec Islands
  ],
  PT: [
    [-16.08, 29.99, -15.84, 30.18], // Savage Islands
  ],
  SC: [
    [46.21, -9.45, 46.52, -9.33], // Aldabra
  ],
  US: [
    [-170.41, 56.54, -169.47, 57.25], // Pribilof and Saint Lawrence Islands
  ],
  ZA: [
    [37.58, -46.97, 37.98, -46.6], // Prince Edward Islands
  ],
}

/**
 * Frame of the countries with distant parts: the mainland and the territories kept with it. Also of the countries whose
 * rough globe shape misses land their map shows, inside their OpenStreetMap borders: inhabited islands (Singapore's
 * southern islands, Bahrain's Hawar Islands, Alderney, Carriacou, Lampedusa…) or part of the coast (Luxembourg,
 * Ireland). Found by checking every country's OpenStreetMap land against the view it opens on, desktop and phone.
 */
const COUNTRY_FRAMES: Record<string, Bounds> = {
  AU: [112.92, -43.64, 153.63, -9.24],
  AX: [19.31, 59.83, 21.12, 60.66],
  BB: [-59.66, 13.04, -59.42, 13.34],
  BH: [50.38, 25.55, 50.83, 26.29],
  BR: [-74.02, -33.74, -34.79, 5.27],
  CA: [-141.01, 41.67, -52.62, 83.12],
  CL: [-75.71, -55.92, -66.42, -17.51],
  CO: [-79.02, -4.24, -66.88, 12.47],
  CR: [-85.95, 8.03, -82.54, 11.22],
  DK: [8.09, 54.55, 15.14, 57.73],
  EC: [-81.01, -5.01, -75.23, 1.43],
  ES: [-9.29, 35.26, 4.34, 43.79],
  FJ: [177.09, -20.67, 181.78, -16.12],
  FK: [-61.35, -52.45, -57.75, -51],
  FM: [157.16, 5.77, 158.34, 6.98],
  FR: [-4.79, 41.37, 9.56, 51.09],
  GD: [-61.81, 11.98, -61.37, 12.53],
  GG: [-2.68, 49.36, -2.15, 49.74],
  GQ: [8.42, 0.93, 11.34, 3.77],
  HK: [113.83, 22.15, 114.45, 22.57],
  ID: [95.01, -10.92, 140.98, 5.91],
  IE: [-10.67, 51.42, -5.99, 55.44],
  IN: [68.14, 8.08, 97.36, 35.49],
  IT: [6.6, 35.49, 18.52, 47.09],
  JP: [122.94, 24.26, 145.82, 45.52],
  KI: [172.75, -2.66, 176.85, 3.14],
  KR: [124.61, 33.2, 130.94, 38.62],
  KZ: [46.48, 40.59, 87.32, 55.44],
  LU: [5.67, 49.44, 6.54, 50.19],
  MH: [165.28, 4.57, 172.03, 11.71],
  MU: [57.3, -20.52, 57.8, -19.98],
  MV: [72.69, -0.69, 73.75, 7.11],
  MX: [-118.37, 14.55, -86.73, 32.71],
  MY: [99.64, 0.85, 119.28, 7.36],
  NL: [3.35, 50.75, 7.2, 53.51],
  NO: [4.64, 57.99, 31.08, 71.17],
  NZ: [166.47, -47.28, 178.57, -34.4],
  PG: [140.85, -11.64, 155.97, -1.35],
  PH: [116.95, 4.66, 126.62, 20.84],
  PT: [-9.5, 36.99, -6.21, 42.15],
  RU: [19.61, 41.19, 191, 81.86],
  SB: [155.51, -11.85, 166.98, -6.6],
  SC: [55.2, -4.8, 55.95, -3.71],
  SG: [103.6, 1.16, 104.09, 1.47],
  TF: [50.18, -49.72, 77.58, -37.82],
  TH: [97.35, 5.63, 105.65, 20.45],
  TO: [-176.22, -22.34, -173.91, -18.57],
  TV: [176.12, -9.42, 179.91, -5.68],
  US: [-124.73, 24.58, -66.98, 49.37],
  VC: [-61.47, 12.53, -61.12, 13.36],
  VU: [166.54, -20.25, 169.9, -13.07],
  YE: [42.55, 12.6, 53.09, 19],
  ZA: [16.47, -34.82, 32.89, -22.13],
}

/**
 * Margin around a territory's frame, in degrees (about 50 km): its islets under 20 km² lie a little outside, and a
 * pointer on its coast still counts.
 */
const TERRITORY_MARGIN_DEGREES = 0.5

/** The insets of the country `code`, in a fixed order. */
export function insetsOf(code: string): Inset[] {
  return ALL_INSETS.filter((inset) => inset.country === code)
}

/** The inset `id` of the country `code`, or null for an unknown id or another country's (it comes from the URL). */
export function findInset(code: string, id: string | null): Inset | null {
  return insetsOf(code).find((inset) => inset.id === id) ?? null
}

/** The inset of the country `code` under `point`, or null on its mainland. */
export function insetAt(code: string, point: LngLat): Inset | null {
  return insetsOf(code).find((inset) => holds(widen(inset.bounds), point)) ?? null
}

/** Area of an inset, margin included: the parts wholly inside it belong to the inset. */
export function insetArea(inset: Inset): Bounds {
  return widen(inset.bounds)
}

/** Areas left out of the country `code`'s map, margin included: a part wholly inside one is not drawn. */
export function ignoredAreasOf(code: string): Bounds[] {
  return (IGNORED_AREAS[code] ?? []).map(widen)
}

/** Frame of the country `code`, if decided (see COUNTRY_FRAMES). */
export function mainFrameOf(code: string): Bounds | undefined {
  return COUNTRY_FRAMES[code]
}

function widen([west, south, east, north]: Bounds): Bounds {
  const margin = TERRITORY_MARGIN_DEGREES
  return [west - margin, south - margin, east + margin, north + margin]
}

// Also tried a turn east, for a frame past 180° (Alaska).
function holds([west, south, east, north]: Bounds, [longitude, latitude]: LngLat): boolean {
  return (
    latitude >= south &&
    latitude <= north &&
    [0, FULL_TURN_DEGREES].some((shift) => longitude + shift >= west && longitude + shift <= east)
  )
}
