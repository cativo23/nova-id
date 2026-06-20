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
