# Architecture: Zero Trust Implementation

**Date**: Day 16 (Post-Implementation Review)  
**Classification**: UNCLASSIFIED  
**Status**: ARCHITECTURAL ANALYSIS

---

## Executive Summary

This document describes the Nova ID Zero Trust architecture implementation using the Ory Stack. **Our implementation follows true Zero Trust principles** - all services are accessed through Oathkeeper, with no direct access to backend services.

**Architecture Overview**:
- ✅ 3 separate frontends (Self-Service UI, Admin Dashboard, Test Application)
- ✅ Single entry point (Oathkeeper only)
- ✅ All services private
- ✅ Everything routes through gateway
- ✅ Network segmentation
- ✅ Defense in depth
- ✅ 2 databases (Ory + Application)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (3 Apps)                   │
├─────────────────────────────────────────────────────────────┤
│ Self-Service UI │ Admin Dashboard │ Test Application        │
│ (Auth flows)    │ (User/Perm mgmt)│ (Business logic)        │
└────────┬────────┴────────┬────────┴────────┬────────────────┘
         │                  │                │
         └──────────────────┴────────────────┘
                             │
                    ┌────────▼────────────────────────┐
                    │   Oathkeeper (Port 4455)        │
                    │   SINGLE ENTRY POINT (IAP)      │
                    │   - Authenticates all requests  │
                    │   - Routes to backend services  │
                    │   - Applies access rules        │
                    │   - Validates OAuth tokens      │
                    └────────┬────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐    ┌──────▼──────────┐
    │   Ory    │◄──────┤    Ory     │    │   Test API      │
    │  Kratos  │Login/ │   Hydra    │    │   (Private)     │
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

**Key Points** (Zero Trust):
- **Three Separate Frontends** (Self-Service UI, Admin Dashboard, Test Application)
- **Everything routes through Oathkeeper** (Zero Trust IAP pattern) ✅
- **No direct service access** from any frontend ✅
- **All services are private** (Docker internal network) ✅
- **Only Oathkeeper is exposed** (single entry point) ✅
- **Hydra included** for OAuth2/OIDC (mobile/API/third-party) ✅
- Oathkeeper injects `X-User-Id` and `X-User-Email` headers
- Backend services trust headers from Oathkeeper
- **Network segmentation**: Public-facing = Oathkeeper only, Private = All backend services
- **Multiple auth flows supported**: Sessions (web) + OAuth tokens (mobile/API)

## Component Count

### Frontends (3 Vue.js Applications)

- **Self-Service UI** - Authentication flows (login, register, password recovery)
- **Admin Dashboard** - User and permission management
- **Test Application** - Main business application

### Gateway Layer (1)

- **Ory Oathkeeper** - Single public-facing entry point, enforces all security

### Backend Services (4)

- **Ory Kratos** - Identity and user management
- **Ory Hydra** - OAuth 2.0 and OpenID Connect
- **Ory Keto** - Authorization and permissions
- **Test API** - Business logic (Node.js, Go, Python, etc.)

### Data Layer (2 databases)

- **PostgreSQL for Ory** - Stores Kratos, Hydra, and Keto data
- **Application Database** - Business data (can be any database)

### Additional Services (Development)

- **Mailpit** - SMTP testing server

## Key Architectural Points

### 1. Single Entry Point

**Only Oathkeeper is publicly accessible** - Everything else runs on a private network.

- All frontend requests go through Oathkeeper
- No direct access to Kratos, Hydra, Keto, or Test API from frontend
- Oathkeeper validates all requests before forwarding

### 2. Zero Trust Enforcement

**Every request is authenticated and authorized** at the gateway level.

- Oathkeeper validates sessions with Kratos (for web apps)
- Oathkeeper validates OAuth tokens with Hydra (for mobile/API clients)
- Oathkeeper checks permissions with Keto (for authorization)
- Backend services trust headers injected by Oathkeeper

### 3. Network Segmentation

**Public-facing**: Oathkeeper only  
**Private network**: All backend services (Kratos, Hydra, Keto, Test API, Databases)

### 4. Flexible Client Support

**Sessions for web, OAuth tokens for mobile/APIs**

- Web apps use Kratos session cookies
- Mobile apps and third-party clients use Hydra OAuth tokens
- Service-to-service uses Hydra client credentials grant

## Access Patterns

### Self-Service UI Access

```
Self-Service UI → Oathkeeper → Kratos
```

- Login, registration, password recovery flows
- All authentication requests route through Oathkeeper
- Kratos validates credentials and creates sessions
- Sessions managed via cookies

### Admin Dashboard Access

```
Admin Dashboard → Oathkeeper → Kratos (user management)
Admin Dashboard → Oathkeeper → Keto (permission management)
```

- User management operations go through Oathkeeper to Kratos
- Permission management operations go through Oathkeeper to Keto
- All requests authenticated and authorized at gateway

