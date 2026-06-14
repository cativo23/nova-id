import { Inject, Injectable } from '@nestjs/common';
import type {
  OAuth2Api,
  AcceptOAuth2LoginRequest,
  AcceptOAuth2ConsentRequest,
  OAuth2RedirectTo,
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
}
