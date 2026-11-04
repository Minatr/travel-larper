import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/** Where the dev server forwards `/api` calls (the backend container in Docker). */
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@/…` points to src/, as expected by shadcn/ui (components.json).
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Listen on every interface so the dev server is reachable from outside its container.
    host: true,
    port: Number(process.env.FRONTEND_PORT ?? 5173),
    strictPort: true,
    // Same-origin proxy: the browser only talks to Vite, so no CORS setup is needed.
    proxy: {
      '/api': apiProxyTarget,
    },
  },
  test: {
    // A simulated browser, so React components can render in Node.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
