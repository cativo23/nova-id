import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Asset base is '/' (served from the dedicated nginx host root in prod, and the
  // Vite dev server / local-proxy at root in dev). The /auth/ URL prefix lives in
  // the Vue Router base (main.ts) + Kratos base_url, NOT in the asset paths — keeping
  // them coupled put built assets at /auth/assets/ which the prod nginx (serving at
  // root) returned 404 for, blanking the SPA. Decoupled so assets resolve at /assets/.
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'localhost',
      'auth.ory.localhost',
      'frontend-auth',
      '.cativo.dev',
      '.ory.localhost',
      '.localhost'
    ],
    proxy: {
      // Proxy /api to Oathkeeper so API calls are same-origin → no CORS
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://oathkeeper:4455',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
