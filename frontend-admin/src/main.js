import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '../style.css'
import { validateEnv } from './config/env'
import { logger } from './utils/logger'
import { setGlobalError } from './state/errorState'
import App from './App.vue'
import Home from './views/Home.vue'
import Dashboard from './views/Dashboard.vue'
import UsersManagement from './views/UsersManagement.vue'
import PermissionsManagement from './views/PermissionsManagement.vue'

const routes = [
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
router.beforeEach(async (to, from, next) => {
  if (to.path === '/') {
    next()
    return
  }

  if (to.meta.requiresAuth) {
    try {
      const { checkSession } = await import('./composables/useAuth.js')
      const session = await checkSession()

      if (!session) {
        next({ path: '/' })
        return
      }

      if (to.meta.requiresAdminAccess) {
        const { canAccessAdmin } = await import('./composables/usePermissions.js')
        const hasAccess = await canAccessAdmin(session.identity.id)
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

const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  logger.error('Uncaught error', err, info)
  setGlobalError(err)
}
app.use(router)
app.mount('#app')
