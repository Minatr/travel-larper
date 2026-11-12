/**
 * Every page of the app and its URL. React Router reads this list: the
 * entries in `children` are displayed inside Layout, in its <Outlet />.
 * A new page is one more entry in `children`, e.g.
 * `{ path: 'trips', Component: TripsPage }`.
 */
import type { RouteObject } from 'react-router'

import { Layout } from './components/Layout.tsx'
import { CountryPage } from './pages/CountryPage.tsx'
import { GlobePage } from './pages/GlobePage.tsx'
import { HealthPage } from './pages/HealthPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

/**
 * Kept apart from main.tsx so the tests mount the very same routes in a
 * memory router. `Component: X` rather than `element: <X />` keeps this file
 * free of JSX.
 */
export const routes: RouteObject[] = [
  {
    Component: Layout,
    children: [
      // The globe at `/`, a country page above it at `/countries/:code`.
      {
        path: '',
        Component: GlobePage,
        children: [{ path: 'countries/:code', Component: CountryPage }],
      },
      { path: 'status', Component: HealthPage },
      // `*`: any URL no other route matches.
      { path: '*', Component: NotFoundPage },
    ],
  },
]
