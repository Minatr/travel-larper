/** ISO 3166-1 alpha-2 code. It comes from the URL and goes into a file URL. */
const COUNTRY_CODE = /^[A-Z]{2}$/

/**
 * Countries without a map: Antarctica has no trip to plan, and a flat map
 * cannot show a pole. Keep in sync with scripts/build-country-shapes.mjs.
 */
const WITHOUT_MAP = new Set(['AQ'])

/** Whether `code` (upper case) is a country whose map can open. */
export function hasMap(code: string): boolean {
  return COUNTRY_CODE.test(code) && !WITHOUT_MAP.has(code)
}
