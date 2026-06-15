/**
 * Validates required environment variables.
 * In production, missing required vars throw so the app fails fast with a clear message.
 */
const isProd = import.meta.env.PROD

const requiredInProd = [
  'VITE_OATHKEEPER_URL'
] as const

export function validateEnv (): void {
  if (!isProd) return

  const missing = requiredInProd.filter(key => {
    const value = import.meta.env[key]
    return value === undefined || value === ''
  })

  if (missing.length > 0) {
    throw new Error(
      `[admin] Missing required env in production: ${missing.join(', ')}. ` +
      'Set them in .env.production or your CI/CD. See .env.example.'
    )
  }
}

export function getEnv (key: string, fallback = ''): string {
  const v = import.meta.env[key]
  return v !== undefined && v !== '' ? v : fallback
}
