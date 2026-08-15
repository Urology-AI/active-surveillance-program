import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: No secret is ever injected into the client bundle. The Gemini API key
// lives only on the server-side proxy (see server/README.md). The client is
// configured with VITE_ASSISTANT_ENDPOINT, a non-secret URL path, which Vite
// exposes through import.meta.env like any other VITE_* variable.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      // Two real HTML documents. /clinician/ must be served by the origin so a
      // Cloudflare Access path rule can gate it — a client-side route would
      // never reach the edge and could not be protected.
      input: {
        main:      resolve(__dirname, 'index.html'),
        clinician: resolve(__dirname, 'clinician/index.html'),
      },
    },
  },
})
