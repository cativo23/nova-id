# Nova ID Admin

Vue 3 SPA for Nova ID administration: identity and access management (users, permissions, Keto/Hydra).

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your values
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (default port 5174) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |

## Environment variables

All variables are optional in development (code has defaults). In **production**, `VITE_OATHKEEPER_URL` is required.

See [.env.example](.env.example) for the full list:

- **VITE_OATHKEEPER_URL** – API gateway base (required in prod)
- **VITE_AUTH_URL**, **VITE_AUTH_UI_URL**, **VITE_ADMIN_URL** – Auth and admin URLs for redirects and recovery links
- **VITE_KRATOS_PUBLIC_URL**, **VITE_KRATOS_BROWSER_URL** – Kratos public / browser base (optional)
- **VITE_API_URL** – General API base (optional)
- **VITE_AUDIT_API_URL** – Optional audit endpoint; if set, admin actions can be sent for audit (POST JSON)

## Tests

When tests are added (e.g. Vitest + Vue Test Utils), run them with:

```bash
npm run test
```

## Production checklist

Before deploying to production:

1. **Environment** – Set all required and desired `VITE_*` in `.env.production` or CI/CD. At minimum: `VITE_OATHKEEPER_URL`.
2. **Error handling** – App uses a global error boundary and `app.config.errorHandler`; uncaught errors show a fallback UI and are logged.
3. **Logging** – Use `src/utils/logger.js` instead of `console.*`; in production only `logger.error` is printed.
4. **Audit** – Sensible admin actions (create/delete user, change permissions, etc.) should be audited. The backend should persist who did what and when. Optionally set `VITE_AUDIT_API_URL` and call `auditLog(action, payload)` from `src/composables/useAuditLog.js` after each sensitive action.
5. **Security headers** – Configure CSP, X-Frame-Options, etc. on the server that serves this SPA (e.g. Nginx, Caddy).
6. **Build** – Run `npm run build` with production env; serve the `dist/` output over HTTPS.
