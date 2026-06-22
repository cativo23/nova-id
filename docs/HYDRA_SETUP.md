# Hydra OAuth2/OIDC Production Setup

## Configuration Summary

### 1. Hydra URLs (Environment Variables)
Hydra uses environment variables for URLs, allowing easy switching between dev and production:

```yaml
# In config/hydra/hydra.${ENVIRONMENT}.yml
urls:
  self:
    issuer: ${HYDRA_SELF_ISSUER:-https://id.cativo.dev}
  consent: ${HYDRA_CONSENT_URL:-https://auth.cativo.dev/consent}
  login: ${HYDRA_LOGIN_URL:-https://auth.cativo.dev/login}
  logout: ${HYDRA_LOGOUT_URL:-https://auth.cativo.dev/logout}
  error: ${HYDRA_ERROR_URL:-https://auth.cativo.dev/error}
  post_logout_redirect: ${HYDRA_POST_LOGOUT_REDIRECT_URL:-https://auth.cativo.dev}
```

### 2. Oathkeeper Routes

**Hydra Public Endpoints** (`/oauth2/*`, `/.well-known/*`):
- Routes through Oathkeeper at `https://id.cativo.dev` (production)
- Or directly at `http://localhost:4444` (development)

**Login/Consent Endpoints**:
- `/login` → Routes to frontend login page
- `/consent` → Routes to frontend consent page
- Both go through Oathkeeper gateway

### 3. Frontend Configuration

The frontend automatically detects the environment:

```javascript
// Development: http://localhost:4444
// Production: https://id.cativo.dev
const hydraPublicUrl = import.meta.env.VITE_HYDRA_PUBLIC_URL || 
  (import.meta.env.PROD ? 'https://id.cativo.dev' : 'http://localhost:4444')
```

### 4. Environment Variables for Production

Update your `.env` file for production:

```bash
# Hydra URLs (use HTTPS and correct domain)
HYDRA_SELF_ISSUER=https://id.cativo.dev
HYDRA_CONSENT_URL=https://auth.cativo.dev/consent
HYDRA_LOGIN_URL=https://auth.cativo.dev/login
HYDRA_LOGOUT_URL=https://auth.cativo.dev/logout
HYDRA_ERROR_URL=https://auth.cativo.dev/error
HYDRA_POST_LOGOUT_REDIRECT_URL=https://auth.cativo.dev

# Frontend URL
FRONTEND_URL=https://cativo.dev

# Hydra Admin (internal)
HYDRA_ADMIN_URL=http://hydra:4445
```

### 5. OAuth Client Setup

Run the setup script with production URL:

```bash
FRONTEND_URL=https://cativo.dev ./setup-hydra-test-client.sh
```

This will create/update the OAuth client with the correct redirect URI.

## Troubleshooting

### 502 Bad Gateway

**Possible causes:**
1. **Hydra container not running**: Check with `docker-compose ps hydra`
2. **Network issues**: Ensure Oathkeeper and Hydra are on the same Docker network
3. **Wrong URL**: Verify you're using the correct Hydra URL:
   - Development: `http://localhost:4444`
   - Production: `https://id.cativo.dev` (through Oathkeeper)

**Check logs:**
```bash
docker-compose logs hydra --tail 50
docker-compose logs oathkeeper --tail 50
```

### OAuth Flow Not Working

1. **Verify OAuth client exists**:
   ```bash
   curl http://localhost:4445/clients/vue-test-client
   ```

2. **Check redirect URI matches**: The redirect URI in the client must exactly match what you're using in the frontend

3. **Verify Hydra URLs**: Check that Hydra's login/consent URLs are accessible:
   ```bash
   curl http://localhost:4455/login
   curl http://localhost:4455/consent
   ```

### Production Deployment Checklist

- [ ] Update `.env` with production URLs (HTTPS)
- [ ] Run `./setup-hydra-test-client.sh` with `FRONTEND_URL=https://cativo.dev`
- [ ] Verify DNS: `id.cativo.dev` points to your server
- [ ] Verify Traefik routing for `id.cativo.dev`
- [ ] Test OAuth flow end-to-end
- [ ] Check CORS settings allow your frontend domain
- [ ] Verify cookies work across domains (if using subdomains)

## Testing

1. **Development**:
   ```bash
   # Start services
   docker-compose up -d
   
   # Setup OAuth client
   ./setup-hydra-test-client.sh
   
   # Test at http://localhost:5173/hydra-test
   ```

2. **Production**:
   ```bash
   # Update .env with production URLs
   # Deploy with production override
   docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
   
   # Setup OAuth client
   FRONTEND_URL=https://cativo.dev ./setup-hydra-test-client.sh
   
   # Test at https://cativo.dev/hydra-test
   ```
