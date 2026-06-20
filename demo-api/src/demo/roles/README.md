# App Roles Module

This module manages application-level roles (`app_admin` and `app_user`) stored in SQLite. These roles are separate from Keto platform roles (`platform_user`, `platform_admin`, etc.).

## Roles

- **`app_admin`**: Can access admin-only endpoints and manage user roles
- **`app_user`**: Default role for all users; can access user-level endpoints

Both roles require `platform_user` (or higher) at the Keto level.

## Database

- **Location**: `data/app_roles.db` (SQLite)
- **Table**: `user_roles`
  - `userId` (PK): Kratos identity ID
  - `appRole`: `app_admin` | `app_user`
  - `createdAt`, `updatedAt`: Timestamps

## API Endpoints

### Get My Role
```
GET /api/roles/my-role
```
Returns the current user's platform role (from Keto) and app role (from SQLite).

### Bootstrap First App Admin
```
POST /api/roles/bootstrap/app-admin
Body: { "userId": "optional-user-id" }  // Defaults to current user
Requires: platform_admin (Keto role)
```
Sets a user as `app_admin`. Use this to create the first app admin.

### Get All Roles (App Admin Only)
```
GET /api/roles/all
Requires: app_admin
```

### Get User Role (App Admin Only)
```
GET /api/roles/user/:userId
Requires: app_admin
```

### Set/Update User Role (App Admin Only)
```
POST /api/roles/user/:userId
PUT /api/roles/user/:userId
Body: { "appRole": "app_admin" | "app_user" }
Requires: app_admin
```

### Delete User Role (App Admin Only)
```
DELETE /api/roles/user/:userId
Requires: app_admin
```

## Example Endpoints

- **`GET /api/app-admin-only`**: Requires `app_admin`
- **`POST /api/app-admin/configure`**: Requires `app_admin`
- **`GET /api/app-user-data`**: Requires `app_user` or `app_admin`
- **`POST /api/app-user-data`**: Requires `app_user` or `app_admin`

## OAuth Integration

`appRole` is **never** minted into a token and never set in any Oathkeeper header.
Per [ADR-0002](../../../../docs/decisions/0002-idp-does-not-mint-approle.md), the
IdP (Hydra consent session, Oathkeeper mutators) is Layer 2 and is intentionally
kept unaware of application-level roles.

`appRole` lives exclusively in the app's own database (SQLite, `data/app_roles.db`,
Layer 3).  Every endpoint that needs it queries SQLite at request time via
`RolesService.getAppRole()` — it is **never** read from a JWT claim or an
Oathkeeper-forwarded header.

## Initial Setup

1. Log in as a user with `platform_admin` role (from Keto)
2. Call `POST /api/roles/bootstrap/app-admin` to set yourself (or another user) as `app_admin`
3. That user can now manage other users' app roles via the `/api/roles/user/:userId` endpoints
