/**
 * Country flags as SVG images (flag-icons package), served by the app: no request to an outside site, and they show on
 * Windows, which draws flag emojis as two letters. Only the URLs are bundled; the browser loads the flags shown.
 */
const FLAGS = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** URL of the 4:3 flag of the country `code` (ISO 3166-1 alpha-2, any case), or null when there is none. */
export function flagUrl(code: string): string | null {
  return FLAGS[`/node_modules/flag-icons/flags/4x3/${code.toLowerCase()}.svg`] ?? null
}
