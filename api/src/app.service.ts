import { Injectable, Logger } from '@nestjs/common';
import { HydraService, AcceptOAuth2LoginRequestWithSession } from './ory/hydra.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly hydra: HydraService) {}

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

  async acceptHydraLogin(user: any, loginChallenge: string) {
    try {
      this.logger.log(`Accepting Hydra login for user ${user.userId}`);
      const loginBody: AcceptOAuth2LoginRequestWithSession = {
        subject: user.userId,
        remember: true,
        remember_for: 3600,
        session: {
          id_token: {
            email: user.email,
            name: user.full_name,
            role: user.role,
            appRole: user.appRole,
          },
        },
      };
      return await this.hydra.acceptLogin(loginChallenge, loginBody);
    } catch (error) {
      this.logger.error(
        'Error accepting Hydra login:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async acceptHydraConsent(user: any, body: any) {
    try {
      this.logger.log(`Accepting Hydra consent for user ${user.userId}`);
      return await this.hydra.acceptConsent(body.consent_challenge, {
        grant_scope: body.grant_scope,
        grant_access_token_audience: body.grant_access_token_audience,
        remember: true,
        remember_for: 3600,
        session: {
          id_token: {
            email: user.email,
            name: user.full_name,
            role: user.role,
            appRole: user.appRole,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        'Error accepting Hydra consent:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
