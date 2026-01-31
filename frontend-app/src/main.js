import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '../style.css'
import App from './App.vue'
import Home from './views/Home.vue'
import Logs from './views/Logs.vue'
import Callback from './views/Callback.vue'
import About from './views/About.vue'
import Architecture from './views/Architecture.vue'

const routes = [
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

const app = createApp(App)
app.use(router)
app.mount('#app')
