/**
 * App logger: in production only errors are logged; in development all levels.
 * Use this instead of console.* so prod builds don't leak verbose logs.
 */
const isProd = import.meta.env.PROD

export const logger = {
  debug (...args) {
    if (!isProd) console.debug('[admin]', ...args)
  },
  log (...args) {
    if (!isProd) console.log('[admin]', ...args)
  },
  info (...args) {
    if (!isProd) console.info('[admin]', ...args)
  },
  warn (...args) {
    if (!isProd) console.warn('[admin]', ...args)
  },
  error (...args) {
    console.error('[admin]', ...args)
  }
}
