# Day 18: Full Ory Stack Integration - Zero Trust API

**Date**: February 1, 2026  
**Classification**: ZERO TRUST ORY STACK INTEGRATION  
**Status**: COMPLETED

---

## Executive Summary

Today we replaced the dummy Python API with a **production-ready NestJS API** that **actively consumes** Ory services (Kratos, Keto, Hydra) through **Oathkeeper only** (Zero Trust). The API is on an **external network** and **cannot directly access** Ory services, testing that Zero Trust actually works.

## What Changed

### Before: Dummy Python API
- Simple HTTP server
- Just returned headers from Oathkeeper
- No real Ory integration
- No permission checks
- No OAuth2 support

### After: NestJS API with Full Ory Integration
- **Kratos Integration**: Verifies users, retrieves identity, gets user info
- **Keto Integration**: Checks permissions, verifies rank membership
- **Hydra Integration**: Introspects OAuth2 tokens for third-party apps
- **Dual Authentication**: Session-based (web) and OAuth2 token-based (third-party)
- **Comprehensive Logging**: Tracks which frontend accessed which endpoint

## Architecture (Zero Trust)

```
┌─────────────────────────────────────────────────────────┐
│              External Network                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Frontend │  │ Frontend │  │   API    │             │
│  │   Auth   │  │  Admin   │  │ (NestJS) │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │              │              │                    │
│       └──────────────┴──────────────┘                    │
│                        │                                  │
│                        ▼                                  │
│              ┌──────────────────┐                       │
│              │   Oathkeeper     │                       │
│              │  (Both Networks) │                       │
│              └────────┬──────────┘                       │
└───────────────────────┼──────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Ory Stack Network (Private)                 │
│       ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│       │  Kratos  │  │   Keto   │  │  Hydra   │       │
│       │  (Admin) │  │  (Read)  │  │ (Public) │       │
│       └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────┘

API Flow (Zero Trust):
API → Oathkeeper → Kratos (verify user)
API → Oathkeeper → Keto (check permissions)  
API → Oathkeeper → Hydra (introspect token)

Key: API CANNOT directly reach Kratos, Keto, or Hydra
```

## Ory Service Integration (Zero Trust)

### Kratos Integration

**What the API Does:**
- Verifies user exists and is active via **Oathkeeper → Kratos**
- Retrieves full identity from Kratos Admin API via **Oathkeeper**
- Gets user traits (email, rank, etc.) via **Oathkeeper**
- **API cannot directly reach Kratos** (different network)

**Code:**
```typescript
// api/src/ory/kratos.service.ts
// API calls Oathkeeper, which forwards to Kratos
const response = await this.oathkeeperClient.get(`/admin/identities/${identityId}`);
```

**Oathkeeper Route:** `/admin/identities/*` → `http://kratos:4434`

**Why This Matters:**
- **Zero Trust**: API physically cannot reach Kratos directly
- **Network Isolation**: Ory Stack is on separate network
- **Security**: Even if API is compromised, cannot access Kratos

### Keto Integration

**What the API Does:**
- Checks rank membership via **Oathkeeper → Keto**
- Verifies rank hierarchy (has rank or higher) via **Oathkeeper**
- Real-time permission queries via **Oathkeeper**
- **API cannot directly reach Keto** (different network)

**Code:**
```typescript
// api/src/ory/keto.service.ts
// API calls Oathkeeper, which forwards to Keto
const response = await this.oathkeeperClient.get('/keto/read/relation-tuples/check', {
  params: { namespace, object, relation, subject_id }
});
```

**Oathkeeper Route:** `/keto/read/*` → `http://keto:4466` (strips `/keto/read`)

**Why This Matters:**
- **Zero Trust**: API physically cannot reach Keto directly
- **Network Isolation**: Ory Stack is on separate network
- **Dynamic Permissions**: Permissions can change without API restart

### Hydra Integration

