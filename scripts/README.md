# Scripts

This directory contains utility scripts for managing the Nova ID stack.

## Setup Scripts

- **`setup-all-permissions.sh`** - Sets up RBAC with platform_admin / platform_user
  - Grants permissions to platform_admin only; platform_user has no admin permissions
  - Assigns existing users to roles from Kratos traits.role
  - Run after initial setup or when resetting permissions

- **`setup-hydra-test-client.sh`** - Creates a test OAuth client in Hydra for testing OAuth2/OIDC flows

- **`setup-local-domains.sh`** - Adds local domains to `/etc/hosts` (auth.ory.localhost, admin.ory.localhost, api.ory.localhost, app.ory.localhost). Run with `sudo`. Used by `start-local.sh` when using domain-based local setup. See [README-DOMAINS.md](../README-DOMAINS.md).

## Management Scripts

- **`assign-platform-admin-to-user.sh [email]`** - Assigns platform_admin role to a user by email (Kratos + Keto). Requires Kratos/Keto ports exposed or run from Docker network.

- **`create-user-via-api.sh [email] [name] [role] [password]`** - Creates a user via the admin API (through Oathkeeper). Requires a valid admin session/cookie. See [CREATE_USER_INSTRUCTIONS.md](../CREATE_USER_INSTRUCTIONS.md).

- **`clear-all-permissions.sh`** - Removes all permissions from Keto (for testing/resetting)
  - Clears all relation tuples from all namespaces
  - Use before running `setup-all-permissions.sh` for a fresh start

## Testing Scripts

- **`test-stack-comprehensive.sh`** - Comprehensive stack test including permissions
  - Tests all services (Kratos, Hydra, Keto, Oathkeeper)
  - Verifies RBAC permissions are working correctly
  - Checks email functionality

- **`test-email-sending.sh`** - Test email sending (verification, recovery, etc.)
  - Tests registration verification emails
  - Tests password recovery emails
  - Requires MailHog to be running

- **`test-email-with-real-user.sh`** - Test email sending with an existing user
  - Fetches a real user from Kratos
  - Sends a recovery email to that user
  - Verifies email was sent to MailHog

## Utility Scripts

- **`generate-env.sh`** - Generates environment variables for `.env` file
  - Generates secure random secrets
  - Creates a template `.env` file

## Usage

All scripts should be run from the project root:

```bash
# Set up RBAC permissions (fresh start)
./scripts/clear-all-permissions.sh
./scripts/setup-all-permissions.sh

# Test the stack
./scripts/test-stack-comprehensive.sh

# Test email sending
./scripts/test-email-with-real-user.sh
```

Make sure you have the required environment variables set in your `.env` file before running scripts.

## RBAC Permissions

- **platform_admin**: Admin dashboard, user management, all admin permissions
- **platform_user**: App access only (default for new users)

Permissions are granted to roles; users are assigned via Keto. Use **`assign-platform-admin-to-user.sh`** to grant platform_admin to a user by email.
