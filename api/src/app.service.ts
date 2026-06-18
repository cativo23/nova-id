import { Injectable, Logger } from '@nestjs/common';
import { HydraService } from './ory/hydra.service';
import { KetoService } from './ory/keto.service';
import { AuditService } from './audit/audit.service';
import { AuthenticatedUser } from './common/types/authenticated-user';
import { AcceptHydraConsentDto } from './dto/accept-hydra-consent.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly hydra: HydraService,
    private readonly keto: KetoService,
    private readonly audit: AuditService,
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
      if (loginRequest.skip) {
        return await this.hydra.acceptLogin(loginChallenge, {
          subject: loginRequest.subject ?? user.userId,
        });
      }

      // Login has NO session field in Ory's contract. Carry claims forward via
      // `context`, which Hydra echoes into the consent request's `context`.
      // Never mint appRole (ADR-0002).
      return await this.hydra.acceptLogin(loginChallenge, {
        subject: user.userId,
        remember: true,
        remember_for: 3600,
        context: {
          email: user.email,
          name: user.full_name,
          role: user.role,
        },
      });
    } catch (error) {
      this.logger.error('Error accepting Hydra login:', error.response?.data || error.message);
      throw error;
    }
  }

  async acceptHydraConsent(user: AuthenticatedUser, body: AcceptHydraConsentDto) {
    try {
      const consentChallenge = body.consent_challenge;
      this.logger.log(`Consent for user ${user.userId} (challenge ${consentChallenge})`);

      const consentRequest = await this.hydra.getConsentRequest(consentChallenge);
      const clientId = consentRequest.client?.client_id;

      // Per-app access gate (fail-closed): only members of App:<clientId> get a token.
      const isMember = clientId ? await this.keto.checkApp(user.userId, clientId) : false;
      if (!isMember) {
        this.logger.warn(`Consent DENIED: ${user.userId} is not a member of app ${clientId}`);
        await this.audit.record({
          actorId: user.userId,
          action: 'consent.deny',
          appId: clientId ?? null,
          targetType: 'app',
        });
        return await this.hydra.rejectConsent(consentChallenge, {
          error: 'access_denied',
          error_description: 'You are not authorized to access this application.',
        });
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

      return await this.hydra.acceptConsent(consentChallenge, {
        grant_scope: grantScope,
        grant_access_token_audience: grantAudience,
        remember: true,
        remember_for: 3600,
        session: {
          id_token: claims,
          access_token: claims,
        },
      });
    } catch (error) {
      this.logger.error('Error accepting Hydra consent:', error.response?.data || error.message);
      throw error;
    }
  }
}
