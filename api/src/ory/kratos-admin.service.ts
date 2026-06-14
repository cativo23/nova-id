import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { IdentityApi, Identity } from '@ory/client';
import { KRATOS_IDENTITY_API } from './ory.constants';

export type PlatformRole = 'platform_admin' | 'platform_user';

export interface CreateIdentityInput {
  email: string;
  fullName: string;
  password: string;
  role?: PlatformRole;
}

export interface UpdateIdentityInput {
  email?: string;
  fullName?: string;
  role?: PlatformRole;
}

export interface ListIdentitiesResult {
  identities: Identity[];
  /** Opaque Kratos cursor; null when no further pages exist. */
  nextPageToken: string | null;
}

/** Parse a Kratos `Link` header and return the `page_token` from the rel="next" entry, or null. */
function parseNextPageToken(linkHeader: string | undefined | null): string | null {
  if (!linkHeader) return null;
  // Header may contain multiple comma-separated entries, e.g.:
  //   <URL1>; rel="next", <URL2>; rel="prev"
  const entries = linkHeader.split(',');
  for (const entry of entries) {
    if (!entry.includes('rel="next"')) continue;
    const urlMatch = entry.match(/<([^>]+)>/);
    if (!urlMatch) continue;
    try {
      const url = new URL(urlMatch[1]);
      const token = url.searchParams.get('page_token');
      if (token) return token;
    } catch {
      // malformed URL — skip
    }
  }
  return null;
}

/** Translate an Axios-style error status to its HTTP status code, or undefined. */
function httpStatus(err: unknown): number | undefined {
  return (err as any)?.response?.status as number | undefined;
}

@Injectable()
export class KratosAdminService {
  private readonly logger = new Logger(KratosAdminService.name);
  // Matches kratos.local.yml identity.default_schema_id
  private readonly schemaId = 'default';

  constructor(@Inject(KRATOS_IDENTITY_API) private readonly identityApi: IdentityApi) {}

  async listIdentities(opts: { pageSize?: number; pageToken?: string } = {}): Promise<ListIdentitiesResult> {
    // Capture the full Axios response to read the Link header for next-page token.
    const response = await this.identityApi.listIdentities({
      pageSize: opts.pageSize ?? 100,
      pageToken: opts.pageToken,
    });
    const identities: Identity[] = response.data;
    const linkHeader: string | undefined = response.headers?.['link'] ?? response.headers?.['Link'];
    const nextPageToken = parseNextPageToken(linkHeader);
    return { identities, nextPageToken };
  }

  async getIdentity(id: string): Promise<Identity> {
    try {
      const { data } = await this.identityApi.getIdentity({ id });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos getIdentity failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos getIdentity failed');
    }
  }

  async createIdentity(input: CreateIdentityInput): Promise<Identity> {
    try {
      const { data } = await this.identityApi.createIdentity({
        createIdentityBody: {
          schema_id: this.schemaId,
          traits: { email: input.email, full_name: input.fullName },
          credentials: { password: { config: { password: input.password } } },
          // role sets the JWT `role` claim (via Oathkeeper id_token mutator reading
          // metadata_public.role) which gates RoleGuard / log access.
          // It does NOT grant Platform admin (manage_users/administer); that lives
          // in Keto and is wired in A1-plan-2.
          metadata_public: { role: input.role ?? 'platform_user' },
        },
      });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 409 || status === 400) {
        throw new ConflictException('Email already registered');
      }
      this.logger.error(`Kratos createIdentity failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos createIdentity failed');
    }
  }

  async updateIdentity(id: string, input: UpdateIdentityInput): Promise<Identity> {
    // getIdentity already maps 404 → NotFoundException
    const current = await this.getIdentity(id);
    const traits = current.traits as { email: string; full_name: string };
    const metadata = (current.metadata_public as { role?: PlatformRole } | null) ?? {};
    try {
      const { data } = await this.identityApi.updateIdentity({
        id,
        updateIdentityBody: {
          schema_id: current.schema_id,
          traits: {
            email: input.email ?? traits.email,
            full_name: input.fullName ?? traits.full_name,
          },
          // role sets the JWT `role` claim (via Oathkeeper id_token mutator reading
          // metadata_public.role) which gates RoleGuard / log access.
          // It does NOT grant Platform admin (manage_users/administer); that lives
          // in Keto and is wired in A1-plan-2.
          metadata_public: { role: input.role ?? metadata.role ?? 'platform_user' },
          state: current.state ?? 'active',
        },
      });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos updateIdentity failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos updateIdentity failed');
    }
  }

  async setIdentityState(id: string, state: 'active' | 'inactive'): Promise<Identity> {
    // getIdentity already maps 404 → NotFoundException
    const current = await this.getIdentity(id);
    try {
      const { data } = await this.identityApi.updateIdentity({
        id,
        updateIdentityBody: {
          schema_id: current.schema_id,
          traits: current.traits,
          metadata_public: current.metadata_public ?? undefined,
          state,
        },
      });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos setIdentityState failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos setIdentityState failed');
    }
  }

  async deleteIdentity(id: string): Promise<void> {
    try {
      await this.identityApi.deleteIdentity({ id });
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos deleteIdentity failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos deleteIdentity failed');
    }
  }

  async createRecoveryLink(id: string): Promise<string> {
    try {
      const { data } = await this.identityApi.createRecoveryLinkForIdentity({
        createRecoveryLinkForIdentityBody: { identity_id: id },
      });
      return data.recovery_link;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos createRecoveryLink failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos createRecoveryLink failed');
    }
  }
}
