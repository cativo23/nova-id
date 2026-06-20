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
END
\$\$;

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE kratos TO ory_user;
GRANT ALL PRIVILEGES ON DATABASE hydra TO ory_user;
GRANT ALL PRIVILEGES ON DATABASE keto TO ory_user;
GRANT ALL PRIVILEGES ON DATABASE kratos TO kratos_user;
GRANT ALL PRIVILEGES ON DATABASE hydra TO hydra_user;
GRANT ALL PRIVILEGES ON DATABASE keto TO keto_user;
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

# Grant schema privileges for demo_app (uses postgres superuser — same as nova_audit)
psql -h postgres -U postgres -d demo_app <<EOF
GRANT ALL ON SCHEMA public TO postgres;
EOF
