import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // loadEnv only merges .env* files. Hosting CI (Netlify, Vercel, etc.) injects
  // VITE_* into process.env at build time — include that so the key reaches the bundle.
  const fromFile = env.VITE_GEMINI_API_KEY
  const fromProcess = process.env.VITE_GEMINI_API_KEY
  const raw = fromFile ?? fromProcess ?? ''
  const geminiKey = typeof raw === 'string' ? raw.trim() : ''
  return {
    base: '/',
    plugins: [react()],
    // Ensure Gemini key is a real string in the bundle (esbuild can wrongly fold import.meta.env to {}).
    define: {
      __VITE_GEMINI_API_KEY_INJECTED__: JSON.stringify(geminiKey),
    },
  }
})
