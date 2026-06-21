#!/usr/bin/env bash
# scripts/deploy-prod.sh
#
# Pull-mode production deploy for Nova ID on polaris2.
#
# Usage:
#   ./scripts/deploy-prod.sh <version-tag>
#   ./scripts/deploy-prod.sh v1.2.0
#
# Invoked by GitHub Actions via a restricted SSH command= in authorized_keys.
# The version tag arrives as $SSH_ORIGINAL_COMMAND, which this script reads and
# regex-validates itself. When called manually, $1 holds the version instead.
#
# authorized_keys line on polaris2 — use this SAFE form. Note there is NO
# ${SSH_ORIGINAL_COMMAND} appended to the command=: appending it would make
# sshd execute  deploy-prod.sh v1.0.0; rm -rf ~  if an attacker sent
# `ssh host 'v1.0.0; rm -rf ~'`, BEFORE the script's regex could reject it.
# The script reads $SSH_ORIGINAL_COMMAND from the environment, so the safe
# form passes nothing on the command line:
#
#   command="/home/<user>/deploy/nova-id-deploy/scripts/deploy-prod.sh",no-port-forwarding,no-agent-forwarding,no-pty,no-X11-forwarding ssh-ed25519 AAAA...
#
# What this script does:
#   1. Guards: asserts location, .env.production, JWKS exist.
#   2. Acquires flock to prevent overlapping deploys.
#   3. Records the currently-deployed version as PREVIOUS (for rollback).
#   4. Exports IMAGE_TAG so docker-compose.production.yml image: refs resolve.
#   5. Pulls the 5 app images by immutable version tag (no :latest on deploy).
#   6. Updates repo checkout (git fetch --tags + git reset --hard <tag>) so
#      Oathkeeper rules, Kratos YAML, and other config files stay in sync.
#   7. Runs `docker compose up -d` (no build).
#   8. Unconditionally restarts Oathkeeper (it does not hot-reload rules).
#   9. Runs smoke tests with retry/backoff.
#  10. On smoke failure: auto-rollback to PREVIOUS, re-smoke, report.
#
# NEVER run in this script:
#   - docker build (image pull only)
#   - scripts/generate-jwks.sh (key rotation is manual + planned)
#   - config/init-sql/create-dbs.sql / create-users.sh (bootstrap only)
#   - scripts/assign-platform-admin-to-user.sh (bootstrap only)

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────

DEPLOY_DIR="/home/cativo23/deploy/nova-id-deploy"
COMPOSE_CMD="docker compose --env-file .env.production -f docker-compose.production.yml"
# Lock lives under the deploy dir (persistent, never tmpreaped). The file is
# created once and NEVER deleted — flock releases the lock when the fd closes,
# and unlinking a held lock inode would let a concurrent deploy break mutual
# exclusion.
LOCK_FILE="${DEPLOY_DIR}/.deploy.lock"
IMAGE_PREFIX="cativo23/nova-id"
IMAGES=(api demo-api frontend-auth frontend-admin frontend-app)

# Smoke test targets. All must succeed for the deploy to be considered healthy.
SMOKE_ALIVE_URL="https://id.cativo.dev/health/alive"
SMOKE_OIDC_URL="https://id.cativo.dev/.well-known/openid-configuration"
SMOKE_BFF_URL="https://id.cativo.dev/api/health"
SMOKE_DEMO_URL="https://app.cativo.dev/api-test/health"

SMOKE_RETRIES=6
SMOKE_SLEEP=10  # seconds between retries — 6×10=60s max wait

# ── Colour helpers ───────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[deploy]${NC} $*"; }
success() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()    { echo -e "${YELLOW}[deploy]${NC} $*"; }
error()   { echo -e "${RED}[deploy]${NC} $*" >&2; }

# ── Arg check ────────────────────────────────────────────────────────────────
# Accept version from:
#   (a) $1 — direct invocation or from authorized_keys command= wrapper
#       (authorized_keys expands ${SSH_ORIGINAL_COMMAND} and passes it as $1)
#   (b) $SSH_ORIGINAL_COMMAND — fallback when invoked as the command= target
#       itself (i.e., sshd sets $SSH_ORIGINAL_COMMAND and calls this script
#       directly without a $1).

VERSION="${1:-${SSH_ORIGINAL_COMMAND:-}}"

if [[ -z "${VERSION}" ]]; then
  error "Usage: $0 <version-tag>  (e.g. v1.2.0)"
  error "Also invokable via restricted SSH: ssh polaris2 v1.2.0"
  exit 1
fi

