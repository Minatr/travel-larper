import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Where the dev server forwards `/api` calls (the backend container in Docker). */
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
