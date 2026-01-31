# Nova ID Architecture

This document describes the system design, the Ory Stack components, and the Zero Trust security model.

---

## System overview

```mermaid
flowchart TB
    subgraph Clients
        Browser[Browser / Apps]
    end

    subgraph Gateway
        OK[Oathkeeper :4455]
    end

    subgraph "Ory Stack"
        Kratos[Kratos Identity]
        Keto[Keto Permissions]
        Hydra[Hydra OAuth2]
    end

    subgraph "Application"
        API[NestJS API :8080]
        FE_Auth[Auth UI :5173]
        FE_Admin[Admin :5174]
        FE_App[Test App :5175]
    end

    Browser --> OK
    FE_Auth --> OK
    FE_Admin --> OK
    FE_App --> OK
    OK --> Kratos
    OK --> Keto
    OK --> Hydra
    OK --> API
```

All external traffic goes through **Oathkeeper**. Kratos, Keto, Hydra, and the API are not exposed directly to clients in the default Zero Trust setup.

---

## The Ory Stack

Nova ID uses four Ory components:

| Component   | Role            | Ports (admin) | Purpose                                        |
|------------|------------------|---------------|------------------------------------------------|
| **Kratos** | Identity         | 4433 / 4434   | Users, registration, login, sessions, passwords |
| **Keto**   | Authorization    | 4466 / 4467   | RBAC, permissions, role membership              |
| **Hydra**  | OAuth2 / OIDC    | 4444 / 4445   | Tokens for mobile, third‑party, APIs            |
| **Oathkeeper** | API gateway | 4455 / 4456   | Auth, authz, routing, header injection          |

### Kratos — Identity

- Registration, login, logout
- Password reset, email verification
- Session management
- Identity traits (e.g. `email`, `full_name`, `role`)

User data is stored in PostgreSQL. Sessions are validated via cookies; Oathkeeper uses Kratos to validate them before forwarding requests.

### Keto — Permissions

- Role-based access (RBAC)
- Relation tuples: e.g. `ranks:platform_admin#member@user:&lt;id&gt;`
- Permissions granted to roles; users are assigned to roles
- Real-time checks; no permission caching

See [Auth & RBAC](AUTH_AND_RBAC.md#keto-namespaces) for namespaces and examples.

### Hydra — OAuth2 / OIDC

- OAuth2 flows (authorization code, client credentials, etc.)
- OpenID Connect
- Token issuance and introspection

Used for mobile apps, SPAs, and third‑party integrations. Web session-based flows typically use Kratos + Oathkeeper only.

### Oathkeeper — Gateway

- **Authenticate**: validate session (Kratos) or Bearer token (Hydra)
- **Authorize**: optional Keto checks (e.g. `/admin/**` → `view_users`)
- **Mutate**: inject `X-User-ID`, `X-User-Email`, `X-User-Role` (from Kratos traits)
- **Route**: forward to API or frontends

Access rules live in `config/oathkeeper/access-rules.yml`.

---

## Zero Trust model

**Principle:** *Never trust, always verify.*

- Internal services (Kratos, Keto, Hydra, API) are not exposed to the internet.
- All access is through Oathkeeper. It authenticates and authorizes every request.
- The API does not call Kratos/Keto/Hydra directly; it trusts Oathkeeper-injected headers (or validated JWTs) and optional Keto checks done at the gateway.

```mermaid
flowchart LR
    subgraph External
        Client[Client]
    end
    subgraph DMZ
        OK[Oathkeeper]
    end
    subgraph Internal
        K[Kratos]
        Keto[Keto]
        H[Hydra]
        API[API]
    end
    Client -->|1. Request| OK
    OK -->|2. Auth| K
    OK -->|3. Authz| Keto
    OK -->|4. Forward + headers| API
```

### Implications

1. **Session-based (web):** Browser → Oathkeeper → Kratos validates session → Oathkeeper injects `X-User-*` → API.
2. **Token-based (mobile/API):** Client → Oathkeeper with Bearer token → Hydra introspects → Oathkeeper forwards → API.
3. **Admin routes:** `/admin/**` requires `view_users`; Oathkeeper checks Keto before allowing access.

---

## Request flows

### Web login and API call (session)

```mermaid
sequenceDiagram
    participant B as Browser
    participant O as Oathkeeper
    participant K as Kratos
    participant A as API

    B->>O: GET /auth/login (redirect)
    O->>K: Login UI
    K->>B: Login form
    B->>K: Submit credentials
    K->>B: Set session cookie, redirect

    B->>O: GET /api/protected (cookie)
    O->>K: Validate session
    K->>O: Identity + traits.role
    O->>O: Inject X-User-ID, X-User-Email, X-User-Role
    O->>A: GET /protected + headers
    A->>B: JSON response
```

### Protected API with role

1. Request hits Oathkeeper (e.g. `/api/admin-demo`).
2. Oathkeeper validates session with Kratos.
3. For `/admin/**`, Oathkeeper checks Keto (e.g. `view_users`).
4. Oathkeeper injects `X-User-ID`, `X-User-Email`, `X-User-Role` and forwards to API.
5. API uses `RoleGuard` to enforce `platform_admin` when required.

### Public API

Routes like `/api/health` and `/api/public` match a public rule: no authentication, optional `noop` mutator, then forward to API.

---

## Data flow summary

```mermaid
flowchart TD
    A[Client request] --> B{Public?}
    B -->|Yes| C[Forward to API]
    B -->|No| D[Authenticate]
    D --> E{Valid?}
    E -->|No| F[401 Unauthorized]
    E -->|Yes| G{Admin route?}
    G -->|Yes| H[Keto: view_users?]
    H -->|No| F
    H -->|Yes| I[Inject headers]
    G -->|No| I
    I --> C
    C --> J[API response]
```

---

## Component diagram

```mermaid
flowchart TB
    subgraph Frontends
        F1[Auth UI]
        F2[Admin]
        F3[Test App]
    end

    subgraph Gateway
        OK[Oathkeeper]
    end

    subgraph Ory
        K[Kratos]
        Keto[Keto]
        Hydra[Hydra]
    end

    subgraph Backend
        API[API]
    end

    subgraph Data
        PG[(PostgreSQL)]
    end

    F1 & F2 & F3 --> OK
    OK --> K & Keto & Hydra & API
    K & Hydra --> PG
```

---

## Next steps

- [Auth & RBAC](AUTH_AND_RBAC.md) — Authentication, roles, and Keto namespaces  
- [Operations](OPERATIONS.md) — Running, testing, and troubleshooting  
- [API README](../api/README.md) — API endpoints and integration