### Test Application Access

```
Test Application → Oathkeeper → Test API
```

- Business logic API calls route through Oathkeeper
- Oathkeeper validates session/token
- Oathkeeper checks permissions with Keto
- Test API receives `X-User-Id` and `X-User-Email` headers

## Authentication Flows

### Flow 1: Web App (Session-Based)

```
User → Self-Service UI → Oathkeeper → Kratos
                                    ↓
                              Session Cookie
                                    ↓
User → Test Application → Oathkeeper (validates session) → Test API
```

**Status**: ✅ Active - Web apps use Kratos sessions

### Flow 2: Mobile App / Third-Party (Token-Based)

```
Client → Oathkeeper → Hydra (OAuth flow)
                        ↓
              Redirect to Login UI
                        ↓
        Oathkeeper → Kratos (authenticate)
                        ↓
              Back to Hydra (consent)
                        ↓
            Access Token + Refresh Token
                        ↓
Client → Oathkeeper (Bearer token) → Test API
```

**Status**: ✅ Configured - Ready for mobile apps or third-party integrations

### Flow 3: Service-to-Service (Client Credentials)

```
Service A → Oathkeeper → Hydra (client_credentials grant)
                            ↓
                      Access Token
                            ↓
Service A → Oathkeeper (Bearer token) → Service B
```

**Status**: ✅ Configured - Ready for microservices or API-to-API authentication

## Use Case Decision Matrix

| Scenario | Use Kratos Session | Use Hydra OAuth | Support |
|----------|-------------------|-----------------|---------|
| Web app login | ✅ Yes | Optional | ✅ Active (Kratos) |
| Mobile app | ❌ No | ✅ Yes | ✅ Ready (Hydra) |
| Third-party API access | ❌ No | ✅ Yes | ✅ Ready (Hydra) |
| Microservices auth | ❌ No | ✅ Yes (client credentials) | ✅ Ready (Hydra) |
| SSO across multiple apps | Optional | ✅ Yes | ✅ Ready (Hydra) |
| Simple admin dashboard | ✅ Yes | Optional | ✅ Active (Kratos) |

**Implementation**: Supports both! Web apps use Kratos sessions, mobile/API clients use Hydra OAuth.

## Security Features

### Zero Trust Principles

1. **Single Entry Point**: Only Oathkeeper exposed publicly ✅
2. **All Services Private**: Kratos, Hydra, Keto, and backend APIs on private network ✅
3. **Everything Through Gateway**: All requests (auth, admin, API) go through Oathkeeper ✅
4. **Network Segmentation**: Public-facing = Oathkeeper only, Private = All backend services ✅
5. **Defense in Depth**: Multiple security layers (gateway auth, header injection, private network) ✅

### Security Benefits

- ✅ **Centralized Authentication**: All auth checks happen at gateway
- ✅ **Audit Trail**: All requests logged at single point
- ✅ **Consistent Security**: Same rules apply to all services
- ✅ **Header Injection**: Backend services receive identity via headers
- ✅ **No Direct Access**: Frontends cannot access backend services directly
- ✅ **Defense in Depth**: Even if one component is compromised, lateral movement is restricted

## Why Include Hydra?

Even though web apps use Kratos sessions, including Hydra provides:

- ✅ **Scalability**: Ready for mobile apps, third-party integrations, API access
- ✅ **Future-Proof**: Easier to add OAuth clients later than retrofit
- ✅ **Complete Stack**: Full Ory Stack implementation
- ✅ **Production Ready**: Enterprise-grade identity provider capabilities
- ✅ **Minimal Overhead**: Configured and ready, but not actively used (no performance impact)

**Decision**: For a production system that might grow, including Hydra is recommended even if not immediately needed—it's easier to add clients later than to retrofit OAuth into an existing system.

## Implementation Status

✅ **Correct Zero Trust Architecture**
- **Component Count**: 3 frontends, 1 gateway, 4 backend services ✅
- **Frontends**: Self-Service UI, Admin Dashboard, Test Application ✅
- Single entry point (Oathkeeper) ✅
- All services private (Kratos, Hydra, Keto, API) ✅
- Everything routes through gateway ✅
- Network segmentation implemented ✅
- Defense in depth applied ✅
- **Full Ory Stack**: Kratos + Hydra + Keto + Oathkeeper ✅
- **Multiple Auth Flows**: Sessions (web) + OAuth tokens (mobile/API) ready ✅
- **Database Structure**: 2 databases (Ory + Application) ✅
- **Flexible Client Support**: Sessions for web, OAuth tokens for mobile/APIs ✅

**This is the proper way to implement Ory Stack with Zero Trust principles.**

---

**End of Architecture Documentation**

**Related**: [Mission Log 01: Mission Briefing](./01-mission-briefing.md) | [Mission Log 02: Infrastructure Deployment](./02-infrastructure-deployment.md)
