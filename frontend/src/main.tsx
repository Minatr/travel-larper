// Fonts served with the app, not from Google Fonts (CLAUDE.md, Typographie).
// Archivo with its width axis, for the condensed titles.
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/inter'
// The browser downloads it only when a barcode is on screen.
import '@fontsource/libre-barcode-39-text'
import './index.css'
import './i18n/index.ts'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import { routes } from './routes.ts'

const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('missing #root element in index.html')
}

const router = createBrowserRouter(routes)

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
