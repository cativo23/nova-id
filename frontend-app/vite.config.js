import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    allowedHosts: [
      'localhost',
      'app.ory.localhost',
      'api.ory.localhost',
      'frontend-app',
      '.cativo.dev',
      '.ory.localhost',
      '.localhost'
    ],
    // Proxy /api to Oathkeeper so API requests from the test app reach the gateway.
    // In Docker: API_PROXY_TARGET=http://oathkeeper:4455. On host: localhost:4455.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:4455',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})
