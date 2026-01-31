# App Roles Setup Guide

## Overview

The API now supports **application-level roles** (`app_admin` and `app_user`) stored in SQLite, separate from Keto platform roles. All users must have `platform_user` (or higher) at the Keto level to use the app.

## Installation

Install required dependencies:

```bash
cd api
npm install --save @nestjs/typeorm typeorm sqlite3
```

## Database

- **Location**: `api/data/app_roles.db` (SQLite)
- **Auto-created**: TypeORM will create the database and table on first run
- **Table**: `user_roles`
  - `userId` (PK): Kratos identity ID
  - `appRole`: `app_admin` | `app_user` (default: `app_user`)

## Initial Setup

1. **Start the API** (TypeORM will create the database automatically)

2. **Bootstrap the first app_admin**:
   - Log in as a user with `platform_admin` role (from Keto)
   - Call: `POST /api/roles/bootstrap/app-admin`
   - Body: `{ "userId": "optional-user-id" }` (defaults to current user)
   - This sets the user as `app_admin`

3. **Manage roles** (as `app_admin`):
   - `GET /api/roles/all` - List all user roles
   - `POST /api/roles/user/:userId` - Set user role
   - `PUT /api/roles/user/:userId` - Update user role
   - `DELETE /api/roles/user/:userId` - Delete user role (defaults to `app_user`)

## API Endpoints

### Public/All Users
- `GET /api/roles/my-role` - Get your platform role and app role

### App Admin Only
- `GET /api/app-admin-only` - Admin-only endpoint
- `POST /api/app-admin/configure` - Admin configuration endpoint
- `GET /api/roles/all` - List all roles
- `GET /api/roles/user/:userId` - Get user role
- `POST /api/roles/user/:userId` - Set user role
- `PUT /api/roles/user/:userId` - Update user role
- `DELETE /api/roles/user/:userId` - Delete user role

### App User or App Admin
- `GET /api/app-user-data` - User data endpoint
- `POST /api/app-user-data` - Create user data

## OAuth Integration

When users log in via OAuth2 ("Login with Nova ID"):
1. The API reads `app_role` from SQLite
2. Includes it in Hydra consent session: `session.access_token.appRole`
3. Hydra returns it in token introspection under `ext.appRole`
4. Oathkeeper mutator reads `.Extra.ext.appRole` and sets `X-User-App-Role` header
5. The API uses this header (no DB query needed for OAuth requests)

## Example Usage

### Set a user as app_admin (requires platform_admin)
```bash
curl -X POST http://localhost:4455/api/roles/bootstrap/app-admin \
  -H "Cookie: ory_kratos_session=..." \
  -H "Content-Type: application/json" \
  -d '{"userId": "a48e1f12-6fb8-46e4-a234-e50329bc2f56"}'
```

### Get my role
```bash
curl http://localhost:4455/api/roles/my-role \
  -H "Authorization: Bearer <token>" \
  # or with cookie
  -H "Cookie: ory_kratos_session=..."
```

### Access app_admin endpoint
```bash
curl http://localhost:4455/api/app-admin-only \
  -H "Authorization: Bearer <token>"
```

## Notes

- **Default role**: Users without an explicit role default to `app_user`
- **Platform role required**: All users must have `platform_user` (or higher) from Keto
- **OAuth optimization**: When using OAuth tokens, `app_role` comes from the token (no DB query)
- **Session-based requests**: When using session cookies, the API queries SQLite for `app_role`
