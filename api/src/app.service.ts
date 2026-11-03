import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { toHttpExceptionFromOry } from './common/ory-error';
import { HydraService } from './ory/hydra.service';
import { KetoService } from './ory/keto.service';
import { AuditService } from './audit/audit.service';
import { LoginBindingService } from './login-binding/login-binding.service';
import { AuthenticatedUser } from './common/types/authenticated-user';
import { AcceptHydraConsentDto } from './dto/accept-hydra-consent.dto';
import { HydraConsentInfoResponseDto } from './dto/hydra-consent-info-response.dto';
import { RejectHydraConsentDto } from './dto/reject-hydra-consent.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly hydra: HydraService,
    private readonly keto: KetoService,
    private readonly audit: AuditService,
    private readonly loginBinding: LoginBindingService,
  ) {}

  getPublicData() {
    return {
      message: 'This is public data - no authentication required',
      timestamp: new Date().toISOString(),
      data: {
        version: '1.0.0',
        status: 'public',
        oryIntegration: 'API integrates with Ory Stack (Kratos, Keto, Hydra)',
      },
    };
  }

  async acceptHydraLogin(user: AuthenticatedUser, loginChallenge: string) {
    try {
      this.logger.log(`Accepting Hydra login for user ${user.userId}`);
      const loginRequest = await this.hydra.getLoginRequest(loginChallenge);

      // Honor skip: Hydra already has a valid session for this subject.
      // Never trust the remembered subject over the JWT-authenticated user —
      // on a shared browser this would let a second identity silently ride
      // the first identity's remembered Hydra session (session fixation).
      if (loginRequest.skip) {
        if (loginRequest.subject && loginRequest.subject !== user.userId) {
          this.logger.warn(
            `Login skip IDOR blocked: challenge subject ${loginRequest.subject} !== ${user.userId}`,
          );
          throw new ForbiddenException('Login challenge subject does not belong to current user');
        }
        const result = await this.hydra.acceptLogin(loginChallenge, {
          subject: loginRequest.subject ?? user.userId,
        });
        await this.audit.record({
          actorId: user.userId,
          action: 'login.accept',
          appId: loginRequest.client?.client_id ?? null,
          targetType: 'app',
          metadata: { skip: true },
        });
        return result;
      }

      // VULN-0002 ownership gate (fail-closed). The non-skip path used to accept
      // ANY login_challenge for the JWT-authenticated caller, letting a second
      // authenticated user consume a victim's in-flight challenge (login DoS).
      // Require a server-recorded binding claimed by THIS identity (registered by
      // the SPA the moment the authenticated browser first saw the challenge —
      // see LoginBindingService). No binding, an expired one, or one owned by
      // someone else → reject before touching Hydra, so the challenge is never
      // consumed. The skip path above is intentionally exempt: it has no earlier
      // authenticated touchpoint and is already guarded by its subject-match check.
      const owned = await this.loginBinding.isBoundTo(user.userId, loginChallenge);
      if (!owned) {
        this.logger.warn(
          `Login binding check failed: challenge not bound to ${user.userId}`,
        );
        throw new ForbiddenException('Login challenge is not bound to the current user');
      }

      // Login has NO session field in Ory's contract. Carry claims forward via
      // `context`, which Hydra echoes into the consent request's `context`.
      // Never mint appRole (ADR-0002).
      const result = await this.hydra.acceptLogin(loginChallenge, {
        subject: user.userId,
        remember: true,
        remember_for: 3600,
        context: {
          email: user.email,
          name: user.full_name,
          role: user.role,
        },
      });
      await this.audit.record({
        actorId: user.userId,
        action: 'login.accept',
        appId: loginRequest.client?.client_id ?? null,
        targetType: 'app',
        metadata: { skip: false },
      });
      return result;
    } catch (error) {
      this.logger.error('Error accepting Hydra login:', error.response?.data || error.message);
      throw toHttpExceptionFromOry(error);
    }
  }

  /**
   * VULN-0002: claim a login_challenge for the authenticated caller before the
   * accept step. The SPA calls this as soon as it receives the challenge (right
   * after Kratos auth). Throws ForbiddenException if the challenge was already
   * claimed by a different identity. Idempotent for the same identity.
   */
  async registerHydraLoginBinding(user: AuthenticatedUser, loginChallenge: string): Promise<void> {
    this.logger.log(`Registering login binding for user ${user.userId}`);
    await this.loginBinding.register(user.userId, loginChallenge);
  }

  async acceptHydraConsent(user: AuthenticatedUser, body: AcceptHydraConsentDto) {
    try {
      const consentChallenge = body.consent_challenge;
      this.logger.log(`Consent for user ${user.userId} (challenge ${consentChallenge})`);

      const consentRequest = await this.hydra.getConsentRequest(consentChallenge);

      // Ownership check (fail-closed): the consent challenge must belong to the
      // authenticated user. A null/undefined subject means the challenge is not
      // bound to any user — no one may act on it, so reject rather than skip.
      if (!consentRequest.subject || consentRequest.subject !== user.userId) {
        this.logger.warn(
          `Consent IDOR blocked: challenge subject ${consentRequest.subject ?? '(unbound)'} !== ${user.userId}`,
        );
        throw new ForbiddenException('Consent challenge does not belong to current user');
      }

      const clientId = consentRequest.client?.client_id;

      // Per-app access gate (fail-closed): only members of App:<clientId> get a token.
      const isMember = clientId ? await this.keto.checkApp(user.userId, clientId) : false;
      if (!isMember) {
        this.logger.warn(`Consent DENIED: ${user.userId} is not a member of app ${clientId}`);
        // Record AFTER rejectConsent resolves (mirrors rejectHydraConsent):
        // if the reject call itself throws, the append-only audit log must
        // not contain a deny that never actually happened.
        const result = await this.hydra.rejectConsent(consentChallenge, {
          error: 'access_denied',
          error_description: 'You are not authorized to access this application.',
        });
        await this.audit.record({
          actorId: user.userId,
          action: 'consent.deny',
          appId: clientId ?? null,
          targetType: 'app',
        });
        return result;
      }

      // Trust the audience from the consent request, NOT the browser body.
      const grantAudience = consentRequest.requested_access_token_audience ?? [];

      // Intersect browser-supplied scopes with the server-side requested_scope so
      // a tampered body cannot smuggle scopes the OAuth client never asked for.
      // Then unconditionally add app:member (membership is always granted to members).
      const requestedScope: string[] = consentRequest.requested_scope ?? [];
      const browserScope: string[] = body.grant_scope ?? [];
      const grantScope = Array.from(new Set([
        ...browserScope.filter((s: string) => requestedScope.includes(s)),
        'app:member',
      ]));

      // Mint platform role + membership on BOTH token surfaces. id_token serves
      // OIDC clients; access_token surfaces via introspection `ext` so the
      // /api-test path sees `role` (fixes the logs 403). Never mint appRole.
      const claims = { email: user.email, name: user.full_name, role: user.role, app_access: true };

      const result = await this.hydra.acceptConsent(consentChallenge, {
        grant_scope: grantScope,
        grant_access_token_audience: grantAudience,
        remember: true,
        remember_for: 3600,
        session: {
          id_token: claims,
          access_token: claims,
        },
      });

      // Successful grants were previously never audited — only denials were,
      // leaving the audit trail one-sided (see #91). Record after the grant
      // has actually gone through, mirroring rejectHydraConsent's
      // record-after-the-fact ordering.
      await this.audit.record({
        actorId: user.userId,
        action: 'consent.grant',
        appId: clientId ?? null,
        targetType: 'app',
        metadata: { scopes: grantScope },
      });

      return result;
    } catch (error) {
      this.logger.error('Error accepting Hydra consent:', error.response?.data || error.message);
      throw toHttpExceptionFromOry(error);
    }
  }

  async getHydraConsentInfo(user: AuthenticatedUser, consentChallenge: string): Promise<HydraConsentInfoResponseDto> {
    try {
      this.logger.log(`Fetching consent info for user ${user.userId} (challenge ${consentChallenge})`);
      const consentRequest = await this.hydra.getConsentRequest(consentChallenge);

      // Ownership check (fail-closed): the consent challenge must belong to the
      // authenticated user. A null/undefined subject means the challenge is not
      // bound to any user — no one may act on it, so reject rather than skip.
      if (!consentRequest.subject || consentRequest.subject !== user.userId) {
        this.logger.warn(
          `Consent IDOR blocked: challenge subject ${consentRequest.subject ?? '(unbound)'} !== ${user.userId}`,
        );
        throw new ForbiddenException('Consent challenge does not belong to current user');
      }

      return {
        skip: consentRequest.skip,
        requested_scope: consentRequest.requested_scope ?? [],
        client: consentRequest.client
          ? { client_id: consentRequest.client.client_id, client_name: consentRequest.client.client_name }
          : undefined,
        subject: consentRequest.subject,
      };
    } catch (error) {
      this.logger.error('Error fetching consent request:', error.response?.data || error.message);
      throw toHttpExceptionFromOry(error);
    }
  }

  async rejectHydraConsent(user: AuthenticatedUser, body: RejectHydraConsentDto): Promise<{ redirect_to: string }> {
    try {
      this.logger.log(`Rejecting consent for user ${user.userId} (challenge ${body.consent_challenge})`);

      // Fetch consent request first: enables ownership check and client_id capture.
      const consentRequest = await this.hydra.getConsentRequest(body.consent_challenge);

      // Ownership check (fail-closed): the consent challenge must belong to the
      // authenticated user. A null/undefined subject means the challenge is not
      // bound to any user — no one may act on it, so reject rather than skip.
      if (!consentRequest.subject || consentRequest.subject !== user.userId) {
        this.logger.warn(
          `Consent IDOR blocked: challenge subject ${consentRequest.subject ?? '(unbound)'} !== ${user.userId}`,
        );
        throw new ForbiddenException('Consent challenge does not belong to current user');
      }

      const clientId = consentRequest.client?.client_id ?? null;

      const result = await this.hydra.rejectConsent(body.consent_challenge, {
        error: 'access_denied',
        error_description: body.error_description ?? 'The user denied the request',
      });
      await this.audit.record({
        actorId: user.userId,
        action: 'consent.user_reject',
        appId: clientId,
        targetType: 'app',
      });
      return { redirect_to: result.redirect_to };
    } catch (error) {
      this.logger.error('Error rejecting consent:', error.response?.data || error.message);
      throw toHttpExceptionFromOry(error);
    }
  }
}
