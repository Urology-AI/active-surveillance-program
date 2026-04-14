import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geminiKey = env.VITE_GEMINI_API_KEY ?? ''
  return {
    base: '/',
    plugins: [react()],
    // Ensure Gemini key is a real string in the bundle (esbuild can wrongly fold import.meta.env to {}).
    define: {
      __VITE_GEMINI_API_KEY_INJECTED__: JSON.stringify(geminiKey),
    },
  }
})
