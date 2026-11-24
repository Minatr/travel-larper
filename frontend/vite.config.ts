import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Tests of pure logic, run in plain Node: a simulated browser (jsdom) costs about 5 s to set up per file, far more than
 * they take. searchMarker.test.ts stays out: its module loads MapLibre and uses requestAnimationFrame.
 */
const UNIT_TESTS = ['src/lib/**/!(searchMarker).test.ts', 'src/services/**/*.test.ts']

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
  // Each project inherits the options above. The setup file stays in `dom` only: set here, it would be added to both.
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: UNIT_TESTS,
        },
      },
      {
        test: {
          name: 'dom',
          // A simulated browser, so React components can render in Node.
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: UNIT_TESTS,
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
})
