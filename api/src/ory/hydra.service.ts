import { Inject, Injectable } from '@nestjs/common';
import type {
  OAuth2Api,
  AcceptOAuth2LoginRequest,
  AcceptOAuth2ConsentRequest,
  OAuth2RedirectTo,
  OAuth2LoginRequest,
  OAuth2ConsentRequest,
  RejectOAuth2Request,
  OAuth2Client,
} from '@ory/hydra-client';
import { HYDRA_OAUTH2_API } from './ory.constants';

/**
 * Hydra's acceptOAuth2LoginRequest accepts a `session.id_token` payload on the wire,
 * but the generated SDK type omits it. This extension preserves the field for
 * behavior parity with the original axios implementation.
 */
export type AcceptOAuth2LoginRequestWithSession = AcceptOAuth2LoginRequest & {
  session?: { id_token?: Record<string, unknown> };
};

@Injectable()
export class HydraService {
  constructor(@Inject(HYDRA_OAUTH2_API) private readonly oauth2Api: OAuth2Api) {}

  async acceptLogin(
    loginChallenge: string,
    body: AcceptOAuth2LoginRequestWithSession,
  ): Promise<OAuth2RedirectTo> {
    const { data } = await this.oauth2Api.acceptOAuth2LoginRequest({
      loginChallenge,
      acceptOAuth2LoginRequest: body as AcceptOAuth2LoginRequest,
    });
    return data;
  }

  // Unlike the login request, AcceptOAuth2ConsentRequest DOES declare `session`
  // (AcceptOAuth2ConsentRequestSession with `id_token: any`), so the consent body —
  // including session.id_token — is type-compatible and needs no cast.
  async acceptConsent(consentChallenge: string, body: AcceptOAuth2ConsentRequest): Promise<OAuth2RedirectTo> {
    const { data } = await this.oauth2Api.acceptOAuth2ConsentRequest({ consentChallenge, acceptOAuth2ConsentRequest: body });
    return data;
  }

  async getLoginRequest(loginChallenge: string): Promise<OAuth2LoginRequest> {
    const { data } = await this.oauth2Api.getOAuth2LoginRequest({ loginChallenge });
    return data;
  }

  async getConsentRequest(consentChallenge: string): Promise<OAuth2ConsentRequest> {
    const { data } = await this.oauth2Api.getOAuth2ConsentRequest({ consentChallenge });
    return data;
  }

  async rejectConsent(
    consentChallenge: string,
    body: RejectOAuth2Request,
  ): Promise<OAuth2RedirectTo> {
    const { data } = await this.oauth2Api.rejectOAuth2ConsentRequest({
      consentChallenge,
      rejectOAuth2Request: body,
    });
    return data;
  }

  async listClients(): Promise<OAuth2Client[]> {
    const { data } = await this.oauth2Api.listOAuth2Clients({});
    return data;
  }

  async getClient(id: string): Promise<OAuth2Client> {
    const { data } = await this.oauth2Api.getOAuth2Client({ id });
    return data;
  }

  async createClient(body: OAuth2Client): Promise<OAuth2Client> {
    const { data } = await this.oauth2Api.createOAuth2Client({ oAuth2Client: body });
    return data;
  }

  async updateClient(id: string, body: OAuth2Client): Promise<OAuth2Client> {
    const { data } = await this.oauth2Api.setOAuth2Client({ id, oAuth2Client: body });
    return data;
  }

  async deleteClient(id: string): Promise<void> {
    await this.oauth2Api.deleteOAuth2Client({ id });
  }
}
