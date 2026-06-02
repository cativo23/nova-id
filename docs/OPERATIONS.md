# Operations & Testing

This guide covers running, verifying, and troubleshooting Nova ID.

---

## Security and deployment requirements

- **API must only be reachable via Oathkeeper.** Do not expose the API (port 8080) to the public internet. All client traffic must go through the gateway; the API trusts headers (`X-User-ID`, etc.) injected by Oathkeeper. See [SECURITY_REPORT.md](SECURITY_REPORT.md).
- **Hydra Admin API:** The API calls Hydra Admin (login/consent accept) from the server. Set `HYDRA_ADMIN_URL=http://hydra:4445` (or your internal Hydra Admin URL). Do **not** expose Hydra Admin (port 4445) to the public internet. In local dev, the rule `internal-hydra-admin` (if used) must only be reachable from the API service on the internal network.
- **Secrets:** Generate all secrets (Kratos, Hydra) with e.g. `openssl rand -base64 32`. Never deploy with placeholder values. See `.env.example`.

---

## Compose files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base stack (Ory, API, frontends). No `local-proxy`. |
| `docker-compose.local.yml` | Local override: adds **local-proxy** (port 80) for auth.ory.localhost, admin.ory.localhost, etc. **Development only** — never used in production. |
| `docker-compose.production.yml` | Production override: Traefik labels, no exposed ports. **Does not include local-proxy.** |

- **Dev (ports 5173/5174/5175):** `docker compose up -d`
- **Dev with local domains + local-proxy:** `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d` or `./start-local.sh`
- **Production:** `docker compose -f docker-compose.yml -f docker-compose.production.yml up -d` or `./start-production.sh`

---

## Service management

### Start / stop

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```

Wait 30–60 seconds after `up` for migrations and services to be ready.

### Restart

```bash
# Restart all
docker compose restart

# Restart a single service
docker compose restart kratos
docker compose restart api
docker compose restart oathkeeper
```

### Status and logs

```bash
# List running services
docker compose ps

# Logs (all services, follow)
docker compose logs -f

# Logs for one service
docker compose logs -f api
docker compose logs -f oathkeeper
docker compose logs -f kratos

# Last N lines
docker compose logs --tail 100 api
```

---

## Health checks

### Manual checks

| Service    | Endpoint                    | Expected        |
|-----------|-----------------------------|-----------------|
| Kratos    | `GET http://localhost:4434/health/ready` | `{"status":"ok"}` |
| Keto Read | `GET http://localhost:4466/health/ready` | `{"status":"ok"}` |
| Keto Write| `GET http://localhost:4467/health/ready` | `{"status":"ok"}` |
| Hydra     | `GET http://localhost:4445/health/alive` | `{"status":"ok"}` |
| Oathkeeper| `GET http://localhost:4456/health/alive` | `{"status":"ok"}` |
| API       | `GET http://localhost:8080/health`       | `{"status":"ok",...}` |

```bash
curl -s http://localhost:4434/health/ready | jq .
curl -s http://localhost:4466/health/ready | jq .
curl -s http://localhost:4456/health/alive | jq .
curl -s http://localhost:8080/health | jq .
```

### API via Oathkeeper

```bash
# Public (no auth)
curl -s http://localhost:4455/api/health | jq .
curl -s http://localhost:4455/api/public | jq .

# Protected (requires session cookie from browser login)
# Use browser dev tools to copy cookie, then:
curl -s -b "ory_kratos_session=..." http://localhost:4455/api/protected | jq .
```

---

## Permissions

### Setup RBAC

```bash
./scripts/setup-all-permissions.sh
```

Run after a fresh start or after resetting Keto. Grants permissions to `platform_admin` and assigns users from Kratos `traits.role`.

### Reset permissions

```bash
./scripts/clear-all-permissions.sh
./scripts/setup-all-permissions.sh
```

### Assign platform_admin

```bash
./scripts/assign-platform-admin-to-user.sh user@example.com
```

### Verify Keto tuples

```bash
# List relation tuples
curl -s "http://localhost:4466/relation-tuples" | jq .

# By namespace
curl -s "http://localhost:4466/relation-tuples?namespace=ranks" | jq .

# By user
USER_ID="<kratos-identity-id>"
curl -s "http://localhost:4466/relation-tuples?subject_id=user:$USER_ID" | jq .
```

---

## Testing

### Stack test

```bash
./scripts/test-stack-comprehensive.sh
```

Covers Kratos, Keto, Hydra, Oathkeeper, and permission layout.

### Email

```bash
# Test email sending
./scripts/test-email-sending.sh

# With real user (from Kratos)
./scripts/test-email-with-real-user.sh
```

Inbox: **Mailpit** at http://localhost:8025.

### OAuth2 / Hydra

