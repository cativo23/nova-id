/**
 * App logger: in production only warn/error are emitted, and ONLY with string
 * arguments. In development all levels pass through. Use this instead of
 * console.* so prod builds never leak raw error objects (which can carry Kratos
 * flow bodies, CSRF tokens, or user PII).
 *
 * Safe usage pattern:
 *   logger.error('loadLoginFlow failed', errMessage(e))
 *   logger.warn('unexpected status', String(status))
 */
const isProd = import.meta.env.PROD

/**
 * Extract a safe, serialisable message from an unknown thrown value.
 * NEVER accesses .response.data or any nested property that could hold secrets.
 */
export function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Unknown error'
}

export const logger = {
  debug (...args: unknown[]) {
    if (!isProd) console.debug('[auth]', ...args)
  },
  log (...args: unknown[]) {
    if (!isProd) console.log('[auth]', ...args)
  },
  info (...args: unknown[]) {
    if (!isProd) console.info('[auth]', ...args)
  },
  warn (...args: unknown[]) {
    // In prod, only accept strings to avoid leaking objects
    if (isProd) {
      const safeArgs = args.filter(a => typeof a === 'string' || typeof a === 'number')
      if (safeArgs.length) console.warn('[auth]', ...safeArgs)
    } else {
      console.warn('[auth]', ...args)
    }
  },
  error (...args: unknown[]) {
    // In prod, only accept strings to avoid leaking objects
    if (isProd) {
      const safeArgs = args.filter(a => typeof a === 'string' || typeof a === 'number')
      if (safeArgs.length) console.error('[auth]', ...safeArgs)
    } else {
      console.error('[auth]', ...args)
    }
  }
}
