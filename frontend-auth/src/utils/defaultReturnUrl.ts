/**
 * DEFAULT_RETURN_URL — last-resort fallback for self-service flows that complete
 * WITHOUT a return_to / login_challenge (i.e. no originating-app context).
 *
 * Per OAuth 2.0 / OIDC best practice the destination after authentication is
 * provided by the *originating app* (the validated OAuth `redirect_uri` for
 * third-party clients, or a `return_to` for first-party SPAs) — the IdP must NOT
 * hardcode a specific app, least of all a privileged console like the admin
 * dashboard. Sending a context-less user to admin is what made app users land in
 * the admin console after verifying via the email link.
 *
 * This constant is therefore the neutral fallback used ONLY when no context
 * exists. It defaults to the app (the product surface), not admin, and is
 * overridable via VITE_DEFAULT_RETURN_URL. When real context is present the
 * flows use it instead of this value.
 */
export const DEFAULT_RETURN_URL =
  import.meta.env.VITE_DEFAULT_RETURN_URL || 'http://app.ory.localhost'
