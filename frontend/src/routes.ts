/**
 * Every page of the app and its URL. React Router reads this list: the entries in `children` are displayed inside
 * Layout, in its <Outlet />. A new page is one more entry in `children`, e.g.
 * `{ path: 'trips', Component: TripsPage }`.
 */
import type { RouteObject } from 'react-router'

import { Layout } from './components/Layout.tsx'
import { CountryPage } from './pages/CountryPage.tsx'
import { GlobePage } from './pages/GlobePage.tsx'
import { HealthPage } from './pages/HealthPage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { RegisterPage } from './pages/RegisterPage.tsx'

/**
 * Kept apart from main.tsx so the tests mount the very same routes in a memory router. `Component: X` rather than
 * `element: <X />` keeps this file free of JSX.
 */
export const routes: RouteObject[] = [
  {
    Component: Layout,
    children: [
      // The globe at `/`; above it, a country page, or the login and sign-up tags over the dimmed globe.
      {
        path: '',
        Component: GlobePage,
        children: [
          { path: 'countries/:code', Component: CountryPage },
          { path: 'login', Component: LoginPage },
          { path: 'register', Component: RegisterPage },
        ],
      },
      { path: 'status', Component: HealthPage },
      // `*`: any URL no other route matches.
      { path: '*', Component: NotFoundPage },
    ],
  },
]
