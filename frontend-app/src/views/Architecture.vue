<template>
  <div class="arch-page relative w-full min-h-[calc(100vh-4rem)] bg-tokyo-bg text-tokyo-light p-4 sm:p-6 md:p-8 overflow-auto">
    <!-- Tokyo Night mesh + cyberpunk vibe -->
    <div class="pointer-events-none fixed inset-0 bg-mesh-gradient-strong z-0" aria-hidden="true" />
    <!-- Subtle scanline overlay -->
    <div class="pointer-events-none fixed inset-0 z-0 opacity-[0.03] arch-scanline" aria-hidden="true" />
    <div class="relative z-10 max-w-7xl mx-auto">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center gap-2 text-sm font-mono uppercase tracking-wider opacity-0 animate-fade-in-up" style="animation-delay: 0ms; animation-fill-mode: forwards" aria-label="Breadcrumb">
        <router-link
          to="/"
          class="text-tokyo-light/60 hover:text-tokyo-accent transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-tokyo-accent/50 rounded"
        >
          Home
        </router-link>
        <span class="text-tokyo-light/40" aria-hidden="true">/</span>
        <span class="text-tokyo-accent font-medium" aria-current="page">Architecture</span>
      </nav>

      <!-- Header -->
      <div class="mb-8 text-center opacity-0 animate-fade-in-up" style="animation-delay: 80ms; animation-fill-mode: forwards">
        <h1 class="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-tokyo-accent via-tokyo-accent-2 to-tokyo-accent bg-clip-text text-transparent drop-shadow-neon-cyan [text-shadow:0_0_20px_rgba(125,207,255,0.3)]">
          NOVA ID – Full Architecture
        </h1>
        <p class="text-cyber-muted font-mono text-sm tracking-wider">Identity Provider + Zero Trust Gateway for N Systems</p>
      </div>

      <!-- Diagram -->
      <section
        class="arch-card mb-8 bg-tokyo-storm/90 border border-tokyo-accent/40 rounded-xl p-6 overflow-x-auto shadow-glow opacity-0 animate-fade-in-up backdrop-blur-sm hover:border-tokyo-accent/60 hover:shadow-glow transition-all duration-300"
        style="animation-delay: 160ms; animation-fill-mode: forwards"
        aria-labelledby="diagram-heading"
      >
        <h2 id="diagram-heading" class="sr-only">Architecture diagram</h2>
        <div class="min-w-[320px]">
          <div class="text-center mb-3">
            <span class="text-xs font-mono font-medium uppercase tracking-[0.2em] text-tokyo-accent/90">Clients &amp; apps</span>
          </div>
          <div class="flex flex-wrap justify-center gap-3 mb-6">
            <div class="rounded-lg border border-tokyo-accent/50 bg-tokyo-accent/10 px-3 py-2 text-center min-w-[100px] hover:shadow-neon-cyan hover:border-tokyo-accent/70 transition-all duration-200">
              <span class="block font-semibold text-tokyo-accent text-xs sm:text-sm">Test App</span>
              <span class="block text-[10px] text-tokyo-light/60 mt-0.5">(this app)</span>
            </div>
            <div class="rounded-lg border border-tokyo-light/30 bg-tokyo-dark/60 px-3 py-2 text-center min-w-[100px] hover:border-tokyo-light/50 transition-all duration-200">
              <span class="block font-semibold text-tokyo-light/90 text-xs sm:text-sm">Admin</span>
            </div>
            <div class="rounded-lg border border-tokyo-light/30 bg-tokyo-dark/60 px-3 py-2 text-center min-w-[100px] hover:border-tokyo-light/50 transition-all duration-200">
              <span class="block font-semibold text-tokyo-light/90 text-xs sm:text-sm">Auth UI</span>
            </div>
            <div class="rounded-lg border border-dashed border-tokyo-light/25 bg-tokyo-bg/80 px-3 py-2 text-center min-w-[100px]">
              <span class="block font-medium text-tokyo-light/50 text-xs sm:text-sm">+ more</span>
              <span class="block text-[10px] text-tokyo-light/40 mt-0.5">SPAs, mobile, etc.</span>
            </div>
          </div>
          <div class="flex justify-center mb-2">
            <svg class="w-6 h-8 text-tokyo-accent/60 animate-pulse-soft" fill="none" viewBox="0 0 24 32" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v24M8 20l4 4 4-4" />
            </svg>
          </div>
          <div class="flex justify-center mb-6">
            <div class="rounded-lg border-2 border-tokyo-yellow/50 bg-tokyo-yellow/10 px-4 py-3 text-center min-w-[160px] max-w-[280px] shadow-neon-cyan animate-glow-pulse">
              <span class="block font-semibold text-tokyo-yellow text-sm sm:text-base">Oathkeeper</span>
              <span class="block text-xs text-tokyo-light/60 mt-0.5 font-mono">Single gateway · Auth, Authz, routing</span>
            </div>
          </div>
          <div class="flex justify-center gap-4 sm:gap-12 mb-4">
            <svg class="w-6 h-6 text-tokyo-accent/40 hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M12 4v16M8 12l4 4 4-4" />
            </svg>
            <svg class="w-6 h-8 text-tokyo-accent/50" viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v24M8 20l4 4 4-4" />
            </svg>
            <svg class="w-6 h-6 text-tokyo-accent/40 hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M12 4v16M16 12l-4 4-4-4" />
            </svg>
          </div>
          <div class="text-center mb-3">
            <span class="text-xs font-mono font-medium uppercase tracking-[0.2em] text-tokyo-green/90">Multiple APIs &amp; microservices</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div class="rounded-lg border border-tokyo-green/40 bg-tokyo-green/10 px-3 py-2 text-center min-w-[90px] hover:border-tokyo-green/60 hover:shadow-neon-green transition-all duration-200">
              <span class="block font-semibold text-tokyo-green text-xs sm:text-sm">Blog API</span>
            </div>
            <div class="rounded-lg border border-tokyo-green/40 bg-tokyo-green/10 px-3 py-2 text-center min-w-[90px] hover:border-tokyo-green/60 hover:shadow-neon-green transition-all duration-200">
              <span class="block font-semibold text-tokyo-green text-xs sm:text-sm">Shop API</span>
            </div>
            <div class="rounded-lg border border-tokyo-green/40 bg-tokyo-green/10 px-3 py-2 text-center min-w-[90px] hover:border-tokyo-green/60 hover:shadow-neon-green transition-all duration-200">
              <span class="block font-semibold text-tokyo-green text-xs sm:text-sm">CRM API</span>
            </div>
            <div class="rounded-lg border border-dashed border-tokyo-green/30 bg-tokyo-bg/80 px-3 py-2 text-center min-w-[90px]">
              <span class="block font-medium text-tokyo-light/50 text-xs sm:text-sm">+ more</span>
            </div>
          </div>
          <div class="text-center mb-3">
            <span class="text-xs font-mono font-medium uppercase tracking-[0.2em] text-tokyo-accent-2/90">Identity &amp; OAuth (Ory)</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="rounded-lg border border-tokyo-accent-2/40 bg-tokyo-accent-2/10 px-3 py-2 text-center min-w-[90px] hover:border-tokyo-accent-2/60 hover:shadow-neon-purple transition-all duration-200">
              <span class="block font-semibold text-tokyo-accent-2 text-xs sm:text-sm">Kratos</span>
              <span class="block text-[10px] text-tokyo-light/60 mt-0.5">Identity</span>
            </div>
            <div class="rounded-lg border border-tokyo-accent-2/40 bg-tokyo-accent-2/10 px-3 py-2 text-center min-w-[90px] hover:border-tokyo-accent-2/60 hover:shadow-neon-purple transition-all duration-200">
              <span class="block font-semibold text-tokyo-accent-2 text-xs sm:text-sm">Hydra</span>
              <span class="block text-[10px] text-tokyo-light/60 mt-0.5">OAuth2 / OIDC</span>
            </div>
            <div class="rounded-lg border border-tokyo-accent-2/40 bg-tokyo-accent-2/10 px-3 py-2 text-center min-w-[90px] hover:border-tokyo-accent-2/60 hover:shadow-neon-purple transition-all duration-200">
              <span class="block font-semibold text-tokyo-accent-2 text-xs sm:text-sm">Keto</span>
              <span class="block text-[10px] text-tokyo-light/60 mt-0.5">RBAC</span>
            </div>
            <div class="rounded-lg border border-tokyo-light/20 bg-tokyo-dark/90 px-3 py-2 text-center min-w-[90px]">
              <span class="block font-semibold text-tokyo-light/70 text-xs sm:text-sm">AppRegistry</span>
            </div>
          </div>
          <p class="text-center text-xs text-cyber-muted font-mono tracking-wider">
            ↓ All use &quot;Login with Nova ID&quot; or OAuth2 ↓
          </p>
        </div>
      </section>

      <!-- Layer 1: Clients/Users -->
      <div class="mb-6 opacity-0 animate-fade-in-up" style="animation-delay: 220ms; animation-fill-mode: forwards">
        <div class="arch-card bg-tokyo-storm/80 border border-tokyo-accent/35 rounded-xl p-6 backdrop-blur-sm hover:border-tokyo-accent/55 hover:shadow-glow transition-all duration-300">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2 font-mono tracking-wide">
            <GlobeIcon class="w-6 h-6 text-tokyo-accent shrink-0" />
            <span class="text-tokyo-accent">Layer 1:</span> Clients / External Applications
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-tokyo-dark/70 rounded-lg p-4 border border-tokyo-accent/35 hover:border-tokyo-accent/55 hover:shadow-neon-cyan/50 transition-all duration-200">
              <div class="flex items-center gap-2 mb-3">
                <GlobeIcon class="w-5 h-5 text-tokyo-accent shrink-0" />
                <h3 class="font-semibold text-tokyo-light">Web Apps</h3>
              </div>
              <div class="text-xs space-y-1 text-cyber-muted font-mono">
                <div>• Blog (blog.cativo.dev)</div>
                <div>• E-commerce (shop.cativo.dev)</div>
                <div>• CRM (crm.cativo.dev)</div>
                <div>• Analytics (analytics.cativo.dev)</div>
              </div>
              <div class="mt-3 text-xs text-tokyo-green">✓ Login with Nova ID</div>
            </div>
            <div class="bg-tokyo-dark/70 rounded-lg p-4 border border-tokyo-accent-2/35 hover:border-tokyo-accent-2/55 hover:shadow-neon-purple/50 transition-all duration-200">
              <div class="flex items-center gap-2 mb-3">
                <SmartphoneIcon class="w-5 h-5 text-tokyo-accent-2 shrink-0" />
                <h3 class="font-semibold text-tokyo-light">Mobile Apps</h3>
              </div>
              <div class="text-xs space-y-1 text-cyber-muted font-mono">
                <div>• iOS App</div>
                <div>• Android App</div>
                <div>• React Native Apps</div>
                <div>• Flutter Apps</div>
              </div>
              <div class="mt-3 text-xs text-tokyo-green">✓ OAuth2 / PKCE</div>
            </div>
            <div class="bg-tokyo-dark/70 rounded-lg p-4 border border-tokyo-cyan/35 hover:border-tokyo-cyan/55 transition-all duration-200">
              <div class="flex items-center gap-2 mb-3">
                <CloudIcon class="w-5 h-5 text-tokyo-cyan shrink-0" />
                <h3 class="font-semibold text-tokyo-light">Third-Party</h3>
              </div>
              <div class="text-xs space-y-1 text-cyber-muted font-mono">
                <div>• Partner Apps</div>
                <div>• External Services</div>
                <div>• Integration Tools</div>
                <div>• Zapier, Make, etc</div>
              </div>
              <div class="mt-3 text-xs text-tokyo-green">✓ OAuth2 Client</div>
            </div>
            <div class="bg-tokyo-dark/70 rounded-lg p-4 border border-tokyo-green/35 hover:border-tokyo-green/55 hover:shadow-neon-green/50 transition-all duration-200">
              <div class="flex items-center gap-2 mb-3">
                <ServerIcon class="w-5 h-5 text-tokyo-green shrink-0" />
                <h3 class="font-semibold text-tokyo-light">Microservices</h3>
              </div>
              <div class="text-xs space-y-1 text-cyber-muted font-mono">
                <div>• Background Jobs</div>
                <div>• API Workers</div>
                <div>• Event Processors</div>
                <div>• Data Pipelines</div>
              </div>
              <div class="mt-3 text-xs text-tokyo-green">✓ Client Credentials</div>
            </div>
          </div>
          <div class="mt-4 text-center text-sm text-cyber-muted font-mono tracking-wider">
            ↓ All use &quot;Login with Nova ID&quot; or OAuth2 ↓
          </div>
        </div>
      </div>

      <!-- Layer 2: Nova ID Core -->
      <div class="mb-6 opacity-0 animate-fade-in-up" style="animation-delay: 280ms; animation-fill-mode: forwards">
        <div class="arch-card bg-tokyo-storm/80 border border-tokyo-accent-2/40 rounded-xl p-6 backdrop-blur-sm hover:border-tokyo-accent-2/60 hover:shadow-glow transition-all duration-300">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2 font-mono tracking-wide">
            <ShieldIcon class="w-6 h-6 text-tokyo-accent-2 shrink-0" />
            <span class="text-tokyo-accent-2">Layer 2:</span> NOVA ID – Identity Provider (Core)
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="font-semibold mb-3 text-tokyo-accent-2/90 font-mono uppercase tracking-wider text-sm">Public-facing services</h3>
              <div class="space-y-3">
                <div class="bg-tokyo-dark/80 rounded-lg p-4 border border-tokyo-yellow/45 hover:border-tokyo-yellow/65 transition-all duration-200">
                  <div class="flex items-center gap-2 mb-2">
                    <ZapIcon class="w-5 h-5 text-tokyo-yellow shrink-0" />
                    <h4 class="font-bold text-tokyo-light">Oathkeeper (Gateway)</h4>
                  </div>
                  <div class="text-xs text-cyber-muted mb-2 font-mono">api.cativo.dev – Single public entry point</div>
                  <div class="text-xs space-y-1">
                    <div class="text-tokyo-green">✓ Validates OAuth tokens</div>
                    <div class="text-tokyo-green">✓ Validates Kratos sessions</div>
                    <div class="text-tokyo-green">✓ Checks permissions (Keto)</div>
                    <div class="text-tokyo-green">✓ Injects trusted headers</div>
                    <div class="text-tokyo-green">✓ Routes to backends</div>
                  </div>
                </div>
                <div class="bg-tokyo-dark/80 rounded-lg p-4 border border-tokyo-accent/45 hover:border-tokyo-accent/65 transition-all duration-200">
                  <div class="flex items-center gap-2 mb-2">
                    <UsersIcon class="w-5 h-5 text-tokyo-accent shrink-0" />
                    <h4 class="font-bold text-tokyo-light">Auth UI (Kratos)</h4>
                  </div>
                  <div class="text-xs text-cyber-muted mb-2 font-mono">auth.cativo.dev – Self-service UI</div>
                  <div class="text-xs space-y-1 text-tokyo-light/80 font-mono">
                    <div>• Login / Registration</div>
                    <div>• Password Recovery</div>
                    <div>• Email Verification</div>
                    <div>• MFA Setup</div>
                    <div>• OAuth Consent Screen</div>
                  </div>
                </div>
                <div class="bg-tokyo-dark/80 rounded-lg p-4 border border-tokyo-accent-2/45 hover:border-tokyo-accent-2/65 transition-all duration-200">
                  <div class="flex items-center gap-2 mb-2">
                    <ShieldIcon class="w-5 h-5 text-tokyo-accent-2 shrink-0" />
                    <h4 class="font-bold text-tokyo-light">Admin Dashboard</h4>
                  </div>
                  <div class="text-xs text-cyber-muted mb-2 font-mono">admin.cativo.dev – Platform management</div>
                  <div class="text-xs space-y-1 text-tokyo-light/80 font-mono">
                    <div>• User Management</div>
                    <div>• OAuth Client Registry</div>
                    <div>• System Management</div>
                    <div>• Analytics & Logs</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 class="font-semibold mb-3 text-tokyo-red/90 font-mono uppercase tracking-wider text-sm">Backend services (private)</h3>
              <div class="space-y-3">
                <div class="bg-tokyo-dark rounded-lg p-3 border border-tokyo-light/15 hover:border-tokyo-light/30 transition-all duration-200 font-mono text-sm">
                  <div class="font-semibold mb-1 text-tokyo-light">Ory Kratos</div>
                  <div class="text-xs text-cyber-muted">Identity Management</div>
                </div>
                <div class="bg-tokyo-dark rounded-lg p-3 border border-tokyo-light/15 hover:border-tokyo-light/30 transition-all duration-200 font-mono text-sm">
                  <div class="font-semibold mb-1 text-tokyo-light">Ory Hydra</div>
                  <div class="text-xs text-cyber-muted">OAuth2 / OIDC Server</div>
                </div>
                <div class="bg-tokyo-dark rounded-lg p-3 border border-tokyo-light/15 hover:border-tokyo-light/30 transition-all duration-200 font-mono text-sm">
                  <div class="font-semibold mb-1 text-tokyo-light">Ory Keto</div>
                  <div class="text-xs text-cyber-muted">Authorization (ReBAC)</div>
                </div>
                <div class="bg-tokyo-dark rounded-lg p-3 border border-tokyo-light/15 hover:border-tokyo-light/30 transition-all duration-200 font-mono text-sm">
                  <div class="font-semibold mb-1 text-tokyo-light">AppRegistry Service</div>
                  <div class="text-xs text-cyber-muted">System Management API</div>
                </div>
                <div class="bg-tokyo-dark rounded-lg p-3 border border-tokyo-light/15 hover:border-tokyo-light/30 transition-all duration-200 font-mono text-sm">
                  <div class="flex items-center gap-2">
                    <DatabaseIcon class="w-4 h-4 text-tokyo-light/70 shrink-0" />
                    <div class="font-semibold">PostgreSQL</div>
                  </div>
                  <div class="text-xs text-cyber-muted">Kratos + Hydra + Keto + AppRegistry</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Layer 3: Application Backends -->
      <div class="mb-6 opacity-0 animate-fade-in-up" style="animation-delay: 340ms; animation-fill-mode: forwards">
        <div class="arch-card bg-tokyo-storm/80 border border-tokyo-green/40 rounded-xl p-6 backdrop-blur-sm hover:border-tokyo-green/60 hover:shadow-neon-green/30 transition-all duration-300">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2 font-mono tracking-wide">
            <ServerIcon class="w-6 h-6 text-tokyo-green shrink-0" />
            <span class="text-tokyo-green">Layer 3:</span> Application Backends (multiple APIs &amp; microservices)
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-tokyo-dark/70 rounded-lg p-4 border border-tokyo-green/35 hover:border-tokyo-green/55 hover:shadow-neon-green/50 transition-all duration-200">
              <div class="font-semibold mb-2 flex items-center gap-2 text-tokyo-light">
                <CodeIcon class="w-4 h-4 text-tokyo-green shrink-0" />
                Blog API
              </div>
              <div class="text-xs space-y-1 text-cyber-muted font-mono">
                <div>• Posts CRUD</div>
                <div>• Comments</div>
                <div>• Categories</div>
                <div>• Media Upload</div>
              </div>
              <div class="mt-3 text-xs font-mono">
                <div class="text-tokyo-accent">→ Receives headers from Oathkeeper</div>
                <div class="text-tokyo-green">→ Trusts X-User-ID</div>
                <div class="text-tokyo-accent-2">→ Business logic</div>
              </div>
            </div>
            <div class="bg-tokyo-dark/70 rounded-lg p-4 border border-tokyo-green/35 hover:border-tokyo-green/55 hover:shadow-neon-green/50 transition-all duration-200">
              <div class="font-semibold mb-2 flex items-center gap-2 text-tokyo-light">
                <CodeIcon class="w-4 h-4 text-tokyo-green shrink-0" />
                Shop API
              </div>
              <div class="text-xs space-y-1 text-cyber-muted font-mono">
                <div>• Products</div>
                <div>• Orders</div>
                <div>• Payments</div>
                <div>• Inventory</div>
              </div>
              <div class="mt-3 text-xs font-mono">
                <div class="text-tokyo-accent">→ Receives headers from Oathkeeper</div>
                <div class="text-tokyo-green">→ Trusts X-User-ID</div>
                <div class="text-tokyo-accent-2">→ Business logic</div>
              </div>
            </div>
            <div class="bg-tokyo-dark/70 rounded-lg p-4 border border-tokyo-green/35 hover:border-tokyo-green/55 hover:shadow-neon-green/50 transition-all duration-200">
              <div class="font-semibold mb-2 flex items-center gap-2 text-tokyo-light">
                <CodeIcon class="w-4 h-4 text-tokyo-green shrink-0" />
                CRM API
              </div>
              <div class="text-xs space-y-1 text-cyber-muted font-mono">
                <div>• Leads</div>
                <div>• Contacts</div>
                <div>• Deals</div>
                <div>• Activities</div>
              </div>
              <div class="mt-3 text-xs font-mono">
                <div class="text-tokyo-accent">→ Receives headers from Oathkeeper</div>
                <div class="text-tokyo-green">→ Trusts X-User-ID</div>
                <div class="text-tokyo-accent-2">→ Business logic</div>
              </div>
            </div>
          </div>
          <div class="mt-4 p-4 bg-tokyo-dark/80 rounded-lg border border-tokyo-green/40">
            <div class="text-sm font-semibold text-tokyo-green mb-2 font-mono">✓ Common traits (all APIs / microservices):</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-tokyo-light/80 font-mono">
              <div>• Do NOT validate OAuth tokens</div>
              <div>• Do NOT call Kratos/Hydra</div>
              <div>• Private network only</div>
              <div>• Trust Oathkeeper headers</div>
              <div>• Implement business permissions</div>
              <div>• Own database</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Flow Diagrams -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 opacity-0 animate-fade-in-up" style="animation-delay: 400ms; animation-fill-mode: forwards">
        <div class="arch-card bg-tokyo-storm/90 rounded-xl p-6 border border-tokyo-accent/40 hover:border-tokyo-accent/60 hover:shadow-neon-cyan/30 transition-all duration-300 backdrop-blur-sm">
          <h3 class="font-bold mb-4 text-tokyo-accent font-mono">Flow: &quot;Login with Nova ID&quot;</h3>
          <div class="space-y-2 text-sm font-mono">
            <div v-for="item in loginFlowSteps" :key="item.step" class="flex items-center gap-2">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                :class="item.badgeClass"
              >
                {{ item.step }}
              </div>
              <span class="text-tokyo-light/85">{{ item.text }}</span>
            </div>
          </div>
        </div>
        <div class="arch-card bg-tokyo-storm/90 rounded-xl p-6 border border-tokyo-green/40 hover:border-tokyo-green/60 hover:shadow-neon-green/30 transition-all duration-300 backdrop-blur-sm">
          <h3 class="font-bold mb-4 text-tokyo-green font-mono">Flow: Request to protected API</h3>
          <div class="space-y-2 text-sm font-mono">
            <div v-for="item in apiFlowSteps" :key="item.step" class="flex items-center gap-2">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                :class="item.badgeClass"
              >
                {{ item.step }}
              </div>
              <span class="text-tokyo-light/85">{{ item.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Network Architecture -->
      <div class="arch-card bg-tokyo-storm/90 rounded-xl p-6 border border-tokyo-accent/40 hover:border-tokyo-accent/60 hover:shadow-glow mb-6 opacity-0 animate-fade-in-up backdrop-blur-sm transition-all duration-300" style="animation-delay: 460ms; animation-fill-mode: forwards">
        <h3 class="font-bold mb-4 text-tokyo-accent flex items-center gap-2 font-mono">
          <ShieldIcon class="w-5 h-5 shrink-0" />
          Network architecture (Zero Trust)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-tokyo-dark/80 rounded-lg p-4 border border-tokyo-red/45 hover:border-tokyo-red/65 transition-all duration-200">
            <div class="font-semibold mb-2 text-tokyo-red font-mono">🌐 Public network</div>
            <div class="text-xs text-tokyo-light/80 font-mono">Only Oathkeeper exposed (port 4455)</div>
          </div>
          <div class="bg-tokyo-dark/80 rounded-lg p-4 border border-tokyo-yellow/45 hover:border-tokyo-yellow/65 transition-all duration-200">
            <div class="font-semibold mb-2 text-tokyo-yellow font-mono">🔒 Apps network</div>
            <div class="text-xs text-tokyo-light/80 space-y-1 font-mono">
              <div>• Oathkeeper</div>
              <div>• Application backends (APIs &amp; microservices)</div>
              <div>• Frontends</div>
            </div>
          </div>
          <div class="bg-tokyo-dark/80 rounded-lg p-4 border border-tokyo-accent-2/45 hover:border-tokyo-accent-2/65 transition-all duration-200">
            <div class="font-semibold mb-2 text-tokyo-accent-2 font-mono">🛡️ Ory internal network</div>
            <div class="text-xs text-tokyo-light/80 space-y-1 font-mono">
              <div>• Kratos, Hydra, Keto</div>
              <div>• PostgreSQL</div>
              <div>• AppRegistry</div>
            </div>
          </div>
        </div>
        <div class="mt-4 p-3 bg-tokyo-dark/80 rounded-lg border border-tokyo-accent/35 font-mono">
          <div class="text-sm font-semibold text-tokyo-accent mb-2">✓ Layered security:</div>
          <div class="text-xs text-tokyo-light/80 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>• Backends NOT accessible from the internet</div>
            <div>• Only Oathkeeper can reach backends</div>
            <div>• Ory stack fully private</div>
            <div>• Strict network policies</div>
          </div>
        </div>
      </div>

      <!-- Scalability -->
      <div class="arch-card bg-tokyo-storm/80 rounded-xl p-6 border border-tokyo-accent/35 hover:border-tokyo-accent/55 mb-6 opacity-0 animate-fade-in-up backdrop-blur-sm transition-all duration-300" style="animation-delay: 520ms; animation-fill-mode: forwards">
        <h3 class="font-bold mb-4 text-tokyo-accent font-mono">🚀 Scalability: adding new systems</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div class="font-semibold mb-3 text-tokyo-cyan font-mono">Add a new app (e.g. Analytics)</div>
            <div class="space-y-2 text-sm font-mono">
              <div class="flex items-start gap-2">
                <span class="text-tokyo-green mt-1">1.</span>
                <span class="text-tokyo-light/80">Register in AppRegistry (1 API call)</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-tokyo-green mt-1">2.</span>
                <span class="text-tokyo-light/80">Get OAuth Client ID/Secret</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-tokyo-green mt-1">3.</span>
                <span class="text-tokyo-light/80">Implement &quot;Login with Nova ID&quot;</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-tokyo-green mt-1">4.</span>
                <span class="text-tokyo-light/80">Done ✅ (5 minutes)</span>
              </div>
            </div>
          </div>
          <div>
            <div class="font-semibold mb-3 text-tokyo-cyan font-mono">What you do NOT need to do:</div>
            <div class="space-y-1 text-sm text-cyber-muted font-mono">
              <div>❌ Configure Oathkeeper manually</div>
              <div>❌ Write Keto scripts</div>
              <div>❌ Implement auth system</div>
              <div>❌ Handle passwords</div>
              <div>❌ Set up OAuth from scratch</div>
              <div>❌ SSO setup</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 opacity-0 animate-fade-in-up" style="animation-delay: 580ms; animation-fill-mode: forwards">
        <div class="arch-card bg-tokyo-storm/90 rounded-lg p-4 text-center border border-tokyo-accent/30 hover:border-tokyo-accent/50 hover:shadow-neon-cyan/30 transition-all duration-300 backdrop-blur-sm">
          <div class="text-3xl font-bold text-tokyo-accent mb-1 font-mono">1</div>
          <div class="text-sm text-cyber-muted font-mono">Identity Provider</div>
        </div>
        <div class="arch-card bg-tokyo-storm/90 rounded-lg p-4 text-center border border-tokyo-accent-2/30 hover:border-tokyo-accent-2/50 hover:shadow-neon-purple/30 transition-all duration-300 backdrop-blur-sm">
          <div class="text-3xl font-bold text-tokyo-accent-2 mb-1 font-mono">∞</div>
          <div class="text-sm text-cyber-muted font-mono">Apps / systems</div>
        </div>
        <div class="arch-card bg-tokyo-storm/90 rounded-lg p-4 text-center border border-tokyo-green/30 hover:border-tokyo-green/50 hover:shadow-neon-green/30 transition-all duration-300 backdrop-blur-sm">
          <div class="text-3xl font-bold text-tokyo-green mb-1 font-mono">4</div>
          <div class="text-sm text-cyber-muted font-mono">Ory Services</div>
        </div>
        <div class="arch-card bg-tokyo-storm/90 rounded-lg p-4 text-center border border-tokyo-cyan/30 hover:border-tokyo-cyan/50 hover:shadow-neon-cyan/30 transition-all duration-300 backdrop-blur-sm">
          <div class="text-3xl font-bold text-tokyo-cyan mb-1 font-mono">0</div>
          <div class="text-sm text-cyber-muted font-mono">Trust by Default</div>
        </div>
      </div>

      <router-link
        to="/"
        class="inline-flex items-center gap-2 text-sm font-medium font-mono text-tokyo-accent hover:text-tokyo-accent-2 hover:drop-shadow-neon-cyan transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-tokyo-accent/50 rounded opacity-0 animate-fade-in-up"
        style="animation-delay: 640ms; animation-fill-mode: forwards"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </router-link>
    </div>
  </div>
</template>

<script setup>
// Flow steps: rendered in template so content always shows (no runtime template component)
const badgeCyan = 'bg-tokyo-accent text-tokyo-bg';
const badgePurple = 'bg-tokyo-accent-2 text-tokyo-bg';
const badgeGreen = 'bg-tokyo-green text-tokyo-bg';
const badgeYellow = 'bg-tokyo-yellow text-tokyo-bg';

const loginFlowSteps = [
  { step: 1, badgeClass: badgeCyan, text: 'User → Blog App → Click "Login with Nova ID"' },
  { step: 2, badgeClass: badgeCyan, text: 'Redirect → auth.cativo.dev/oauth2/auth' },
  { step: 3, badgeClass: badgePurple, text: 'Hydra → Kratos login screen' },
  { step: 4, badgeClass: badgePurple, text: 'User enters credentials' },
  { step: 5, badgeClass: badgePurple, text: 'Consent screen (permissions)' },
  { step: 6, badgeClass: badgeGreen, text: 'Hydra → authorization code' },
  { step: 7, badgeClass: badgeGreen, text: 'Blog App → exchange code for token' },
  { step: 8, badgeClass: badgeGreen, text: 'User logged in ✅' },
];

const apiFlowSteps = [
  { step: 1, badgeClass: badgeCyan, text: 'Blog App → GET /api/posts (Bearer token)' },
  { step: 2, badgeClass: badgeYellow, text: 'Oathkeeper validates token with Hydra' },
  { step: 3, badgeClass: badgeYellow, text: 'Oathkeeper checks permissions (Keto)' },
  { step: 4, badgeClass: badgeYellow, text: 'Oathkeeper injects headers' },
  { step: 5, badgeClass: badgeGreen, text: 'Forward → Blog API (with headers)' },
  { step: 6, badgeClass: badgeGreen, text: 'Blog API trusts X-User-ID' },
  { step: 7, badgeClass: badgeGreen, text: 'Blog API applies business logic' },
  { step: 8, badgeClass: badgeGreen, text: 'Response → Blog App ✅' },
];

// Inline icon components (no external deps)
const GlobeIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>`
};
const SmartphoneIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`
};
const CloudIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>`
};
const ServerIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>`
};
const ShieldIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`
};
const ZapIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`
};
const UsersIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`
};
const DatabaseIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>`
};
const CodeIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>`
};
</script>

<style scoped>
.arch-page {
  font-family: theme('fontFamily.sans');
}

/* Scanline: thin moving line for cyberpunk CRT effect */
.arch-scanline {
  height: 4px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(125, 207, 255, 0.12) 50%,
    transparent 100%
  );
  animation: scanline 8s linear infinite;
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

/* Card subtle inner glow on hover */
.arch-card:hover {
  box-shadow: 0 0 24px -4px rgba(125, 207, 255, 0.15), 0 0 48px -12px rgba(187, 154, 247, 0.1);
}
</style>
