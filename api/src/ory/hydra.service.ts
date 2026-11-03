import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { parseNextPageToken } from '../common/pagination';
import { httpStatus } from '../common/http-status';

export interface ListClientsResult {
  clients: OAuth2Client[];
  /** Opaque Hydra cursor; null when no further pages exist. */
  nextPageToken: string | null;
}

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
  private readonly logger = new Logger(HydraService.name);

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

  // `listOAuth2Clients({})` with no pageSize/pageToken silently truncates at
  // Hydra's default page size, so a growing client list would go missing past
  // the first page. Mirror the users-list pagination (Link header rel="next").
  async listClients(opts: { pageSize?: number; pageToken?: string } = {}): Promise<ListClientsResult> {
    const response = await this.oauth2Api.listOAuth2Clients({
      pageSize: opts.pageSize ?? 100,
      pageToken: opts.pageToken,
    });
    const clients: OAuth2Client[] = response.data;
    const linkHeader: string | undefined = response.headers?.['link'] ?? response.headers?.['Link'];
    const nextPageToken = parseNextPageToken(linkHeader);
    return { clients, nextPageToken };
  }

  // Unlike KratosAdminService, these client CRUD calls previously let raw
  // AxiosErrors propagate — Nest's default filter turns any uncaught error
  // into a bare `500 Internal server error`, so a 404 (unknown client id) or
  // 409 (duplicate client_id) never reached the caller, breaking the
  // @ApiResponse(404) contract on the admin controller. Classify the same
  // way KratosAdminService does.
  async getClient(id: string): Promise<OAuth2Client> {
    try {
      const { data } = await this.oauth2Api.getOAuth2Client({ id });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`OAuth2 client ${id} not found`);
      this.logger.error(`Hydra getClient failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Hydra getClient failed');
    }
  }

  async createClient(body: OAuth2Client): Promise<OAuth2Client> {
    try {
      const { data } = await this.oauth2Api.createOAuth2Client({ oAuth2Client: body });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 409 || status === 400) {
        throw new ConflictException('An OAuth2 client with this id already exists');
      }
      this.logger.error(`Hydra createClient failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Hydra createClient failed');
    }
  }

  // Hydra's setOAuth2Client is a full-replace PUT: any field omitted from the
  // request body is wiped (reset to blank/default), not left untouched. Admin
  // PATCH-style partial updates must therefore read the current client and
  // merge the patch onto it before writing, or every field the caller didn't
  // mention (redirect_uris, grant_types, scope, ...) silently disappears.
  async updateClient(id: string, patch: Partial<OAuth2Client>): Promise<OAuth2Client> {
    // getClient already maps 404 → NotFoundException
    const current = await this.getClient(id);
    const merged = deepMergeClient(current, patch);
    try {
      const { data } = await this.oauth2Api.setOAuth2Client({ id, oAuth2Client: merged });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`OAuth2 client ${id} not found`);
      if (status === 409 || status === 400) {
        throw new ConflictException('OAuth2 client update conflicts with an existing client');
      }
      this.logger.error(`Hydra updateClient failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Hydra updateClient failed');
    }
  }

  async deleteClient(id: string): Promise<void> {
    try {
      await this.oauth2Api.deleteOAuth2Client({ id });
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`OAuth2 client ${id} not found`);
      this.logger.error(`Hydra deleteClient failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Hydra deleteClient failed');
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively merge `patch` onto `base`. Plain-object values are merged
 * key-by-key (so e.g. a partial `metadata` patch doesn't wipe unrelated
 * metadata keys); arrays and primitives in `patch` fully replace the
 * corresponding value in `base` (e.g. supplying `redirect_uris` replaces the
 * whole list, it does not append to it).
 */
function deepMergeClient(base: OAuth2Client, patch: Partial<OAuth2Client>): OAuth2Client {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const baseValue = (base as Record<string, unknown>)[key];
    merged[key] =
      isPlainObject(value) && isPlainObject(baseValue)
        ? deepMergeClient(baseValue as OAuth2Client, value as Partial<OAuth2Client>)
        : value;
  }
  return merged as OAuth2Client;
}
