<template>
  <div>
    <div v-if="error" class="error-fallback min-h-[60vh] flex flex-col items-center justify-center px-6 py-12">
      <div class="card max-w-md w-full p-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/25">
          <svg class="h-7 w-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-cyber-light mb-2">Something went wrong</h2>
        <p class="text-sm text-cyber-light/70 mb-6">
          An unexpected error occurred. You can try again or return to the dashboard.
        </p>
        <div class="flex flex-wrap gap-3 justify-center">
          <button type="button" @click="retry" class="btn-primary">
            Try again
          </button>
          <router-link to="/dashboard" class="btn-secondary" @click="clear">
            Go to Dashboard
          </router-link>
        </div>
      </div>
    </div>
    <template v-else>
      <slot />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<unknown>(null)

onErrorCaptured((err) => {
  error.value = err
  return false
})

function clear () {
  error.value = null
}

function retry () {
  error.value = null
}
</script>
