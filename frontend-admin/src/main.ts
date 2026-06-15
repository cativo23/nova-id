import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import '../style.css'
import { validateEnv } from './config/env'
import { logger } from './utils/logger'
import { setGlobalError } from './state/errorState'
import App from './App.vue'
import Home from './views/Home.vue'
import Dashboard from './views/Dashboard.vue'
import UsersManagement from './views/UsersManagement.vue'
import PermissionsManagement from './views/PermissionsManagement.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Home', component: Home },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true, requiresAdminAccess: true } },
  { path: '/users', name: 'UsersManagement', component: UsersManagement, meta: { requiresAuth: true, requiresAdminAccess: true } },
  { path: '/permissions', name: 'PermissionsManagement', component: PermissionsManagement, meta: { requiresAuth: true, requiresAdminAccess: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard: authentication and admin access permission for admin routes
router.beforeEach(async (to, _from, next) => {
  if (to.path === '/') {
    next()
    return
  }

  if (to.meta.requiresAuth) {
    try {
      const { checkSession } = await import('./composables/useAuth')
      const session = await checkSession()

      if (!session) {
        next({ path: '/' })
        return
      }

      if (to.meta.requiresAdminAccess) {
        const { canAccessAdmin } = await import('./composables/usePermissions')
        const hasAccess = await canAccessAdmin(session.identity?.id)
        if (!hasAccess) {
          next({ path: '/' })
          return
        }
      }
    } catch (error) {
      logger.error('Navigation guard: Auth check failed', error)
      next({ path: '/' })
      return
    }
  }

  next()
})

validateEnv()

// TanStack Query client. staleTime keeps fetched permission/user data fresh
// for 30s so route guard + views share cached responses; retry once on failure.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const app = createApp(App)
app.config.errorHandler = (err, _instance, info) => {
  logger.error('Uncaught error', err, info)
  setGlobalError(err)
}
app.use(router)
app.use(VueQueryPlugin, { queryClient })
app.mount('#app')
