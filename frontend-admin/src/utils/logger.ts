/**
 * App logger: in production only errors are logged; in development all levels.
 * Use this instead of console.* so prod builds don't leak verbose logs.
 */
const isProd = import.meta.env.PROD

export const logger = {
  debug (...args: unknown[]) {
    if (!isProd) console.debug('[admin]', ...args)
  },
  log (...args: unknown[]) {
    if (!isProd) console.log('[admin]', ...args)
  },
  info (...args: unknown[]) {
    if (!isProd) console.info('[admin]', ...args)
  },
  warn (...args: unknown[]) {
    if (!isProd) console.warn('[admin]', ...args)
  },
  error (...args: unknown[]) {
    console.error('[admin]', ...args)
  }
}
