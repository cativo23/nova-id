#!/usr/bin/env bash
# scripts/bootstrap-prod.sh
#
# One-time production bootstrap for Nova ID on polaris2.
# Run ONCE after first server setup. NEVER run during routine redeploy.
#
# What this script does:
#   1. Validates environment (must be in ~/deploy/nova-id-deploy).
#   2. Checks .env.production and JWKS exist.
#   3. [--first-boot] Starts the Ory migration services (kratos-migrate,
#      hydra-migrate, keto-migrate) and postgres-init.
#   4. [--assign-admin <email>] Assigns platform_admin role to a user.
#   5. [--with-new-db <dbname>] Idempotent helper: CREATE DATABASE IF NOT
#      EXISTS, then re-runs postgres-init for grants.
#
# Usage:
#   ./scripts/bootstrap-prod.sh --first-boot
#   ./scripts/bootstrap-prod.sh --assign-admin user@example.com
#   ./scripts/bootstrap-prod.sh --with-new-db demo_app
#
# NEVER run:
#   - scripts/generate-jwks.sh from this script. JWKS generation is a manual
#     step done before deploy (key rotation requires a planned cutover).
#   - This script as part of automated CD. It is human-only.

set -euo pipefail

DEPLOY_DIR="/home/cativo23/deploy/nova-id-deploy"
COMPOSE_CMD="docker compose --env-file .env.production -f docker-compose.production.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[bootstrap]${NC} $*"; }
success() { echo -e "${GREEN}[bootstrap]${NC} $*"; }
warn()    { echo -e "${YELLOW}[bootstrap]${NC} $*"; }
error()   { echo -e "${RED}[bootstrap]${NC} $*" >&2; }

# ── Guard: must run from the deploy directory ────────────────────────────────

if [[ "$(pwd)" != "${DEPLOY_DIR}" ]]; then
  cd "${DEPLOY_DIR}" || { error "Cannot cd to ${DEPLOY_DIR}"; exit 1; }
fi

if [[ ! -f ".env.production" ]]; then
  error ".env.production not found. Bootstrap cannot proceed."
  exit 1
fi

if [[ ! -f "config/oathkeeper/id_token.jwks.json" ]]; then
  error "config/oathkeeper/id_token.jwks.json not found."
  error "Generate it ONCE with: bash scripts/generate-jwks.sh"
  error "Then chmod 644 config/oathkeeper/id_token.jwks.json"
  exit 1
fi

# ── Subcommands ──────────────────────────────────────────────────────────────

CMD="${1:-}"

case "${CMD}" in

  --first-boot)
    info "Running first-boot migration services..."
    warn "This runs postgres-init + all Ory *-migrate services."
    warn "Safe to re-run: migration commands are idempotent."

    # Start DB first, wait for health
    ${COMPOSE_CMD} up -d postgres
    info "Waiting for postgres to be healthy..."
    until ${COMPOSE_CMD} exec -T postgres pg_isready -U postgres; do sleep 2; done

    # Run init + migrate services (one-shot, restart: "no")
    ${COMPOSE_CMD} up postgres-init kratos-migrate hydra-migrate keto-migrate

    success "First-boot migrations complete. Run deploy-prod.sh <version> to start the stack."
    ;;

  --assign-admin)
    EMAIL="${2:-}"
    if [[ -z "${EMAIL}" ]]; then
      error "Usage: $0 --assign-admin <email>"
      exit 1
    fi
    info "Assigning platform_admin to ${EMAIL}..."
    # Delegate to existing idempotent script
    bash scripts/assign-platform-admin-to-user.sh "${EMAIL}"
    success "Platform admin assigned to ${EMAIL}."
    ;;

  --with-new-db)
    DBNAME="${2:-}"
    if [[ -z "${DBNAME}" ]]; then
      error "Usage: $0 --with-new-db <dbname>"
      exit 1
    fi
    info "Idempotent CREATE DATABASE ${DBNAME} (if not exists)..."
    # create-dbs.sql only runs on empty volumes. This helper handles adding
    # a new DB to an existing cluster safely.
    ${COMPOSE_CMD} exec -T postgres psql -U postgres -c \
      "SELECT 1 FROM pg_database WHERE datname='${DBNAME}'" | grep -q 1 \
      && warn "Database '${DBNAME}' already exists — skipping CREATE." \
      || ${COMPOSE_CMD} exec -T postgres psql -U postgres -c "CREATE DATABASE ${DBNAME};"
    info "Re-running postgres-init for grants..."
    ${COMPOSE_CMD} up postgres-init
    success "Database ${DBNAME} ready."
    ;;

  *)
    error "Unknown command: ${CMD:-<none>}"
    echo "Usage:"
    echo "  $0 --first-boot"
    echo "  $0 --assign-admin <email>"
    echo "  $0 --with-new-db <dbname>"
    exit 1
    ;;
esac