# Basic sanity: version must look like a semver tag (v1.2.3 or v1.2.3-rc1).
# Reject empty strings, shell commands, path traversal, etc.
if [[ ! "${VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([-+][A-Za-z0-9._-]+)?$ ]]; then
  error "Invalid version tag: '${VERSION}'"
  error "Expected format: v<major>.<minor>.<patch>[-prerelease]  (e.g. v1.2.0)"
  exit 1
fi

# ── Guard: must run from the deploy directory ────────────────────────────────

if [[ "$(pwd)" != "${DEPLOY_DIR}" ]]; then
  cd "${DEPLOY_DIR}" || { error "Cannot cd to ${DEPLOY_DIR}"; exit 1; }
fi

# ── Guard: .env.production must exist and be chmod 600 ──────────────────────

if [[ ! -f ".env.production" ]]; then
  error ".env.production not found in ${DEPLOY_DIR}. Aborting."
  error "This is a configuration problem — do NOT generate secrets automatically."
  exit 1
fi
ENV_PERMS=$(stat -c "%a" .env.production)
if [[ "${ENV_PERMS}" != "600" ]]; then
  error ".env.production permissions are ${ENV_PERMS}, expected 600. Aborting."
  error "Run: chmod 600 ${DEPLOY_DIR}/.env.production"
  exit 1
fi

# ── Guard: JWKS must exist — NEVER auto-generate ────────────────────────────

if [[ ! -f "config/oathkeeper/id_token.jwks.json" ]]; then
  error "config/oathkeeper/id_token.jwks.json NOT FOUND. Aborting."
  error "JWKS is immutable in production (regenerating rotates the signing key"
  error "and invalidates all active sessions). Contact Carlos to restore it."
  exit 1
fi

# ── flock: prevent overlapping deploys ──────────────────────────────────────

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  error "Another deploy is already running (lock: ${LOCK_FILE}). Aborting."
  exit 1
fi
# Release on exit by closing the fd. Do NOT rm the lock file — unlinking a held
# lock inode would let a third deploy acquire a fresh inode and run concurrently.
trap 'flock -u 9' EXIT

# ── Smoke function (reusable for both deploy and rollback) ───────────────────

smoke_test() {
  local label="${1}"
  local attempt=0
  local urls=("${SMOKE_ALIVE_URL}" "${SMOKE_OIDC_URL}" "${SMOKE_BFF_URL}" "${SMOKE_DEMO_URL}")

  info "Smoke tests for ${label} (up to $((SMOKE_RETRIES * SMOKE_SLEEP))s)..."

  while [[ ${attempt} -lt ${SMOKE_RETRIES} ]]; do
    local all_ok=true
    for url in "${urls[@]}"; do
      if ! curl -fsS --max-time 10 "${url}" >/dev/null 2>&1; then
        warn "Attempt $((attempt+1))/${SMOKE_RETRIES}: ${url} not ready"
        all_ok=false
        break
      fi
    done
    if ${all_ok}; then
      success "Smoke tests PASSED for ${label}"
      return 0
    fi
    attempt=$((attempt + 1))
    [[ ${attempt} -lt ${SMOKE_RETRIES} ]] && sleep "${SMOKE_SLEEP}"
  done

  error "Smoke tests FAILED for ${label} after $((SMOKE_RETRIES * SMOKE_SLEEP))s"
  return 1
}

# ── Record current version for rollback ─────────────────────────────────────

# Read the IMAGE_TAG that is currently running (set by the last deploy).
# If this is the very first deploy, PREVIOUS will be empty — rollback skipped.
PREVIOUS=""
if [[ -f ".deploy-version" ]]; then
  PREVIOUS=$(cat .deploy-version)
  info "Currently deployed version: ${PREVIOUS}"
else
  warn "No .deploy-version file found — this may be the first deploy. Rollback not available."
fi

info "Deploying version: ${VERSION}"

# ── Pull images by immutable version tag (no :latest) ───────────────────────

info "Pulling images tagged ${VERSION}..."
for img in "${IMAGES[@]}"; do
  docker pull "${IMAGE_PREFIX}-${img}:${VERSION}"
done
success "All 5 images pulled."

# ── Update git checkout so compose file picks up any config changes ──────────
# (Config files: oathkeeper rules, kratos YAML, etc. live in the repo checkout.)

info "Updating repo checkout to ${VERSION}..."
# --force ensures the local tag is overwritten if it ever drifted from origin,
# so the checkout matches the exact commit the released image was built from.
git fetch --tags --force --prune origin
# Force-sync to the tag (polaris2 is a git clone; deploys discard any local drift).
# Use the fully-qualified refs/tags/ ref so a same-named branch can never win.
# Detached HEAD at the tag is intentional — deploy dirs are not development envs.
git reset --hard "refs/tags/${VERSION}"
success "Repo at ${VERSION}."

# ── Up the stack (image-pull mode, no build) ─────────────────────────────────

export IMAGE_TAG="${VERSION}"
info "Running docker compose up -d for version ${VERSION}..."
${COMPOSE_CMD} up -d --no-build --remove-orphans

# ── Unconditionally restart Oathkeeper (does not hot-reload rules) ───────────

info "Restarting Oathkeeper (rule hot-reload is not supported)..."
${COMPOSE_CMD} restart oathkeeper
success "Oathkeeper restarted."

# ── Smoke tests ──────────────────────────────────────────────────────────────

if smoke_test "${VERSION}"; then
  # Record the successfully deployed version
  echo "${VERSION}" > .deploy-version
  success "Deploy of ${VERSION} completed successfully."
  exit 0
fi

# ── Auto-rollback ────────────────────────────────────────────────────────────

error "Smoke tests failed for ${VERSION}. Initiating auto-rollback..."

if [[ -z "${PREVIOUS}" ]]; then
  error "No previous version recorded — cannot auto-rollback."
  error "Manual intervention required. Stack may be in a broken state."
  exit 1
fi

warn "Rolling back to ${PREVIOUS}..."

# Pull previous images (they may still be cached, but pull to be sure)
for img in "${IMAGES[@]}"; do
  docker pull "${IMAGE_PREFIX}-${img}:${PREVIOUS}" || true
done

git reset --hard "refs/tags/${PREVIOUS}"
export IMAGE_TAG="${PREVIOUS}"
${COMPOSE_CMD} up -d --no-build --remove-orphans
${COMPOSE_CMD} restart oathkeeper

if smoke_test "${PREVIOUS} (rollback)"; then
  warn "Auto-rollback to ${PREVIOUS} succeeded."
  warn "Deploy of ${VERSION} FAILED. Stack is running ${PREVIOUS}."
  exit 2  # Exit 2 = rollback succeeded; caller knows deploy failed
else
  error "Auto-rollback to ${PREVIOUS} also failed smoke tests."
  error "STACK IS IN UNKNOWN STATE. Manual intervention required."
  exit 3
fi
