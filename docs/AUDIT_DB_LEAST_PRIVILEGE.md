# Audit DB Least-Privilege & Storage-Enforced Append-Only

## Problem

The BFF (`api`) used to connect to the `nova_audit` database as the Postgres
**cluster superuser** (`AUDIT_DB_USER=postgres`). Any RCE/SQLi in the BFF yielded
a superuser credential over the *entire* cluster (Kratos identities, Hydra OAuth
secrets, Keto tuples) and could `TRUNCATE` the `audit_logs` ledger meant to detect
such tampering. Append-only was enforced only at the application layer
(`api/src/audit/audit.service.ts` omits update/delete).

## Design — two roles, no superuser

On the `nova_audit` database only:

| Role | Login | Purpose | Privileges |
|---|---|---|---|
| `nova_audit_migrator` | yes | Deploy-time DDL only | Owns `audit_logs` + `migrations`; `USAGE, CREATE` on schema. |
| `nova_audit_app` | yes | BFF runtime | `CONNECT`, schema `USAGE`, `INSERT, SELECT` on `audit_logs`. **No UPDATE/DELETE/TRUNCATE, not owner.** |

The genuine protection is that `nova_audit_app` **does not own** the table — an
owner can always TRUNCATE regardless of grants. A fully-compromised BFF can
append (and forge) rows but cannot delete or rewrite history.

Because the runtime role has no DDL, the app no longer runs migrations on boot:
`audit.module.ts` sets `migrationsRun: false`. Migrations are applied out-of-band
by the migrator via the one-shot `api-migrate` compose service
(`profiles: ["migrate"]`), which never starts on a normal `docker compose up`.

In the **prod image** there is no ts-node (devDeps stripped, see `api/Dockerfile`),
so the migrate service runs the compiled CLI against a JS datasource:
`node node_modules/typeorm/cli.js migration:run -d dist/audit/audit.datasource.runtime.js`.

## Production bootstrap (MANUAL, once)

Role creation + ownership reassignment requires the **postgres superuser** and
therefore cannot live in `deploy-prod.sh` (command-restricted, bootstrap-only) or
in CI (no DB credentials). Run it by hand on the host.

1. Add two strong passwords to `/home/<user>/deploy/nova-id-deploy/.env.production`
   (keep `chmod 600`):
   ```
   AUDIT_APP_PASSWORD=...
   AUDIT_MIGRATOR_PASSWORD=...
   ```
2. Apply the bootstrap SQL as `postgres` against the live `nova_audit` DB. This
   uses targeted `ALTER TABLE ... OWNER` — **not** `REASSIGN OWNED BY postgres`,
   which would also reassign ownership of *every other database* postgres owns
   (kratos/hydra/keto/...):
   ```bash
   cd /home/<user>/deploy/nova-id-deploy
   C=nova-id-deploy-postgres-1
   PGPW="$(grep -E '^POSTGRES_PASSWORD=' .env.production | cut -d= -f2-)"
   APW="$(grep -E '^AUDIT_APP_PASSWORD=' .env.production | cut -d= -f2-)"
   MPW="$(grep -E '^AUDIT_MIGRATOR_PASSWORD=' .env.production | cut -d= -f2-)"
   docker exec -i -e PGPASSWORD="$PGPW" "$C" psql -U postgres -d nova_audit \
     -v ON_ERROR_STOP=1 -v app_pw="$APW" -v migrator_pw="$MPW" <<'SQL'
   CREATE ROLE nova_audit_migrator LOGIN PASSWORD :'migrator_pw';
   CREATE ROLE nova_audit_app      LOGIN PASSWORD :'app_pw';
   ALTER TABLE audit_logs OWNER TO nova_audit_migrator;
   ALTER TABLE migrations OWNER TO nova_audit_migrator;
   REVOKE ALL ON SCHEMA public FROM PUBLIC;
   GRANT USAGE ON SCHEMA public TO nova_audit_app;
   GRANT USAGE, CREATE ON SCHEMA public TO nova_audit_migrator;
   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
   GRANT INSERT, SELECT ON audit_logs TO nova_audit_app;
   REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON audit_logs FROM nova_audit_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE nova_audit_migrator IN SCHEMA public
     GRANT INSERT, SELECT ON TABLES TO nova_audit_app;
   REVOKE CONNECT ON DATABASE nova_audit FROM PUBLIC;
   GRANT CONNECT ON DATABASE nova_audit TO nova_audit_app, nova_audit_migrator;
   SQL
   ```
   > psql variable interpolation (`:'var'`) does NOT work inside a `DO $$ ... $$`
   > block — use the plain `CREATE ROLE` statements above.
3. Verify the lockdown:
   ```bash
   docker exec -i "$C" psql "host=localhost user=nova_audit_app dbname=nova_audit password=$APW" \
     -c "INSERT INTO audit_logs(\"actorId\",action) VALUES('bootstrap','test.boot');" \
     -c "DELETE FROM audit_logs;"   # MUST fail: permission denied
   ```
   INSERT must succeed; DELETE/UPDATE/TRUNCATE must all error `permission denied`.

**Ordering matters:** run this bootstrap BEFORE deploying the app build that
switches `AUDIT_DB_USER` to `nova_audit_app`. The roles sitting unused are
harmless to the currently-running build (which still connects as `postgres`).

## Normal releases

No audit migration → nothing extra. The app boots as `nova_audit_app` against the
existing table with `migrationsRun: false`.

## Releases that add an audit migration (rare)

Before tagging/deploying, run the migrator one-shot on the host:
```bash
IMAGE_TAG=vX.Y.Z docker compose --env-file .env.production \
  -f docker-compose.production.yml --profile migrate run --rm api-migrate
```

## Dev / fresh environments

`config/init-sql/create-users.sh` creates both roles and the schema-level grants
(table grants flow via `ALTER DEFAULT PRIVILEGES`). After a fresh `docker compose
up`, create the table once:
```bash
docker compose --profile migrate run --rm api-migrate
```

## Post-deploy check (important)

Audit writes are best-effort — `audit.service.ts` swallows errors. A wrong
`AUDIT_APP_PASSWORD` will NOT fail smoke tests (`/api/health` does not write
audit); it manifests as silently-lost audit rows. After deploying, perform one
admin action and confirm a new row lands in `audit_logs`. Consider a Sentry alert
on "Audit write failed".

## Residual risk (NOT covered)

- A compromised BFF can still **forge** audit rows (INSERT) — append-only stops
  deletion, not fabrication.
- `nova_audit_migrator` / `postgres` (host-root / DB-host compromise) can still
  TRUNCATE. No hash-chain / WORM / off-box shipping yet.
- `postgres` superuser still exists; other Ory services remain broadly privileged
  on their own DBs. This change scopes the **BFF** only.
