# Nova ID API

NestJS API service with **full Ory Stack integration** via **Zero Trust architecture**.

> **Architecture**: See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for system design and Zero Trust.

## Features

- **Zero Trust Architecture**: API is on external network, can ONLY access Ory services through Oathkeeper
- **Ory Kratos Integration**: Verifies users via Oathkeeper → Kratos Admin API
- **Ory Keto Integration**: Checks permissions via Oathkeeper → Keto Read API
- **Ory Hydra Integration**: Introspects OAuth2 tokens via Oathkeeper → Hydra Public API
- **Dual Authentication**: Session-based (from Oathkeeper) and OAuth2 token-based
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
│              │  (Both Networks)  │                       │
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

API Flow:
API → Oathkeeper → Kratos (verify user)
API → Oathkeeper → Keto (check permissions)
API → Oathkeeper → Hydra (introspect token)
```

**Key Point**: API **cannot directly reach** Kratos, Keto, or Hydra. Must go through Oathkeeper.

## Authentication Methods

### 1. Session-Based (Web Frontends)
- User logs in via frontend → Kratos creates session
- Oathkeeper validates session and injects headers
- API receives `X-User-Id`, `X-User-Email`, `X-User-Role`
- **API verifies user exists in Kratos** (doesn't just trust headers)
- **API checks permissions in Keto** (doesn't just use role from header)

### 2. OAuth2 Token-Based (Third-Party Apps)
- Third-party app gets OAuth2 token from Hydra
- Sends request with `Authorization: Bearer <token>`
- API introspects token with Hydra
- API verifies user in Kratos
- API checks permissions in Keto

## Endpoints

### Public Endpoints (No Authentication)
- `GET /api/health` - Health check
- `GET /api/public` - Public data

### Authenticated Endpoints (Requires Login)
- `GET /api/protected` - Protected data (any logged-in user)
- `GET /api/me` - Get current user info (from Kratos)
- `POST /api/data` - Create data
- `PUT /api/data/:id` - Update data
- `DELETE /api/data/:id` - Delete data

### Role-Based Endpoints (Keto Permission Checks)
- `GET /api/admin-demo` - Requires platform_admin (RoleGuard)
- `GET /api/user-demo` - Requires authentication only

### Logs Endpoints (Requires platform_admin)
- `GET /api/logs` - Get access logs
- `GET /api/logs/stats` - Get access statistics
- `GET /api/logs/frontend/:frontend` - Get logs by frontend
- `GET /api/logs/user/:userId` - Get logs by user

## Ory Integration Details

### Kratos Integration
- **User verification**: Validated via Oathkeeper → Kratos; API receives `X-User-*` headers.
- **User info**: Identity and `traits.role` from Kratos (via Oathkeeper).

### Keto Integration
- **Permission checks**: Uses Keto to check role membership
- **Role guard**: Checks if user has required role (e.g. platform_admin)
- **Real-Time**: Always queries Keto (no caching of permissions)

### Hydra Integration
- **Token Introspection**: Validates OAuth2 access tokens
- **User Extraction**: Gets user ID from token subject or extensions
- **Client Info**: Can retrieve OAuth2 client information

## Usage Examples

### Session-Based (Web Frontend)
```bash
# Via Oathkeeper (session cookie)
curl -b cookies.txt http://localhost:4455/api/protected
```

### OAuth2 Token-Based (Third-Party App)
```bash
# With Bearer token
curl -H "Authorization: Bearer <access_token>" http://localhost:4455/api/protected
```

### Testing OAuth2 Flow
1. Register OAuth2 client in Hydra
2. Get access token via OAuth2 flow
3. Use token in API requests

## Logging

Access logs (timestamp, method, URL, user, duration) are written to `logs/access.log` and exposed via:

- `GET /api/logs` — recent entries (requires `platform_admin`)
- `GET /api/logs/stats` — counts by frontend, method, status
- `GET /api/logs/frontend/:frontend` — filter by frontend
- `GET /api/logs/user/:userId` — filter by user

## Environment

```env
PORT=8080
NODE_ENV=development
OATHKEEPER_URL=http://oathkeeper:4455
```

All Ory access goes through Oathkeeper (Zero Trust). API has no direct Kratos/Keto/Hydra URLs.

## Development

```bash
cd api
npm install
npm run start:dev
```

## Docker

```bash
docker compose up api
```

## Scenarios

1. **Web**: Frontend → Oathkeeper (session) → API  
2. **Mobile / third‑party**: App → Hydra (OAuth2) → Oathkeeper → API  
3. **Service-to-service**: Hydra client credentials → API  

See [docs/HYDRA_SETUP.md](../docs/HYDRA_SETUP.md) for OAuth2 setup.
