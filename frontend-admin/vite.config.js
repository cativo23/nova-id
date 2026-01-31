import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: [
      'localhost',
      'admin.ory.localhost',
      'frontend-admin',
      '.cativo.dev',
      '.ory.localhost',
      '.localhost'
    ],
    proxy: {
      // Proxy /api to Oathkeeper so API calls are same-origin → no CORS
      // Forward path as-is: Oathkeeper rules expect /api/admin/* and strip /api before forwarding to Kratos
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://oathkeeper:4455',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