**What the API Does:**
- Introspects OAuth2 access tokens via **Oathkeeper → Hydra**
- Validates token expiration via **Oathkeeper**
- Extracts user/client info from tokens via **Oathkeeper**
- Supports client credentials grant (API keys)
- **API cannot directly reach Hydra** (different network)

**Code:**
```typescript
// api/src/ory/hydra.service.ts
// API calls Oathkeeper, which forwards to Hydra
const response = await this.oathkeeperClient.post('/hydra-public/oauth2/introspect', ...);
```

**Oathkeeper Route:** `/hydra-public/*` → `http://hydra:4444` (strips `/hydra-public`)

**Why This Matters:**
- **Zero Trust**: API physically cannot reach Hydra directly
- **Network Isolation**: Ory Stack is on separate network
- **Third-Party Support**: Enables API keys and OAuth2 clients

## Authentication Methods

### 1. Session-Based (Web Frontends)

**Flow:**
1. User logs in → Kratos creates session
2. Frontend makes request → Oathkeeper validates session
3. Oathkeeper injects headers → API receives request
4. **API verifies user in Kratos via Oathkeeper** ✅ (Zero Trust)
5. **API checks permissions in Keto via Oathkeeper** ✅ (Zero Trust)
6. API responds

**Use Cases:**
- Web applications
- Browser-based access
- Cookie-based sessions

### 2. OAuth2 Token-Based (Third-Party Apps)

**Flow:**
1. Third-party app gets token → Hydra issues token
2. App makes request with Bearer token → Oathkeeper passes through
3. API receives request with Authorization header
4. **API introspects token in Hydra via Oathkeeper** ✅ (Zero Trust)
5. **API verifies user in Kratos via Oathkeeper** ✅ (Zero Trust)
6. **API checks permissions in Keto via Oathkeeper** ✅ (Zero Trust)
7. API responds

**Use Cases:**
- Mobile applications
- Third-party integrations
- API keys for services
- Microservices communication

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/public` - Public data

### Authenticated Endpoints
- `GET /api/protected` - Protected data (any logged-in user)
- `GET /api/me` - Get current user info (from Kratos)
- `POST /api/data` - Create data
- `PUT /api/data/:id` - Update data
- `DELETE /api/data/:id` - Delete data

### Rank-Based Endpoints (Keto Permission Checks)
- `GET /api/general` - Requires General rank or higher
- `GET /api/major` - Requires Major rank or higher
- `GET /api/colonel` - Requires Colonel rank or higher

### Logs Endpoints (Requires Major+)
- `GET /api/logs` - Get access logs
- `GET /api/logs/stats` - Get access statistics
- `GET /api/logs/frontend/:frontend` - Get logs by frontend
- `GET /api/logs/user/:userId` - Get logs by user

## Real-Life Testing Scenarios

### Scenario 1: Web Application
```
User → Frontend → Oathkeeper → API
                          ↓
                    Kratos (verify)
                    Keto (check permissions)
```

### Scenario 2: Mobile App
```
Mobile App → Hydra (OAuth2) → API
                        ↓
                  Hydra (introspect)
                  Kratos (verify user)
                  Keto (check permissions)
```

### Scenario 3: Third-Party Service
```
External Service → Hydra (client credentials) → API
                                      ↓
                            Hydra (introspect)
                            Keto (check client permissions)
```

### Scenario 4: Microservices
```
Service A → Hydra (get token) → Service B (API)
                              ↓
                        Hydra (introspect)
                        Kratos (verify)
                        Keto (check)
