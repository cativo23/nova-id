import { createApp } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import '../style.css'
import App from './App.vue'
import Home from './views/Home.vue'
import Logs from './views/Logs.vue'
import Callback from './views/Callback.vue'
import About from './views/About.vue'
import Architecture from './views/Architecture.vue'
import { getApiTestBaseUrl } from './composables/useApiTest'
import type { MeResponse, DemoUser } from './types'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Home', component: Home },
  { path: '/callback', name: 'OAuthCallback', component: Callback },
  { path: '/about', name: 'About', component: About },
  { path: '/architecture', name: 'Architecture', component: Architecture },
  { path: '/logs', name: 'Logs', component: Logs, meta: { requiresPlatformAdmin: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard: enforce requiresPlatformAdmin routes.
// Uses the same /api-test/me + appRole === 'app_admin' check as Logs.vue
// (ADR-0002: SQLite appRole is the sole gate — platform_admin alone is not sufficient).
router.beforeEach(async (to, _from, next) => {
  if (!to.meta.requiresPlatformAdmin) {
    next()
    return
  }

  try {
    const res = await fetch(`${getApiTestBaseUrl()}/me`, { credentials: 'include' })
    if (res.ok) {
      const me = await res.json() as MeResponse
      const user: DemoUser = me.user ?? (me as unknown as DemoUser)
      if (user?.appRole === 'app_admin') {
        next()
        return
      }
    }
  } catch {
    // fetch failure → deny access (fail-closed)
  }

  next({ path: '/' })
})

const app = createApp(App)
app.use(router)
app.mount('#app')
