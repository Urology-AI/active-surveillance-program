import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: No secret is ever injected into the client bundle. The Gemini API key
// lives only on the server-side proxy (see server/README.md). The client is
// configured with VITE_ASSISTANT_ENDPOINT, a non-secret URL path, which Vite
// exposes through import.meta.env like any other VITE_* variable.
export default defineConfig({
  base: '/',
  plugins: [react()],
})
