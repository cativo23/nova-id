import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/auth/', // Base path for assets when served through Oathkeeper
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
