# Scripts

This directory contains utility scripts for managing the Nova ID stack.

## Setup Scripts

- **`seed-permissions.sh`** - Bootstraps Keto by writing `Platform:nova#admins` tuples for every
  Kratos identity whose `metadata_public.role == "platform_admin"`.
  Permissions are **computed in OPL** (no separate grant step); only membership tuples are seeded.
  Runs automatically via the `keto-seed` Compose service on every `docker compose up`.

- **`setup-hydra-test-client.sh`** - Creates a test OAuth client in Hydra for testing OAuth2/OIDC flows

- **`setup-local-domains.sh`** - Adds local domains to `/etc/hosts` (auth.ory.localhost, admin.ory.localhost, api.ory.localhost, app.ory.localhost). Run with `sudo`. Used by `start-local.sh` when using domain-based local setup. See [README-DOMAINS.md](../README-DOMAINS.md).

## Management Scripts

- **`assign-platform-admin-to-user.sh [email]`** - Assigns platform_admin role to a user by email (Kratos + Keto). Requires Kratos/Keto ports exposed or run from Docker network.

- **`create-user-via-api.sh [email] [name] [role] [password]`** - Creates a user via the admin API (through Oathkeeper). Requires a valid admin session/cookie. See [CREATE_USER_INSTRUCTIONS.md](../CREATE_USER_INSTRUCTIONS.md).

- **`clear-all-permissions.sh`** - Removes all relation tuples from Keto (for testing/resetting)
  - Clears OPL namespaces: `Platform`, `App`, `User`
  - Use before running `seed-permissions.sh` for a fresh start

## Testing Scripts

- **`test-stack-comprehensive.sh`** - Comprehensive stack test including permissions
  - Tests all services (Kratos, Hydra, Keto, Oathkeeper)
  - Verifies RBAC permissions are working correctly
  - Checks email functionality

- **`test-email-sending.sh`** - Test email sending (verification, recovery, etc.)
  - Tests registration verification emails
  - Tests password recovery emails
  - Requires Mailpit to be running

- **`test-email-with-real-user.sh`** - Test email sending with an existing user
  - Fetches a real user from Kratos
  - Sends a recovery email to that user
  - Verifies email was sent to Mailpit

## Utility Scripts

- **`generate-env.sh`** - Generates environment variables for `.env` file
  - Generates secure random secrets
  - Creates a template `.env` file

## Usage

All scripts should be run from the project root:

```bash
# Reseed platform admin memberships (fresh start)
./scripts/clear-all-permissions.sh
./scripts/seed-permissions.sh

# Test the stack
./scripts/test-stack-comprehensive.sh

# Test email sending
./scripts/test-email-with-real-user.sh
```

Make sure you have the required environment variables set in your `.env` file before running scripts.

## OPL Permission Model

Permissions are **computed by the Keto OPL policy** — no explicit grant tuples are needed:
- **Platform:nova#admins** → computed permits `administer` + `manage_users` (platform_admin)
- **App:\<id\>#admins** → computed permits `administer` + `access` (app admin)
- **App:\<id\>#members** → computed permit `access` (regular app user)

Use **`seed-permissions.sh`** to bootstrap the initial admin membership from `metadata_public.role`.
Use **`assign-platform-admin-to-user.sh`** to add platform_admin by email after bootstrap.