```bash
./scripts/setup-hydra-test-client.sh
```

Then use the Auth UI or Hydra flows to obtain tokens and call APIs.

### Manual API checks

```bash
# Health
curl -s http://localhost:8080/health | jq .

# Public
curl -s http://localhost:4455/api/public | jq .

# Kratos identities (admin; ensure 4434 exposed)
curl -s http://localhost:4434/admin/identities | jq '.[] | {id, email: .traits.email, role: .traits.role}'
```

---

## Application URLs

| App        | URL                        |
|------------|----------------------------|
| Auth UI    | http://localhost:5173      |
| Admin      | http://localhost:5174      |
| Test app   | http://localhost:5175      |
| Mailpit    | http://localhost:8025      |
| API (gateway) | http://localhost:4455   |

---

## Troubleshooting

### Services not healthy

1. Check `docker compose logs` for the failing service (often `kratos`, `hydra`, `keto`, or `api`).
2. Ensure PostgreSQL is up and migrations have run (`kratos-migrate`, `hydra-migrate`, `keto-migrate`).
3. Try a full restart:

   ```bash
   docker compose down && docker compose up -d
   ```

   Wait 1–2 minutes, then re-check health.

### “Expected exactly one rule” (Oathkeeper)

The request matches more than one Oathkeeper access rule. Check `config/oathkeeper/rules.local.json` / `config/oathkeeper/rules.production.json`: URL patterns must not overlap (e.g. `/api/health` vs `/api/*`). Public routes should be more specific or listed first.

### 401 on protected endpoints

- **Browser:** Ensure you’re logged in and the session cookie is sent (same origin or correct Oathkeeper URL). Clear cookies and log in again.
- **curl:** Use `-b "ory_kratos_session=..."` with a valid session cookie obtained from the browser.

### 403 on admin endpoints

User must have `platform_admin`. Assign it:

```bash
./scripts/assign-platform-admin-to-user.sh user@example.com
```

### CORS errors

Frontend must call the API via the same origin (e.g. Vite proxy to Oathkeeper) or Oathkeeper must allow the frontend origin. Check `vite.config.js` proxy and Oathkeeper CORS/config.

### Email not received

- Development: check **Mailpit** (http://localhost:8025).
- Verify Kratos courier config in `config/kratos/kratos.local.yml` (SMTP / Mailpit).
- Run `./scripts/test-email-sending.sh` to confirm sending.

### Database issues

```bash
# PostgreSQL ready
docker compose exec postgres pg_isready -U postgres

# Connect
docker compose exec postgres psql -U postgres -c "\l"
```

If you use custom DB names/users, adjust accordingly. For a clean slate, `docker compose down -v` and then `up -d` (this removes volumes).

---

## Makefile targets

From project root:

```bash
make help              # List targets
make dev               # Start dev stack (docker compose up -d)
make dev-local         # Start dev with local domains + local-proxy (docker-compose.local.yml)
make prod              # Start production stack (docker-compose.production.yml)
make stop              # Stop dev stack
make stop-prod         # Stop production stack
make logs              # Follow logs (dev)
make ps                # Service status (dev)
make health            # Basic health checks
make setup-permissions # Run setup-all-permissions.sh
make clear-permissions # Run clear-all-permissions.sh
make test              # Run test-stack-comprehensive.sh
make test-email        # Run test-email-sending.sh
make test-email-real   # Run test-email-with-real-user.sh
make setup-hydra-client # Run setup-hydra-test-client.sh
make generate-env      # Run generate-env.sh
```

---

## OAuth back-button (app login)

When a user logs in from the **app** (OAuth) and then uses the browser **Back** button, they may land on auth URLs with a stale `return_to=...hydra-callback...`. The **frontend (auth)** handles this:

- **HydraCallback** and **Consent**: on stale/used challenge, redirect to the app.
- **Login** (`session_already_available` or no `return_to`): redirect to the app (never to admin).

The **local-proxy (nginx)** in `config/nginx/local-proxy.conf` is only for exposing local domains in development; it is **not** modified for this behavior. In **production with Traefik**, if you want to avoid the user seeing a 400 when they Back into `GET /api/self-service/login/browser?return_to=...hydra-callback...`, you can add a redirect rule in Traefik (e.g. when `Sec-Fetch-Mode: navigate` and `return_to` contains `hydra-callback`, respond with 302 to the app). Otherwise, the frontend redirects from HydraCallback/Consent/Login are enough for most cases.

---

## Next steps

- [Getting Started](GETTING_STARTED.md) — Install and first login  
- [Architecture](ARCHITECTURE.md) — System design  
- [Auth & RBAC](AUTH_AND_RBAC.md) — Roles and permissions  
- [Scripts README](../scripts/README.md) — All scripts
