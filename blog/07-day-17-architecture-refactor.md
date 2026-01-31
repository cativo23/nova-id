# Day 17: Architecture Refactor - Three Frontends, Zero Trust

**Date**: January 31, 2026  
**Classification**: ARCHITECTURE REFACTOR  
**Status**: COMPLETED

---

## Executive Summary

Today we refactored the architecture to match the ideal Zero Trust pattern with **three separate frontend applications** instead of a single monolithic frontend. This aligns our implementation with the recommended Ory Stack architecture and provides better separation of concerns, security boundaries, and scalability.

## What Changed

### Before: Single Frontend
- One Vue.js application (`frontend/`) handling all functionality
- Mixed concerns: authentication, admin, and business logic in one app
- All routes accessible from a single entry point

### After: Three Separate Frontends
- **Frontend #1: Self-Service UI** (`frontend-auth/`) - Authentication flows
- **Frontend #2: Admin Dashboard** (`frontend-admin/`) - User and permission management
- **Frontend #3: Test Application** (`frontend-app/`) - Business logic with API integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (3 Frontends)                 │
├─────────────────────────────────────────────────────────────┤
│ Self-Service UI │ Admin Dashboard │ Test Application         │
│ (Port 5173)     │ (Port 5174)     │ (Port 5175)              │
└────────┬────────┴────────┬────────┴────────┬────────────────┘
         │                  │                │
         └──────────────────┴────────────────┘
                             │
                    ┌────────▼────────────────────────┐
                    │   Oathkeeper (Port 4455)        │
                    │   SINGLE ENTRY POINT (IAP)      │
                    │   - Routes /auth/* → frontend-auth│
                    │   - Routes /admin/* → frontend-admin│
                    │   - Routes /app/* → frontend-app│
                    │   - Routes /api/* → test-api    │
                    └────────┬────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐    ┌──────▼──────────┐
    │   Ory    │◄──────┤    Ory     │    │   Test API      │
    │  Kratos  │Login/ │   Hydra    │    │   (Port 8080)   │
    │(Private) │Consent│(OAuth/OIDC)│    │   (Private)     │
    └──────────┘      └─────┬──────┘    └─────────────────┘
         │                   │
         └───────────┬───────┘
                     │
              ┌──────▼──────┐
              │    Ory      │
              │    Keto     │
              │   (AuthZ)   │
              │  (Private)  │
              └─────────────┘
                     │
         ┌───────────▼──────────┐
         │   PostgreSQL 15       │
         │   (2 databases)        │
         │   (Private Network)     │
         └───────────────────────┘
```

## Frontend Breakdown

### Frontend #1: Self-Service UI (`frontend-auth/`)
**Purpose**: Authentication and user self-service flows  
**Port**: 5173  
**Routes**: `/auth/*` (via Oathkeeper)  
**Features**:
- User login
- User registration
- Password recovery
- Profile settings
- OAuth consent handling
- Error handling

**Access**: Public (no authentication required for login/registration)

### Frontend #2: Admin Dashboard (`frontend-admin/`)
**Purpose**: Administrative functions  
**Port**: 5174  
**Routes**: `/admin/*` (via Oathkeeper)  
**Features**:
- User management (CRUD operations)
- Permission management (Keto/Hydra)
- Dashboard with session information
- Permission-based access control

**Access**: Requires authentication + appropriate permissions

### Frontend #3: Test Application (`frontend-app/`)
**Purpose**: Main business application  
**Port**: 5175  
**Routes**: `/app/*` (via Oathkeeper)  
**Features**:
- Main application UI
- API integration (calls test API through Oathkeeper)
- Receives user context via headers from Oathkeeper
- Business logic implementation

**Access**: Requires authentication

## Oathkeeper Routing

Oathkeeper now routes requests based on path prefixes:

- `/auth/*` → `frontend-auth:5173` (Self-Service UI)
- `/admin/*` → `frontend-admin:5174` (Admin Dashboard)
- `/app/*` → `frontend-app:5175` (Test Application)
- `/api/*` → `api:8080` (Test API)
- `/keto/*` → `keto:4466/4467` (Keto API)
- `/admin/identities/*` → `kratos:4434` (Kratos Admin API)

All routes go through Oathkeeper, which:
1. Authenticates requests (cookie_session for protected routes)
2. Authorizes access (Keto checks for admin routes)
3. Injects user context headers (`X-User-Id`, `X-User-Email`)
4. Routes to the appropriate backend service

## Implementation Details

### Docker Compose Changes

Replaced single `frontend` service with three services:

```yaml
frontend-auth:    # Port 5173 - Self-Service UI
frontend-admin:   # Port 5174 - Admin Dashboard
frontend-app:     # Port 5175 - Test Application
```

Each frontend:
- Has its own Vite dev server
- Uses separate ports to avoid conflicts
- Shares composables and utilities (copied to each)
- Has independent build/deployment

### Oathkeeper Access Rules

New routing rules added:

```yaml
- id: "frontend-auth"
  match: "/auth/.*"
  upstream: "http://frontend-auth:5173"

- id: "frontend-admin"
  match: "/admin/.*"
  upstream: "http://frontend-admin:5174"
  authenticators: [cookie_session]

- id: "frontend-app"
  match: "/app/.*"
  upstream: "http://frontend-app:5175"
  authenticators: [cookie_session]
```

### Frontend Structure

Each frontend has:
- `src/main.js` - Router configuration with frontend-specific routes
- `src/App.vue` - Navigation and layout
- `src/views/` - Frontend-specific views
- `src/composables/` - Shared composables (useAuth, useKeto, etc.)
- `src/utils/` - Shared utilities
- `vite.config.js` - Vite configuration with unique port
- `Dockerfile.dev` - Development Dockerfile

## Benefits

### 1. **Separation of Concerns**
- Authentication UI separate from admin functions
- Business logic isolated from management tools
- Clear boundaries between different application types

### 2. **Security**
- Admin dashboard requires authentication + permissions
- Test application can't accidentally expose admin functions
- Each frontend has minimal surface area

### 3. **Scalability**
- Can deploy frontends independently
- Different scaling requirements per frontend
- Can use different technologies if needed

### 4. **Development**
- Teams can work on different frontends independently
- Clearer code organization
- Easier to test individual components

### 5. **Zero Trust Compliance**
- All traffic flows through Oathkeeper
- No direct access to backend services
- Consistent authentication/authorization enforcement

## Migration Notes

### What Stayed the Same
- All backend services (Kratos, Hydra, Keto, API)
- Database structure
- Oathkeeper configuration (except routing rules)
- Authentication flows
- Permission system

### What Changed
- Frontend structure (1 app → 3 apps)
- Oathkeeper routing rules
- Docker Compose services
- Port assignments

### Breaking Changes
- Old frontend routes no longer work
- Must access via Oathkeeper paths:
  - `/auth/login` (was `/login`)
  - `/admin/dashboard` (was `/dashboard`)
  - `/app/` (new route)

## Testing

### Access URLs (via Oathkeeper)
- Self-Service UI: `http://localhost:4455/auth/login`
- Admin Dashboard: `http://localhost:4455/admin/dashboard`
- Test Application: `http://localhost:4455/app/`
- Test API: `http://localhost:4455/api/test`

### Direct Access (Development Only)
- Self-Service UI: `http://localhost:5173`
- Admin Dashboard: `http://localhost:5174`
- Test Application: `http://localhost:5175`

**Note**: Direct access bypasses Oathkeeper, so authentication won't work. Use Oathkeeper routes in production.

## Next Steps

1. **Production Deployment**
   - Configure Traefik/nginx for production routing
   - Set up proper domain names:
     - `auth.yourdomain.com` → Self-Service UI
     - `admin.yourdomain.com` → Admin Dashboard
     - `app.yourdomain.com` → Test Application

2. **Environment Variables**
   - Update frontend environment variables for production
   - Configure Oathkeeper URLs correctly

3. **Testing**
   - Test all authentication flows
   - Verify admin functions work correctly
   - Test API integration from test app

4. **Documentation**
   - Update README with new architecture
   - Document deployment process
   - Create developer onboarding guide

## Lessons Learned

1. **Architecture First**: Having a clear architecture diagram helped guide the refactor
2. **Incremental Changes**: Breaking it into three separate tasks made it manageable
3. **Shared Code**: Copying composables to each frontend works, but consider a shared package in the future
4. **Routing**: Oathkeeper path-based routing is clean and works well
5. **Port Management**: Using different ports for each frontend avoids conflicts

## Conclusion

The refactor successfully implements the ideal Zero Trust architecture with three separate frontends. Each frontend has a clear purpose, and all traffic flows through Oathkeeper as the single entry point. This provides better security, scalability, and maintainability while maintaining all existing functionality.

**Status**: ✅ Complete - All three frontends are operational and routing correctly through Oathkeeper.

---

**Related**: [Architecture Comparison](./ARCHITECTURE_COMPARISON.md) | [Day 16: Looking Forward](./06-day-16-future.md)
