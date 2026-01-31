# Day 1: Starting the Journey

**Date**: January 15, 2026  
**Time**: Morning  
**Mood**: Excited but cautious

---

## Morning: The Decision

So, we're building an identity system. Not just any identity system - a **Zero Trust** identity system. Why? Because traditional security models are broken.

### What We're Building

Nova ID - a complete identity and access management system using the Ory Stack. The goal is to have something production-ready that demonstrates how to do identity management right.

### Why Zero Trust?

I've seen too many systems where once you're inside the network, you have access to everything. That's a security nightmare. Zero Trust says "never trust, always verify" - and that's exactly what we need.

The idea is simple: every request goes through a gateway (Oathkeeper), gets authenticated, and then gets routed to the right service with identity headers. No service-to-service trust. Everything is verified.

## Afternoon: Architecture Planning

### Choosing the Stack

We're going with the **Ory Stack**:
- **Kratos** for identity management
- **Hydra** for OAuth2/OIDC
- **Keto** for permissions
- **Oathkeeper** as the gateway

Why Ory? It's open source, well-documented, and used in production by real companies. Plus, it's composable - we can use what we need.

### The Pattern: Identity-Aware Proxy

The architecture is straightforward:
```
User → Oathkeeper (authenticates) → Backend Service (gets identity via headers)
```

Backend services never authenticate directly. They just trust the headers that Oathkeeper injects. This is the Zero Trust way.

### Frontend Choice

Vue 3 + Vite. Why? Because I like Vue's Composition API, and Vite is fast. Simple as that. Plus, the ecosystem is good.

## Evening: Initial Setup

Started setting up the project structure. Created the basic Docker Compose file, but haven't configured anything yet. That's tomorrow's problem.

### What I'm Worried About

1. **Path stripping** - How do we handle routing through Oathkeeper?
2. **CORS** - This is always a pain
3. **Email delivery** - Need to test this somehow
4. **Permissions** - How do we design a good RBAC system?

But hey, that's why we're building this - to figure it out.

## End of Day Thoughts

This is going to be interesting. Zero Trust is the right approach, but it's not trivial. We'll see how it goes.

**Tomorrow**: Start with Docker Compose and get the basic services running.

---

**Next**: [Day 2-3: Setting Up the Infrastructure](./02-day-2-3-infrastructure.md)
