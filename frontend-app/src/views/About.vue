<template>
  <div class="min-h-[calc(100vh-4rem)] px-4 py-8 sm:py-12">
    <div class="w-full max-w-3xl mx-auto animate-fade-in">
      <nav class="mb-6 flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        <router-link
          to="/"
          class="text-cyber-light/60 hover:text-cyber-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 rounded"
        >
          Home
        </router-link>
        <span class="text-cyber-light/40" aria-hidden="true">/</span>
        <span class="text-cyber-accent font-medium" aria-current="page">About</span>
      </nav>

      <h1 class="text-2xl sm:text-3xl font-bold text-cyber-light tracking-tight mb-2">Cómo funciona</h1>
      <p class="text-cyber-light/60 text-sm sm:text-base mb-8">
        Esta app de pruebas te permite validar el flujo OAuth2/OIDC con Nova ID y probar endpoints protegidos.
      </p>

      <section class="space-y-8">
        <div class="bg-cyber-dark/60 border border-cyber-accent/20 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/10">
          <h2 class="text-lg font-semibold text-cyber-accent mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Flujo de login (OAuth2 / OIDC)
          </h2>
          <ol class="list-decimal list-inside space-y-2 text-sm text-cyber-light/80">
            <li>Haces clic en <strong class="text-cyber-light">Sign in with Nova ID</strong> en esta app.</li>
            <li>Eres redirigido al servidor de autorización (Hydra) y, si hace falta, al login de Nova ID (Kratos).</li>
            <li>Inicias sesión (o te registras) en Nova ID.</li>
            <li>Apruebas el consentimiento para que esta app acceda a tu identidad (puede omitirse si ya lo hiciste).</li>
            <li>Vuelves a esta app con un token; la sesión queda establecida y puedes llamar a la API de pruebas.</li>
          </ol>
        </div>

        <div class="bg-cyber-dark/60 border border-cyber-accent/20 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/10">
          <h2 class="text-lg font-semibold text-cyber-accent mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Endpoints de la API de pruebas
          </h2>
          <ul class="space-y-3 text-sm text-cyber-light/80">
            <li class="flex items-start gap-2">
              <span class="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 shrink-0">GET</span>
              <span><strong class="text-cyber-light">/api-test/health</strong>, <strong class="text-cyber-light">/api-test/public</strong> — Públicos, sin autenticación.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 shrink-0">GET</span>
              <span><strong class="text-cyber-light">/api-test/me</strong>, <strong class="text-cyber-light">/api-test/protected</strong> — Requieren sesión o token (usuario autenticado).</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400 shrink-0">Admin</span>
              <span><strong class="text-cyber-light">/api-test/admin-demo</strong> — Solo <em>platform_admin</em>.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-400 shrink-0">App admin</span>
              <span><strong class="text-cyber-light">/api-test/app-admin-only</strong>, <strong class="text-cyber-light">/api-test/logs</strong> — Solo <em>app_admin</em> o <em>platform_admin</em>.</span>
            </li>
          </ul>
        </div>

        <div class="bg-cyber-dark/60 border border-cyber-accent/20 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/10">
          <h2 class="text-lg font-semibold text-cyber-accent mb-4">Documentación</h2>
          <p class="text-sm text-cyber-light/70 mb-4">
            Para más detalles sobre arquitectura, OAuth2 y RBAC, revisa la documentación del proyecto en el repositorio (por ejemplo <code class="px-1.5 py-0.5 rounded bg-cyber-bg/80 text-cyber-accent font-mono text-xs">docs/</code>).
          </p>
          <router-link
            to="/"
            class="inline-flex items-center gap-2 text-sm font-medium text-cyber-accent hover:text-cyber-accent/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/50 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
</script>
