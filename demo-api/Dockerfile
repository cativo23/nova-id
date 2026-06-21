FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./

# Install all dependencies (including devDeps for build)
RUN npm ci

# Copy source
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:24-alpine
# Patch OS-level CVEs: libexpat CVE-2026-45186, openssl/libcrypto3/libssl3 CVE-2026-45447
RUN apk update && apk upgrade --no-cache libexpat openssl libcrypto3 libssl3

WORKDIR /app

COPY package*.json ./

# Install production dependencies only, then remove npm to eliminate
# npm's bundled CVEs (undici, etc.) — the container only runs `node`, not npm.
RUN npm ci --only=production && npm uninstall -g npm

# Copy built application
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

EXPOSE 8080

CMD ["node", "dist/main"]
