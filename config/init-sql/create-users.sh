#!/bin/bash
# Create database users for each service
# This script is executed by postgres-init service

set -e

export PGPASSWORD=${POSTGRES_PASSWORD}

# Create users using DO blocks to handle existing users gracefully
psql -h postgres -U postgres <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'ory_user') THEN
        CREATE USER ory_user WITH PASSWORD '${ORY_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'kratos_user') THEN
        CREATE USER kratos_user WITH PASSWORD '${KRATOS_DB_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'hydra_user') THEN
        CREATE USER hydra_user WITH PASSWORD '${HYDRA_DB_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'keto_user') THEN
        CREATE USER keto_user WITH PASSWORD '${KETO_DB_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'demo_user') THEN
        CREATE USER demo_user WITH PASSWORD '${DEMO_DB_PASSWORD}';
    END IF;
    -- Audit DB least-privilege roles (see docs/AUDIT_DB_LEAST_PRIVILEGE.md):
    --   nova_audit_migrator — DDL/owner, used only by the api-migrate service.
    --   nova_audit_app      — runtime BFF role: INSERT/SELECT on audit_logs only.
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'nova_audit_migrator') THEN
        CREATE USER nova_audit_migrator WITH PASSWORD '${AUDIT_MIGRATOR_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'nova_audit_app') THEN
        CREATE USER nova_audit_app WITH PASSWORD '${AUDIT_APP_PASSWORD}';
    END IF;
END
\$\$;

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE kratos TO ory_user;
GRANT ALL PRIVILEGES ON DATABASE hydra TO ory_user;
GRANT ALL PRIVILEGES ON DATABASE keto TO ory_user;
GRANT ALL PRIVILEGES ON DATABASE kratos TO kratos_user;
GRANT ALL PRIVILEGES ON DATABASE hydra TO hydra_user;
GRANT ALL PRIVILEGES ON DATABASE keto TO keto_user;
-- demo_user gets CONNECT on demo_app only. No schema or table privileges are
-- granted on kratos/hydra/keto, so even if PUBLIC CONNECT is in effect,
-- demo_user cannot read or write any IdP data (permission denied at schema level).
GRANT CONNECT ON DATABASE demo_app TO demo_user;
EOF

# Grant schema privileges
psql -h postgres -U postgres -d kratos <<EOF
GRANT ALL ON SCHEMA public TO kratos_user;
GRANT ALL ON SCHEMA public TO ory_user;
EOF

psql -h postgres -U postgres -d hydra <<EOF
GRANT ALL ON SCHEMA public TO hydra_user;
GRANT ALL ON SCHEMA public TO ory_user;
EOF

psql -h postgres -U postgres -d keto <<EOF
GRANT ALL ON SCHEMA public TO keto_user;
GRANT ALL ON SCHEMA public TO ory_user;
EOF

echo "Database users created successfully"

# Grant schema and table privileges for demo_app to demo_user (least-privilege).
# USAGE + CREATE on schema allows TypeORM to run migrations (CREATE TABLE etc.).
# FOR ROLE demo_user ensures the default privileges apply to objects created by
# demo_user (not the executor postgres). Without FOR ROLE, the grants would only
# apply when the postgres role creates objects, not when demo_user does.
psql -h postgres -U postgres -d demo_app <<EOF
GRANT USAGE, CREATE ON SCHEMA public TO demo_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO demo_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO demo_user;
ALTER DEFAULT PRIVILEGES FOR ROLE demo_user IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO demo_user;
ALTER DEFAULT PRIVILEGES FOR ROLE demo_user IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO demo_user;
EOF

# Audit DB least-privilege grants (nova_audit). On a fresh bootstrap the
# audit_logs table does not exist yet — it is created later by the api-migrate
# service running as nova_audit_migrator. So we grant at the SCHEMA level and use
# ALTER DEFAULT PRIVILEGES so that any table the migrator creates automatically
# grants INSERT/SELECT (and NOTHING else) to the runtime app role. The app can
# never UPDATE/DELETE/TRUNCATE the ledger — append-only at the storage layer.
# NOTE: production roles/grants are bootstrapped MANUALLY (this script is
# bootstrap-only and never runs in deploy) — see docs/AUDIT_DB_LEAST_PRIVILEGE.md.
psql -h postgres -U postgres -d nova_audit <<EOF
REVOKE CONNECT ON DATABASE nova_audit FROM PUBLIC;
GRANT CONNECT ON DATABASE nova_audit TO nova_audit_app, nova_audit_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO nova_audit_app;
GRANT USAGE, CREATE ON SCHEMA public TO nova_audit_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE nova_audit_migrator IN SCHEMA public
    GRANT INSERT, SELECT ON TABLES TO nova_audit_app;
EOF
