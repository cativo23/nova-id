import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import '../style.css'
import App from './App.vue'
import Login from './views/Login.vue'
import Registration from './views/Registration.vue'
import Recovery from './views/Recovery.vue'
import Verification from './views/Verification.vue'
import Settings from './views/Settings.vue'
import Consent from './views/Consent.vue'
import Error from './views/Error.vue'
import HydraCallback from './views/HydraCallback.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/hydra-callback', name: 'HydraCallback', component: HydraCallback },
  { path: '/registration', name: 'Registration', component: Registration },
  { path: '/recovery', name: 'Recovery', component: Recovery },
  // Kratos email link uses /auth/self-service/verification?code=...&flow=... — redirect to our page
  {
    path: '/self-service/verification',
    name: 'VerificationRedirect',
    redirect: (to) => ({ path: '/verification', query: to.query }),
  },
  { path: '/verification', name: 'Verification', component: Verification },
  { path: '/settings', name: 'Settings', component: Settings },
  { path: '/consent', name: 'Consent', component: Consent },
  { path: '/error', name: 'Error', component: Error }
]

const router = createRouter({
  history: createWebHistory('/auth/'), // Base path matches Oathkeeper routing
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