```

## Logging

All requests are logged with:
- Timestamp
- HTTP method and URL
- Response status and duration
- **Frontend source** (frontend-auth, frontend-admin, frontend-app, oauth2-client:xxx)
- **Auth method** (session, oauth2, oauth2-client)
- User information (ID, email, rank)
- Response size

Logs stored in:
- `api/logs/access.log` - JSON format, one entry per line
- `api/logs/combined.log` - All application logs
- `api/logs/error.log` - Error logs only

## OAuth2/API Key Setup

See `api/OAUTH2_SETUP.md` for detailed instructions on:
- Creating OAuth2 clients in Hydra
- Getting access tokens
- Using tokens in API requests
- Testing OAuth2 flows

## Key Benefits

1. **True Zero Trust**: API physically cannot reach Ory services directly
2. **Network Isolation**: Ory Stack on separate network
3. **Real Ory Integration**: Uses Ory services through Oathkeeper
4. **Security**: Verifies everything, trusts nothing
5. **Testability**: Tests that Zero Trust actually works
6. **Production-Ready**: Matches real-world network segmentation

## Implementation Details

### Services Created (All via Oathkeeper)
- `KratosService` - User verification via Oathkeeper → Kratos
- `KetoService` - Permission checks via Oathkeeper → Keto
- `HydraService` - Token introspection via Oathkeeper → Hydra

### Guards Updated
- `AuthenticatedGuard` - Verifies users via Oathkeeper → Kratos, supports OAuth2
- `RankGuard` - Checks permissions via Oathkeeper → Keto

### Network Configuration
- **External Network**: API, Frontends (cannot access Ory services)
- **Ory Stack Network**: Kratos, Hydra, Keto, Postgres (private)
- **Oathkeeper**: On both networks (gateway)

### Logging Enhanced
- Tracks auth method (session vs OAuth2)
- Tracks client ID for OAuth2 requests
- Tracks frontend source
- Logs Oathkeeper calls (proving Zero Trust)

## Testing

### Test Session-Based Auth
1. Log in via frontend-app
2. Visit `http://localhost:4455/app/`
3. Click test buttons
4. Check logs to see Kratos/Keto calls

### Test OAuth2 Auth
1. Create OAuth2 client in Hydra
2. Get access token
3. Call API with `Authorization: Bearer <token>`
4. Check logs to see Hydra/Kratos/Keto calls

## Next Steps

1. **Production Deployment**
   - Configure production Ory URLs
   - Set up proper token expiration
   - Implement token refresh

2. **Advanced Scenarios**
   - Test mobile app integration
   - Test third-party service integration
   - Test microservices communication

3. **Monitoring**
   - Set up Ory service health checks
   - Monitor API performance
   - Track Ory service call metrics

## Zero Trust Verification

To verify Zero Trust is working:

1. **Check Networks:**
   ```bash
   docker network inspect nova-id-external-network
   docker network inspect nova-id-ory-network
   ```

2. **Test Direct Access (Should Fail):**
   ```bash
   docker exec nova-id-api-1 ping kratos
   # Should fail - different networks
   ```

3. **Test Through Oathkeeper (Should Work):**
   ```bash
   docker exec nova-id-api-1 wget -O- http://oathkeeper:4455/health/alive
   # Should work - same network
   ```

## Conclusion

The API now provides a **complete Zero Trust testing environment** for the Ory Stack. Every request:
- Verifies users in Kratos **via Oathkeeper** (cannot reach directly)
- Checks permissions in Keto **via Oathkeeper** (cannot reach directly)
- Supports OAuth2 tokens via Hydra **via Oathkeeper** (cannot reach directly)
- Logs everything for analysis

**This proves Zero Trust works** - API is on external network and cannot directly access Ory services!

**Status**: ✅ Complete - Zero Trust Ory Stack integration operational

---

**Related**: [Zero Trust Architecture](../api/ZERO_TRUST.md) | [Ory Integration Guide](../api/INTEGRATION.md) | [OAuth2 Setup](../api/OAUTH2_SETUP.md)

---

**Related**: [Ory Integration Guide](../api/INTEGRATION.md) | [OAuth2 Setup](../api/OAUTH2_SETUP.md) | [Day 17: Architecture Refactor](./07-day-17-architecture-refactor.md)
