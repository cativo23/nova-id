/**
 * App logger: in production only warn/error are emitted, and ONLY with string
 * arguments. In development all levels pass through. Use this instead of
 * console.* so prod builds never leak raw error objects.
 *
 * Safe usage pattern:
 *   logger.error('loadLogs failed', errMessage(e))
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
    if (!isProd) console.debug('[app]', ...args)
  },
  log (...args: unknown[]) {
    if (!isProd) console.log('[app]', ...args)
  },
  info (...args: unknown[]) {
    if (!isProd) console.info('[app]', ...args)
  },
  warn (...args: unknown[]) {
    // In prod, only accept strings to avoid leaking objects
    if (isProd) {
      const safeArgs = args.filter(a => typeof a === 'string' || typeof a === 'number')
      if (safeArgs.length) console.warn('[app]', ...safeArgs)
    } else {
      console.warn('[app]', ...args)
    }
  },
  error (...args: unknown[]) {
    // In prod, only accept strings to avoid leaking objects
    if (isProd) {
      const safeArgs = args.filter(a => typeof a === 'string' || typeof a === 'number')
      if (safeArgs.length) console.error('[app]', ...safeArgs)
    } else {
      console.error('[app]', ...args)
    }
  }
}
