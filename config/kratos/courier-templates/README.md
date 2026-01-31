# Kratos Courier Email Templates

Custom email templates for Ory Kratos recovery and verification flows (code method). Styled to match the frontend: dark theme (`#1a1b26` / `#16161e`), accent `#7dcfff`, text `#c0caf5`, Nova ID branding.

Templates are Go templates (`.gotmpl`). Kratos loads them from this directory via `courier.template_override_path: /etc/config/kratos/courier-templates` in the Kratos config. The `config/kratos` folder is mounted into the Kratos container at `/etc/config/kratos`, so this directory is available there.

## When does the courier send email?

- **Self-service recovery** — When a user requests password reset from the auth UI (enters their email), Kratos sends the recovery code/link by email. The courier is used.
- **Verification** — After registration or when the user requests a new verification email, Kratos sends the verification code/link by email. The courier is used.
- **Admin recovery code** — When an admin creates a recovery code via the Admin API (e.g. "Send recovery email" in User Management), Kratos **does not** send an email. It only returns the link/code; the admin must copy the link and send it to the user (e.g. by email). This is by design in Ory Kratos.

## Testing the courier (Mailpit)

1. Ensure `.env` has `SMTP_CONNECTION_URI=smtp://mailpit:1025/?disable_starttls=true` and `SMTP_FROM_ADDRESS=noreply@cativo.dev`.
2. Kratos must run with `--watch-courier` (already set in `docker-compose.yml`).
3. Open Mailpit UI at http://localhost:8025 (or http://mailpit.ory.localhost:8025 if you route it).
4. Trigger a flow that sends email: e.g. go to the auth UI, click "Forgot password?", enter a registered user's email, and submit. The recovery email should appear in Mailpit.
5. For verification: register a new user; the verification email should appear in Mailpit.

## Structure

- **recovery_code/valid** — Recovery code sent to a registered email  
  Variables: `To`, `RecoveryCode`, `Identity`, `ExpiresInMinutes`
- **recovery_code/invalid** — Message when recovery is requested for an unknown email  
  Variables: `To`
- **verification_code/valid** — Verification code/link sent after registration  
  Variables: `To`, `VerificationCode`, `VerificationURL`, `Identity`, `ExpiresInMinutes`
- **verification_code/invalid** — Message when verification is requested for an unknown email  
  Variables: `To`

## File layout (per template type)

- `email.body.gotmpl` — HTML body (required)
- `email.body.plaintext.gotmpl` — Plain-text body (required)
- `email.subject.gotmpl` — Subject line (optional)

## Editing

Edit the `.gotmpl` files directly. Use Go template syntax (`{{ .VariableName }}`) and [Sprig](http://masterminds.github.io/sprig/) functions where needed. Restart the Kratos service (or ensure the process reloads config) for changes to take effect.

See [Ory: Custom email templates](https://ory.sh/docs/kratos/emails-sms/custom-email-templates) for variables and i18n options.
