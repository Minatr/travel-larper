import type { MultiPolygon } from 'geojson'
import { useTranslation } from 'react-i18next'

import type { TerritoryInsetsProps } from '../components/TerritoryInsets.tsx'
import type { Bounds } from '../lib/geo.ts'
import { distanceBetweenKm } from '../lib/territories.ts'

/** A pass to show: the mainland's or a territory's. */
export type TerritoryTag = {
  id: string
  label: string
  distance: string | null
  shape: MultiPolygon
  bounds: Bounds
  search: string
}

/**
 * The passes of a country's distant territories: one opens its territory. Once on one, its own pass gives way to the
 * mainland's, which leads back; each tells how far it lies from the place shown. Empty without distant territory.
 */
export function useTerritoryTags({ insets, current, countryName, mainShape, mainBounds }: TerritoryInsetsProps): {
  title: string
  tags: TerritoryTag[]
} {
  const { t, i18n } = useTranslation()
  if (insets.length === 0) {
    return { title: '', tags: [] }
  }
  const numbers = new Intl.NumberFormat(i18n.language)
  const here = insets.find(({ inset }) => inset.id === current)?.inset ?? null
  // How far each place lies from the one shown: the capital on the mainland, the territory's anchor on an inset.
  function distanceTo(code: string, place: (typeof insets)[number]['inset'] | null): string | null {
    const distance = distanceBetweenKm(code, here, place)
    return distance === null ? null : t('country.distanceKm', { distance: numbers.format(distance) })
  }
  const code = insets[0].inset.country
  // In the singular for a country with one (Australia: Christmas Island), even when its tag is the mainland's.
  const title = t('country.territories', { count: insets.length })
  const tags: TerritoryTag[] = [
    ...(here === null
      ? []
      : [
          {
            id: 'mainland',
            label: countryName,
            distance: distanceTo(code, null),
            shape: mainShape,
            bounds: mainBounds,
            search: '',
          },
        ]),
    ...insets
      .filter(({ inset }) => inset !== here)
      .map(({ inset, shape, bounds }) => ({
        id: inset.id,
        label: t(`territories.${inset.id}`),
        distance: distanceTo(code, inset),
        shape,
        bounds,
        search: `?territory=${inset.id}`,
      })),
  ]
  return { title, tags }
}
