import { ref } from 'vue'

/** Global error set by app.config.errorHandler (e.g. uncaught errors in event handlers). */
export const globalError = ref<unknown>(null)

export function setGlobalError (err: unknown): void {
  globalError.value = err
}

export function clearGlobalError (): void {
  globalError.value = null
}
