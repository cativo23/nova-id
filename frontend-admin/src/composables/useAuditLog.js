/**
 * Audit log helper: sends admin action events to an optional backend endpoint.
 * Set VITE_AUDIT_API_URL in production to enable. The backend should persist
 * who did what and when for compliance. If the endpoint is not set, calls are no-op.
 */
const auditUrl = import.meta.env.VITE_AUDIT_API_URL

/**
 * Send an audit event. No-op if VITE_AUDIT_API_URL is not set.
 * @param {string} action - e.g. 'user.create', 'user.delete', 'permission.grant'
 * @param {Record<string, unknown>} payload - action details (avoid PII in prod or ensure backend redacts)
 */
export async function auditLog (action, payload = {}) {
  if (!auditUrl) return

  try {
    await fetch(auditUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        ...payload,
        timestamp: new Date().toISOString()
      })
    })
  } catch (_) {
    // Fail silently so admin flow is not blocked; backend may also log
  }
}
