import { ref } from 'vue'

/** Global error set by app.config.errorHandler (e.g. uncaught errors in event handlers). */
export const globalError = ref(null)

export function setGlobalError (err) {
  globalError.value = err
}

export function clearGlobalError () {
  globalError.value = null
}
