#!/bin/bash
# Generate .env file with high-entropy secrets for Nova ID

generate_secret() {
    python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32)))"
}

cat > .env << EOF
# Nova ID Environment Configuration
# Generated on $(date)
# Production-ready high-entropy secrets (32 characters each)

# Development Mode
DEV=true

# Log Level (debug for dev, info for prod)
LOG_LEVEL=debug

# Cookie Settings
COOKIES_SAMESITE=Lax
COOKIES_SECURE=false

# Cookie Domain
COOKIE_DOMAIN=cativo.dev

# Database Configuration
POSTGRES_PASSWORD=$(generate_secret)
ORY_PASSWORD=$(generate_secret)
KRATOS_DB_PASSWORD=$(generate_secret)
HYDRA_DB_PASSWORD=$(generate_secret)
KETO_DB_PASSWORD=$(generate_secret)

# Kratos Configuration
KRATOS_PUBLIC_URL=http://localhost:4433
KRATOS_ADMIN_URL=http://localhost:4434
KRATOS_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://id.cativo.dev,https://cativo.dev

# Kratos Secrets
KRATOS_SECRETS_COOKIE=$(generate_secret)
KRATOS_SECRETS_CIPHER=$(generate_secret)

# Hydra Configuration
HYDRA_SELF_ISSUER=https://oidc.cativo.dev
HYDRA_CONSENT_URL=http://localhost:4455/consent
HYDRA_LOGIN_URL=http://localhost:4455/login
HYDRA_LOGOUT_URL=http://localhost:4455/logout
HYDRA_ERROR_URL=http://localhost:4455/error
HYDRA_POST_LOGOUT_REDIRECT_URL=http://localhost:4455
HYDRA_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://oidc.cativo.dev

# Hydra Secrets
HYDRA_SECRETS_SYSTEM=$(generate_secret)

# Keto Configuration
KETO_DB_PASSWORD=\${KETO_DB_PASSWORD}

# Oathkeeper Configuration
OATHKEEPER_CHECK_SESSION_URL=http://kratos:4433/sessions/whoami
OATHKEEPER_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://gateway.cativo.dev

# Frontend Configuration
FRONTEND_URL=http://localhost:5173

# SMTP Configuration (Mailpit for local development)
SMTP_CONNECTION_URI=smtp://mailpit:1025
SMTP_FROM_ADDRESS=noreply@cativo.dev
EOF

echo ".env file generated successfully!"
echo "Remember to update SMTP_CONNECTION_URI with your actual SMTP credentials."
