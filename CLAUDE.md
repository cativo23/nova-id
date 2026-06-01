# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nova ID is an Identity and Access Management (IAM) system built on the **Ory Stack** (Kratos, Hydra, Keto, Oathkeeper) with a **Zero Trust** architecture. All client traffic routes through Oathkeeper — internal Ory services are never exposed directly.

- **API**: NestJS (TypeScript) on port 8080
- **frontend-auth**: Vue 3 + Vite auth UI on port 5173
- **frontend-admin**: Vue 3 + Vite admin dashboard on port 5174
- **frontend-app**: Vue 3 + Vite test app on port 5175
- **Ory Stack**: Kratos (identity), Hydra (OAuth2), Keto (RBAC), Oathkeeper (gateway)

## Common Commands

### Docker / Full Stack

```bash
make dev                  # Start all services (docker compose up -d)
make dev-local            # Start with local domains (auth.ory.localhost)
make clean                # Stop and remove all containers + volumes
make logs                 # Follow all service logs
make logs-service SERVICE=kratos  # Follow specific service
make health               # Check Ory service health endpoints
make test                 # Run comprehensive stack tests (scripts/test-stack-comprehensive.sh)
make setup-permissions    # Setup RBAC roles (platform_admin / platform_user)
make setup-hydra-client   # Setup OAuth test client
```

### API (NestJS) — run from `api/`

```bash
npm run build             # nest build
npm run start:dev         # nest start --watch
npm run lint              # eslint --fix
npm run format            # prettier --write
npm test                  # jest (unit tests, *.spec.ts)
npm run test:watch        # jest --watch
npm run test:cov          # jest --coverage
npm run test:e2e          # jest with test/jest-e2e.json config
```

Run a single test file:
```bash
cd api && npx jest --testPathPattern='roles.service.spec'
```

### Frontends (Vue 3 + Vite) — run from `frontend-auth/`, `frontend-admin/`, or `frontend-app/`

```bash
npm run dev               # vite dev server
npm run build             # vite build
npm run preview           # vite preview
```

## Architecture

### Zero Trust Request Flow

```
Browser → Oathkeeper (4455) → Kratos (session validation)
  → Oathkeeper injects X-User-ID, X-User-Email, X-User-Role headers
  → Oathkeeper forwards to API (8080)
  → AuthenticatedGuard reads user from injected headers
  → RoleGuard/AppAdminGuard checks permissions via Keto
```

Clients never talk to Kratos, Hydra, or Keto directly — only through Oathkeeper.

### Network Isolation

- **`ory-internal`** network: Kratos, Hydra, Keto, Oathkeeper (private)
- **`apps`** network: API, frontends, Oathkeeper's public port (4455)
- Oathkeeper bridges both networks as the gateway

### Database Strategy

- **PostgreSQL**: Used by Ory Stack (Kratos, Hydra, Keto)
- **SQLite** (`api/data/app_roles.db`): Used by the API via TypeORM for application-level roles

### API Guard Chain

Guards are applied in this order on protected routes:

1. **`AuthenticatedGuard`** — Validates Oathkeeper headers (`X-User-ID`, `X-User-Email`, `X-User-Role`) or Bearer JWT
2. **`RoleGuard`** — Enforces platform-level roles (`platform_admin` / `platform_user`)
3. **`AppAdminGuard` / `AppUserGuard`** — App-specific role checks

### Custom Decorators

- `@Public()` — Skip authentication for a route
- `@GetUser()` — Extract user from request context (injected by Oathkeeper headers)
- `@RequireRole('platform_admin')` — Require a platform role
- `@RequireAppRole('app_admin')` — Require an app-level role
- `@LogAccess()` — Log access to Winston/access.log

### Frontend Composables

Each Vue 3 frontend uses composables for Ory integration:
- `useAuth()` — Session management via Kratos
- `useKeto()` — Permission checks
- `useHydra()` / `useHydraOAuth()` — OAuth2 flows
- `useApiTest()` — API endpoint testing
- `usePermissions()` — Admin permission checks

### Oathkeeper Rules

Routing rules live in `config/oathkeeper/access-rules.yml`. Each rule defines:
- **Match**: URL pattern and methods
- **Authenticator**: `noop` (public), `cookie_session` (web), `bearer_token` (mobile/OAuth)
- **Authorizer**: `allow` or `remote_json` (Keto permission check)
- **Mutator**: Header injection with user identity

## Key Configuration

| File | Purpose |
|------|---------|
| `config/oathkeeper/access-rules.yml` | Zero Trust routing rules (14 rules) |
| `config/kratos/identity.schema.json` | User identity traits (email, full_name, role) |
| `config/keto/` | RBAC namespace definitions |
| `config/hydra/` | OAuth2/OIDC config |
| `api/.eslintrc.js` | ESLint + TypeScript + Prettier |
| `api/.prettierrc` | Single quotes, trailing commas |

## Code Style

- **API**: TypeScript with ESLint + Prettier. Single quotes, trailing commas.
- **Frontends**: JavaScript (not TypeScript). Vue 3 Composition API with `<script setup>`.
- **CSS**: Tailwind CSS with custom Tokyo Night theme colors (`cyber-bg`, `tokyo-accent`, `tokyo-accent-2`).
- **Logging**: Winston (backend), custom `utils/logger.js` (frontends).

## Testing

- **Backend only**: Jest + Supertest. No test framework on frontends.
- **Unit tests**: `api/src/**/*.spec.ts`
- **E2E tests**: `api/test/app.e2e-spec.ts` (config: `api/test/jest-e2e.json`)
- **Stack tests**: Shell scripts in `scripts/` (run via `make test`)
